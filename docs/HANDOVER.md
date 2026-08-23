# Buyer Handover Checklist

This app is built to be sold as a one-time product (see CLAUDE.md's
"Reseller Business Model" context) — the buyer runs it on their own
infrastructure accounts, not the seller's. This doc lists everything a
buyer needs to receive or set up themselves to take real ownership, and
what state the product is in as of the handover. For day-to-day operation
once handed over, see `docs/OPERATIONS.md`.

## External accounts this app depends on

| Service | Used for | Buyer needs to |
|---|---|---|
| **Neon** (`creatoros-ai` project) | Postgres database | Either receive transferred ownership of the existing project, or provision a fresh Neon project and run the full migration history (`drizzle/*.sql`, in order) against it |
| **Cloudflare** | Hosting (Workers), KV (rate limiting), Hyperdrive (unused currently — see Known Limitations) | New Cloudflare account + `wrangler login`, or transferred access to the existing one. Needs two API tokens: one scoped to Workers AI (image generation), one scoped to Workers deploy (see CLAUDE.md's "Cloudflare deploy-scoped API token" section for exact scopes) |
| **Cloudinary** | Image/file storage + CDN | New account (free tier works) or transferred access; update `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` |
| **Groq** | Primary text AI (chat, script generation) | New free-tier account (no credit card required as of this writing); update `GROQ_API_KEY` |
| **OpenRouter** | Fallback text AI | New account; update `OPENROUTER_API_KEY` (free-tier `:free` models used, see CLAUDE.md's AI Architecture section for the exact model routing) |
| **Google Cloud Console** | Google OAuth login | New OAuth client, or transferred access; update `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and add the buyer's deployed domain to the authorized redirect URIs |
| **Resend** | Transactional email (password reset, feedback) | New account; update `RESEND_API_KEY`. **Domain verification still outstanding** — see Known Limitations |
| **Polar.sh** | Payment processing / subscriptions | New Polar organization (their own KYC/business review takes up to ~14 days — start this early). Update `POLAR_ACCESS_TOKEN`, `POLAR_SERVER`, `POLAR_PRO_PRODUCT_ID`, `POLAR_SCALE_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`, and re-register the webhook endpoint against the buyer's deployed URL |

## Secrets checklist

Every one of these needs a real value before the app will run correctly.
Set them as Cloudflare Worker secrets (`wrangler secret put <NAME>`), not
plain env vars, for anything deployed:

- `BETTER_AUTH_SECRET` — generate a new random value, do **not** reuse the
  seller's (this signs session tokens)
- `BETTER_AUTH_URL` — the buyer's real deployed URL
- `DATABASE_URL` — buyer's Neon connection string (pooled endpoint)
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (Workers AI scope)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`
- `POLAR_ACCESS_TOKEN`, `POLAR_SERVER`, `POLAR_PRO_PRODUCT_ID`,
  `POLAR_SCALE_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `SUPPORT_EMAIL`
- `DAILY_IMAGE_CAP` (optional, defaults to 1500 — raise if the buyer's
  Cloudflare Workers AI plan supports more)
- `SCALE_DAILY_CREDIT_CAP` (optional, defaults to 500)

**Never reuse the seller's values for anything auth/payment-related**
(`BETTER_AUTH_SECRET`, Polar keys) — generate fresh ones so the seller
retains no access to the buyer's live system after handover.

## Deploy steps

See `docs/OPERATIONS.md`'s "Deployment" section — same steps apply
regardless of whose accounts are behind the secrets above. In short:
`tsc` → `build` → `wrangler deploy` (needs the deploy-scoped Cloudflare
token) → smoke test → watch `wrangler tail` briefly.

**If deploying on Vercel instead** (see CLAUDE.md's "Vercel Migration"
section — branch `platform/vercel`, built and live-verified, not yet
merged): `tsc` → `build` produces a Vercel Build Output API v3 bundle
directly; deploy via `vercel deploy` (preview) or `vercel deploy --prod`,
with secrets pushed via `vercel env add` instead of `wrangler secret put`.
`BETTER_AUTH_URL` can be left unset on Vercel (better-auth derives it
per-request); it must be set explicitly on Cloudflare.

## Database

Either transfer the existing Neon project, or stand up a fresh one and
run every file in `drizzle/` in order (they're all additive-only, safe to
replay in sequence) against it. See `docs/OPERATIONS.md`'s "Database
migrations" section for the standing review process if the buyer needs to
make further schema changes later.

## Known limitations at time of handover

Being upfront about what's genuinely unfinished, not glossed over:

- **~8s latency on some page loads and auth requests, IF still deployed
  on Cloudflare Workers.** A critical reliability bug (intermittent hard
  failures) was found and fixed on Cloudflare — the app no longer errors
  out, but a majority of requests there still take ~8 seconds longer than
  ideal due to a `cloudflare:sockets`-specific Postgres transport quirk.
  See CLAUDE.md's "Final Handover Push — Auth/SSR Reliability Fix"
  section for full technical detail. **This is confirmed fixed on the
  `platform/vercel` branch** (plain Node.js runtime doesn't have this
  quirk — measured 0.82–1.10s on the same query that used to stall on
  Cloudflare) — see CLAUDE.md's "Vercel Migration" section. That branch
  is fully built and live-verified but, as of this handover, not yet
  merged or cut over to real traffic — check with the seller whether the
  buyer is receiving the Cloudflare or the Vercel deployment before
  treating this as an open issue.
- **2FA is off** — not built. Revisit before handling real user data at scale.
- **Email verification is now ON** (`emailAndPassword.requireEmailVerification: true`,
  see CLAUDE.md's "Email verification enforcement" section) — closes the
  account-linking security gap that used to be an accepted trade-off. One
  real consequence: since Resend has no verified sending domain yet (see
  below), verification emails can currently only be delivered to the
  Resend account's own address — every other new signup will show "check
  your email" but the email itself won't arrive until domain verification
  is done. Signup itself still succeeds either way (the email send is
  fire-and-forget); only actually signing in with email/password is
  blocked until verified. Google OAuth is unaffected. **73 of 78 existing
  accounts at time of writing have `emailVerified: false`** (mostly
  throwaway QA test accounts from this project's testing history) and are
  now locked out of email/password sign-in until either verified for real
  or grandfathered in via a one-time reviewed `UPDATE "user" SET
  "emailVerified" = true WHERE "emailVerified" = false` — not run
  automatically, needs an explicit decision.
- **Resend has no verified sending domain** — password-reset and feedback
  emails will 403 until the buyer verifies a domain at
  `resend.com/domains` and updates `FROM_ADDRESS` in
  `src/lib/server/email.ts`.
- **Polar is in sandbox mode** — real payments require the buyer's own
  Polar business/KYC review (up to ~14 days) and swapping `POLAR_SERVER`
  + keys to production, as a deliberate separate step.
- **No 2FA, no async job queue, no centralized logging/monitoring/
  alerting, no analytics** — all deliberately deferred, each needs a
  third-party account decision that's the buyer's to make. See the
  production-readiness audit artifact referenced in CLAUDE.md for the
  full remaining list.
- **A backup-restore has never actually been drilled** — the steps are
  documented in `docs/OPERATIONS.md`, but only ever tested in theory, not
  executed against real data.

## What IS solid at handover

Every core product surface — landing page, auth (email/password + Google
OAuth), dashboard, all 4 AI studios (Chat, Script, Image, Thumbnail),
Library, Files, Content Planner, Settings, AI Usage, Billing — is fully
functional end-to-end against a real production Cloudflare Workers
deploy, verified with real generations, real payments (sandbox), and a
100+-request live reliability test showing zero failures on every major
authenticated route.
