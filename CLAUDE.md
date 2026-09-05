# CreatorOS — Project Context

This file is the authoritative running summary of the project for Claude Code across sessions. It supersedes `README.md` wherever it conflicts (it describes an older, broader, now-abandoned scope in places).

**Maintenance rule:** update this file whenever a task reaches fully completed + verified + user-approved status — not before (don't record in-progress or unverified work here). Move the task out of "Next Likely Work": add a one/two-line entry to **"What's Built (current state)"** below, and write the full what-changed / how-verified / known-limitations detail into **`docs/BUILD-HISTORY.md`** (the phase-by-phase archive, split out of this file on 2026-08-28 to stay under the 150k-char context limit — keep this file lean, put the depth there).

Branch: `main` — this is now the real, deployed production branch (see `docs/BUILD-HISTORY.md` → "Vercel Cutover"). `feature/v1-functional` still exists and is still Lovable-connected, but as of 2026-08-24 it is deliberately frozen/no longer pushed to, per explicit user instruction to keep Lovable out of the real product going forward — do not push to it without asking first. `platform/vercel` is superseded by `main` (fast-forwarded into it) and can be treated as merged/retired. As of 2026-08-24, `AGENTS.md` (the Lovable connection notice) and `.lovable/` (Lovable's editor metadata) were removed from the repo, along with the dead `src/lib/lovable-error-reporting.ts` shim (only ever functioned inside Lovable's own preview iframe) — done for a clean public repo, per explicit user request not to surface Lovable usage. The one Lovable-origin piece kept deliberately is the `@lovable.dev/vite-tanstack-config` npm dependency in `package.json`/`vite.config.ts` — it's load-bearing (the actual Vite/TanStack Start build config), not cosmetic, and removing it would break the build.

## Stack

- TanStack Start (React) frontend/routing, Vite dev server
- better-auth (v1.6.29) + Drizzle ORM + Neon Postgres for auth/DB
- Neon project: name `creatoros-ai`, id `raspy-queen-23599870`, org `org-young-wildflower-65815643`, region `aws-ap-southeast-1`
- AI: provider-agnostic layer (`src/lib/ai/`) — real Groq (primary) + OpenRouter free-tier (fallback) for text; real Cloudflare Workers AI + Cloudinary for images/thumbnails (see AI Architecture below)
- Email: Resend REST API via native `fetch` (no SDK)

## Locked V1 Scope (overrides README/AGENTS module lists)

The nav (`src/lib/navigation.ts`) intentionally **excludes**: Video Studio, Repurpose, Templates, Knowledge Base, Brand Kit, AI Memory, Automation, Analytics, standalone Notifications page, standalone Upcoming page. Do not propose re-adding these based on README/AGENTS text — those docs are stale.

- Billing **is** a valid Account-group sidebar destination (Free/Pro/Scale tiers, not README's Free/Creator/Studio/Scale).
- Notifications live only as a topbar dropdown, not a page.
- Dashboard has no "Upcoming content" section. AI Usage page has no "This cycle" trend stat or "Balance states" showcase.
- `/notifications` and `/upcoming` route files may still exist on disk but are deliberately unlinked from nav — not a bug.

## Database Rules (strict — always follow)

Neon is shared/pre-provisioned production data, not throwaway. **Never apply a migration in one step.** Required workflow for any schema change:
1. Inspect current `src/db/schema.ts` and live Neon schema (read-only Neon MCP) first.
2. Write ONE additive-only SQL migration (no DROP/TRUNCATE/DELETE/ALTER-type-change/table recreation).
3. Show the exact SQL + confirm it's additive. Stop — do not apply yet.
4. If using a runner script, show its complete contents too (must read the exact reviewed SQL file, no destructive statements, secrets via `process.env["KEY"]` bracket notation never printed, wrapped in `BEGIN`/`COMMIT` with `ROLLBACK` on failure).
5. Only after explicit approval of both, execute.
6. Re-query live DB afterward to verify (don't trust script exit code alone) — confirm exact expected tables/columns exist and nothing unrelated changed.
7. Report and stop — don't chain into more migrations/wiring/commits unless separately asked.

**Why drizzle-kit push/generate don't work here:** base tables (`user`, `session`, `account`, `verification`, `audit_log`) were provisioned outside this repo pre-Drizzle (leftover `_prisma_migrations` table proves earlier Prisma provisioning, no Prisma files remain). No `drizzle/` migration history exists, so `drizzle-kit generate` would try to recreate everything; `drizzle-kit push` fails outright (no TTY in this shell). Instead: hand-write additive SQL, execute via a throwaway Node script using `pg` + `DATABASE_URL`, wrapped in BEGIN/COMMIT/ROLLBACK. The Neon MCP server available here is **read-only** — schema inspection only, never write SQL through it.

## Working Conventions / Feedback to Follow

- **No mock data, no fake statistics** — when removing mock data conflicts with a "don't touch X" scope boundary, default to honest "Not available yet" empty states everywhere (including billing/credit-adjacent surfaces) rather than leaving fake numbers for visual completeness. "Don't touch billing" means don't build new billing backend logic, not "leave fake billing data displayed."
- **Verify library APIs before using them** — for auth/payment/security-sensitive library calls, grep the actual installed `node_modules` source for real method/endpoint names rather than trusting recalled docs (e.g. better-auth's client method names are generated via `toKebabCase` from the call path, matched against real registered routes — `authClient.requestPasswordReset`, not the commonly-cited `forgetPassword`).
- **Dev server port quirk**: an unrelated, unowned node process persistently squats on port 8080 on this machine (do not kill it — not confirmed to be ours), so `npm run dev` always lands on 8081. As of 2026-08-20, `.env`'s `BETTER_AUTH_URL` is permanently set to `http://localhost:8081` to match — no more temporarily repointing it for local auth testing then reverting; verified live (login POST returns a normal "Invalid email or password", not an origin-mismatch rejection). Only revisit if 8081 also becomes unavailable someday. Also: `TaskStop` on a backgrounded dev server doesn't reliably kill the underlying `node.exe` — check `Get-NetTCPConnection -State Listen` (or `netstat -ano | grep LISTENING`) and force-kill leftover PIDs before restarting.
- Security check before every commit touching secrets/auth/AI providers: grep the diff for actual key/secret *values* (not just names) before reading/committing; confirm `.env` stays gitignored.

## AI Architecture (`src/lib/ai/`)

Layering: UI → `src/lib/server/ai/*.ts` (server fns, session-scoped, zod-validated) → `src/lib/ai/{text-service,image-service}.ts` → `src/lib/ai/registry.ts` (operation → {provider, model} map, now with optional `fallback`) → `src/lib/ai/providers/{text,image}/*.ts` (isolated per-provider adapters, only these files read the real API keys) → external provider. Plus `src/lib/ai/router.ts`: tries primary, on retryable failure (429/5xx, `ProviderHttpError`) falls back automatically; non-retryable errors propagate untouched.

4 DB tables: `aiConversations`, `aiMessages`, `aiGenerations` (usage/cost ledger: provider, model, status, tokens, costCents, jsonb input/output), `aiAssets` (image/thumbnail variants, FK to `aiGenerations`).

**Current routing (locked):**
- `chat` → Groq `llama-3.3-70b-versatile` (primary) → OpenRouter free `nvidia/nemotron-3-ultra-550b-a55b:free` (fallback)
- `script.generate` → same Groq/OpenRouter-free pair
- `script.rewrite` → same Groq/OpenRouter-free pair
- `structured.generate` → still mock-only
- `image.generate` / `thumbnail.generate` / `image.variation` → **real**, Cloudflare Workers AI, model `@cf/black-forest-labs/flux-2-klein-4b` (`src/lib/ai/providers/image/cloudflare.ts`, picked over SDXL/flux-1-schnell/flux-2-klein-9b — see that file for why), with generated images uploaded to Cloudinary for storage/CDN delivery (`src/lib/ai/providers/image/cloudinary-upload.ts`). This was Phase 3H-B, committed in `d27f69e` alongside the free-text router — Image Studio, Thumbnail Studio, and image variations all generate and render real images end-to-end, with real Cloudinary URLs persisted on `aiAssets`. (An earlier memory snapshot incorrectly described image/thumbnail generation as still mocked and blocked on a Gemini image-quota error — that was stale; Gemini image was an abandoned attempt superseded by this Cloudflare/Cloudinary implementation. Do not investigate Gemini image, billing, or alternative image providers based on old notes — this is live and working.)

**Cloudflare Workers AI reliability (recurring failure pattern, see `docs/BUILD-HISTORY.md` → ASCEND A4):** the image pipeline has broken more than once with Cloudflare Workers AI returning a bare `401 Authentication error` even though the API token itself verified as valid/active and correctly scoped — editing an *existing* token's permissions did not resolve it; only issuing a brand-new token did (interpreted as a stale server-side permission-cache issue on Cloudflare's side, external to this codebase, not fixable in code). This can recur without warning since it's a third-party, free-tier credential behavior, not a bug here. Two standing mitigations exist for when it does: (1) `_check-cloudflare-ai-token.mjs` (project root, `node _check-cloudflare-ai-token.mjs`) reproduces the exact failing call in ~2 seconds and tells you plainly whether the token needs replacing, instead of a full manual re-diagnosis; (2) `cloudflare.ts`'s error handling gives a distinct, honest message for 401s ("a provider credentials issue on our side, not something you did") surfaced through Image Studio's and Thumbnail Studio's `onError` toasts, instead of passing through Cloudflare's generic string that misleads users into thinking they did something wrong.

Preserved-but-unwired for a future paid upgrade: `openai/gpt-5.6-luna` and `anthropic/claude-sonnet-5` via paid OpenRouter (constants kept in `registry.ts`, not deleted). `claude-haiku-4.5` was evaluated and explicitly excluded (wraps JSON in \`\`\`json fences, breaks `text-service.ts`'s direct `JSON.parse`).

**Cost/eval history:** Gemini free tier (~5 RPM/20 RPD) judged unsuitable for multi-user production → evaluated OpenRouter paid models (gpt-5.6-luna $0.10/$0.60 per M, claude-haiku-4.5 $1/$5, claude-sonnet-5 $2/$10) → OpenRouter trial balance exhausted ($0 credits) → pivoted to free tier: Groq (genuine persistent free tier, no CC) vs Cerebras (rejected — 30-day expiring $5 trial, same trap as OpenRouter) vs OpenRouter `:free` pool (kept as fallback only, shared/noisy). Groq's `gpt-oss-120b` was disqualified (8K TPM ceiling collides with our token sizing, reproduced live as a 429). `llama-3.3-70b-versatile` locked as primary.

Fallback path is real and runtime-tested (not simulated): a concurrency test legitimately exceeded Groq's real 30 RPM limit; failures were correctly classified as retryable and transparently fell over to OpenRouter free, all succeeding.

## What's Built (current state)

> Phase-by-phase detail — commit hashes, verification notes, known limitations — is in **`docs/BUILD-HISTORY.md`**. This section is the short version; update both when a task completes.

- **Deploy**: `main` → Vercel production (Node runtime), `https://creatoros-core-vision.vercel.app`, auto-deploys on push. The old Cloudflare Worker still runs in parallel off `feature/v1-functional` but is no longer the actively-developed line; retiring it is an open decision. The ~8s per-request latency tax that motivated the move was a Cloudflare `cloudflare:sockets`/`pg` quirk and is gone on Vercel.
- **Auth**: better-auth email/password + Google OAuth. Email verification enforced (`requireEmailVerification`); real TOTP 2FA available (`twoFactor` plugin, `issuer: "CreatorOS"`); DB-backed rate limiting; password reset + change-email via Resend. Resend has **no verified sending domain yet** — real delivery 403s until the buyer sets one up.
- **AI studios** (all real — routing in AI Architecture above): Script Studio, Image Studio, Thumbnail Studio, Chat. Chat extracts text from PDF attachments. Re-edit prefill from Library into each studio; generating again always makes a new row, never overwrites.
- **Library** (`/library`): DB-backed creation history for all 4 studios, per-item + bulk delete, "View all" sheets. Draft-autosave was built then deliberately removed — studios start blank.
- **Files** (`/files`): real Cloudinary-backed upload/list/rename/delete/favourite, direct signed browser upload, MIME-spoof check against Cloudinary's detected type, project linking.
- **Content Planner**: CRUD calendar with cover images (real generated thumbnails via Thumbnail Studio's "Add to planner" handoff).
- **Billing & Credits**: real ledger (`user_credits` + `credit_ledger`), per-plan monthly pools (Free/Pro/Scale), Scale = unlimited with a 500cr/day fair-use cap, plus an account-wide daily image safety valve. Check-before / deduct-after on all 6 generation paths; failed generations never charged. Real per-generation cost estimation on the AI Usage page (`costMicros`).
- **Payments**: real Polar.sh checkout + hosted customer portal + webhook sync (sandbox-verified end to end; production keys are a buyer setup step). `past_due` keeps the plan alive through Polar's retry window (dunning); only `canceled`/`unpaid` downgrades.
- **Plan feature gating**: Free vs Paid unlock sets, enforced server-side in all 4 studio server fns + client lock UI (`src/lib/plan-features.ts`).
- **Production hardening**: CSP + security headers, audit logging (`audit_log`), AI idempotency guard, provider timeout + per-isolate circuit breaker, transaction-wrapped credit ledger, `/api/health`, CI (`tsc` + build), `docs/OPERATIONS.md` runbook, sitemap/robots/JSON-LD structured data/GSC verification, in-app feedback + `/help`.

### DB migrations applied (Neon, all additive)
`0002` theme · `0003` files · `0005` planner cover image · `0006` credits system · `0007` polar subscriptions · `0008` rate limit · `0009` two factor · `0010` generation cost micros. No `drizzle/` migration history exists for the pre-provisioned base tables — see Database Rules.

### Polar webhook re-registration
Webhook runs against a session-tied `cloudflared` quick tunnel to local dev — full restart/re-register steps are in `docs/BUILD-HISTORY.md` → "Polar.sh Payment Integration".

## Next Likely Work

Core product surface (landing, auth, dashboard, all 4 AI studios, Library, Files, Content Planner, Settings, AI Usage, Billing) is fully functional end-to-end and now live on **Vercel via `main`** (see `docs/BUILD-HISTORY.md` → Vercel Cutover) — Cloudflare (`feature/v1-functional`) remains up in parallel but is no longer the actively-developed line.

**What's genuinely left, in order:**
1. **Resend domain verification** — deferred by user's own choice (no domain yet, doesn't want to spend money on it right now); treated as the eventual buyer's setup step, same posture as Polar's production keys. (Blocks real email delivery for both password reset and email-verification-enforcement.)
2. **Buyer handover logistics** (outside the 137-item checklist) — a plan for transferring or rotating the live Neon/Cloudflare/Cloudinary/Groq/Polar/Vercel accounts and credentials to the buyer, or walking them through `docs/OPERATIONS.md`'s deploy steps against their own freshly-provisioned accounts. Not started.
3. **Cloudflare Worker retirement decision** — still live and untouched post-cutover; whether/when to decommission it (or keep it as a documented fallback) is an open, not-yet-made call.

**Done (2026-08-28):** backfilled the phase detail for the 13-commit documentation gap — see `docs/BUILD-HISTORY.md` → "Production-Readiness Re-Pass — 2FA, Cost Estimation, Dunning, SEO". Also that day: split this file — the phase-by-phase archive moved to `docs/BUILD-HISTORY.md` so `CLAUDE.md` stays under the 150k-char context limit.
**Dropped from this list**: a seller-side Polar business/KYC review was previously listed here, but `docs/HANDOVER.md`'s accounts table already correctly assigns that to the *buyer* (their own Polar org, their own KYC) — sandbox already proves the payment integration works end-to-end. Doing KYC under the seller's own identity would add nothing to the sale, so it's removed as stale rather than carried forward.
