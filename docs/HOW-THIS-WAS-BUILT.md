# How CreatorOS Was Built — Working Conventions

CreatorOS was implemented largely by an AI agent (Claude Code) working under
human direction, across roughly two dozen sessions from an empty scope
document to a live production deploy. The code held up not because of how
the individual prompts were phrased, but because of a small set of standing
rules the project owner enforced on **every** task.

This doc captures those rules — the why behind each, and concrete things
each one caught or prevented — so whoever maintains the codebase next keeps
the same guardrails. It's a companion to `docs/OPERATIONS.md` (day-to-day
running) and `docs/HANDOVER.md` (account transfer), and to the build log
(the ordered list of what was shipped).

---

## The conventions

### 1. No mock data, no fake statistics

**Rule.** Never put a fabricated number, stat, or activity item on screen to
make a page look complete. When real data isn't available yet, show an
honest "Not available yet" empty state. This holds even on surfaces that are
otherwise out of scope — "don't build billing" does not mean "leave fake
billing numbers displayed."

**Prevented.** Billing and credit surfaces showed honest empty states for
months before Polar was wired, instead of placeholder balances someone
might have trusted. Dashboard "Recent Activity" became a real aggregated
feed rather than stale demo content. The AI Usage cost column was
*deliberately not built* once it was clear every existing row would show a
dash — presented as a choice, not silently faked.

### 2. Verify live — type-checking is necessary, not sufficient

**Rule.** `tsc --noEmit` and `npm run build` passing is the floor, never the
bar. Before calling something done: walk the real running app in a browser
as a real signed-in user, and cross-check results against the live database
with read-only queries. Trust the database as the source of truth, not the
UI's own display.

**Caught, and only catchable this way:**

- A critical intermittent auth/SSR hang on Cloudflare Workers (25–50% of
  requests to auth routes failing) — invisible to `tsc` and to the local
  dev server, which runs on plain Node.
- Every `/two-factor/*` endpoint 500ing on production
  (`"The model 'twoFactor' was not found in the schema object"`) because
  the SQL migration and plugin wiring were done but the Drizzle table
  definitions were never added.
- The dashboard "AI credits" card stuck on a "Not available yet"
  placeholder long after real credit data existed and worked on other
  pages.
- Image Studio landing a Free-plan user on an already-disabled Generate
  button on first load (default batch size exceeded their plan limit).
- Canonical / sitemap / robots URLs all pointing at a placeholder domain —
  actively misleading crawlers.
- The Postgres driver (`pg`) leaking into the browser bundle and crashing
  any page that touched the auth client (`Buffer is not defined`).
- `account_not_linked` blocking Google sign-in for every existing user.
- A Resend recipient-address mismatch 403ing every single feedback email.

### 3. Database changes: additive-only, one migration, approve → apply → re-verify

**Rule.** The Neon database is shared, pre-provisioned production data — not
throwaway. Every schema change follows the same workflow, no exceptions:

1. Inspect the current `src/db/schema.ts` and the live Neon schema first.
2. Write **one** additive-only SQL migration — no `DROP`, `TRUNCATE`,
   `DELETE`, type changes, or table recreation.
3. Show the exact SQL and the exact runner script. **Stop.** Do not apply.
4. Apply only after explicit approval.
5. Re-query the live database afterward to confirm exactly the expected
   change landed and nothing else moved.
6. Report and stop — don't chain into more migrations or wiring.

**Prevented.** Ten migrations (`0002` through `0010`) were applied over the
life of the project — every one additive, zero data loss, zero accidental
table recreation. `drizzle-kit push`/`generate` don't work in this repo (no
migration history exists, so they'd try to recreate every base table); this
hand-written workflow sidestepped that entirely and kept production data
untouched throughout.

### 4. Verify a library's real API against its installed source

**Rule.** For anything auth-, payment-, or security-sensitive, grep the
actual code in `node_modules/` for the real method names, endpoint paths,
and option shapes. Do not wire against remembered documentation.

**Caught:**

- better-auth's password-reset client method is `requestPasswordReset`, not
  the widely-cited `forgetPassword`. Its client method names are generated
  by kebab-casing the call path against real registered routes.
- Polar's `checkout({ products })` takes a `{ productId, slug }[]` map, not
  a raw list of product IDs.
- better-auth `1.6.29` depends on `zod` v4 (`.meta()` is v4-only) while the
  repo's root `zod` was pinned to v3 — a conflict that only surfaced once
  the Cloudflare build flattened both to one resolution.
- The `emailVerification` option names (`sendOnSignIn`,
  `autoSignInAfterVerification`) and the two-factor plugin's real
  `enable` → `verifyTotp` two-step flow.
- The `"script:ld+json"` meta key that TanStack Router actually renders as a
  real `<script type="application/ld+json">` tag.

### 5. A scope boundary protects working code — it doesn't license leaving things broken

**Rule.** "Don't touch X" means don't build new backend logic for X and
don't churn its working files. It does **not** mean "leave fake data or a
broken control in X." When the two collide, default to an honest empty
state.

**Prevented.** The AI provider adapter files stayed untouched across roughly
a dozen phases — the generation pipeline never regressed from unrelated
work. Billing was never half-built: it was fake-data-free right up until it
was genuinely real.

### 6. Ask before removing any visible dead or fake feature

**Rule.** Fixing something in place doesn't need sign-off. *Deleting* a
visible feature or control does — even if it's wired to nothing.

**Prevented.** Dead controls (position sliders wired to no real effect,
"New folder" / "Move" buttons with no backing) were flagged and removed
with approval, not quietly disappeared between releases.

### 7. Security-grep every commit that touches secrets, auth, or AI providers

**Rule.** Before committing, grep the diff for actual secret *values* (not
just their names). Confirm `.env` is still gitignored. After anything
touching the Polar SDK or `pg`, grep the built client bundle for token
strings.

**Prevented.** `.env` was never committed in any branch's history (verified
across the whole repo). Secrets went to Vercel and Cloudflare over stdin
only — never printed to a log or into chat. The client-bundle leak check is
now a standing step, and it's how the server-side Polar SDK was confirmed
absent from the browser build.

### 8. Report UNVERIFIED honestly — never guess around a gap

**Rule.** If something genuinely can't be tested in the current session, say
so plainly and stop. Don't assume it works and move on.

**Prevented.** "DB write through the real Cloudflare edge: UNVERIFIED" was
recorded as a real blocker rather than assumed harmless — and was later
actually root-caused to two compounding bugs. The residual ~8s Cloudflare
latency tax is documented as a known, still-unsolved performance issue, not
buried.

### 9. No auto-continuing into unrequested work

**Rule.** Finish the task that was asked, report, and stop. Don't chain into
commits, follow-on migrations, deploys, or "while I'm here" refactors
without a separate go-ahead.

**Effect.** Every migration, commit, and deploy was a deliberate,
separately-approved step. The production deploy token was proven working
and then explicitly left unused until `wrangler deploy` was actually
requested.

### 10. Plain language, and visible progress on multi-step work

**Rule.** Explain in jargon-free terms. On anything spanning several
modules, show progress module-by-module as it happens, not as one final
wall of text.

**Effect.** The running project log (`CLAUDE.md`) is written as
what-changed / why / how-verified per section — which is the only reason
this document and the build log could be reconstructed after the fact.

---

## How a typical task actually ran

1. Read the relevant code and live state first — `schema.ts`, the live
   Neon schema (read-only), and the real `node_modules/` source for any
   library being wired.
2. For anything touching the database: draft one additive migration, show
   the SQL and the runner script, stop for approval.
3. Implement within the scope boundary; get `tsc --noEmit` and
   `npm run build` clean.
4. Verify live — real browser walkthrough, real generations / payments
   (sandbox), cross-checked against Neon.
5. Security-grep the diff; confirm `.env` is gitignored.
6. Report what changed, how it was verified, and any known limitations.
   Stop.
7. Commit and push only when asked. Update `CLAUDE.md` only once the task
   is fully done, verified, and approved — never for in-progress work.

---

## For whoever maintains this next

Keep the guardrails, not the specific tooling. The stack may change; these
rules are what kept an AI-built codebase honest:

- Never accept "it compiles" as "it works" — click through the real thing.
- Never let a schema change happen in one unreviewed step against
  production data.
- Never leave a fabricated number on screen to fill a gap — say "not
  available yet."
- Verify a library's real API in its own source before wiring auth or
  payments to it.
- When you can't verify something, say so — don't ship a guess as a fact.
