# Operations Runbook

Practical, repeatable steps for deploying, verifying, and recovering this
app — written down so they don't only live in one person's head or in
CLAUDE.md's session-by-session narrative. This doc is the answer to the
readiness audit's "deployment process documented", "production smoke test
defined", "migration/rollback procedures documented", "RPO/RTO defined",
and "backup restore procedure documented" items.

## Deployment

1. `npx tsc --noEmit` — must be 0 errors.
2. `npm run build` — must complete cleanly; produces `.output/server` and
   `.output/public`.
3. Review `git status`/`git diff` — confirm the change is scoped to what was
   intended, no secret values in the diff.
4. `npx wrangler deploy` — requires `CLOUDFLARE_DEPLOY_TOKEN` (deploy-scoped;
   do **not** use `CLOUDFLARE_API_TOKEN`, which is deliberately kept
   Workers-AI-only — see CLAUDE.md's "Cloudflare deploy-scoped API token"
   section) set as `CLOUDFLARE_API_TOKEN` in the shell for this one command,
   e.g. `CLOUDFLARE_API_TOKEN=$CLOUDFLARE_DEPLOY_TOKEN npx wrangler deploy`.
   This is a live, traffic-affecting action — get explicit go-ahead before
   running it, same posture this project has always used.
5. Run the smoke test (below) against the real deployed URL.
6. Watch `npx wrangler tail` for a few minutes after deploy for unexpected
   errors.

**Rollback**: `npx wrangler rollback [deployment-id]` reverts to a previous
Worker version (`npx wrangler deployments list` to find one) — this is a
real, tested Cloudflare Workers capability, not something bespoke to this
app. It only reverts *code* — it does not undo a database migration (see
Migrations below).

## Production smoke test

Run `node scripts/smoke-test.mjs` with `BASE_URL` set to the target:

```
BASE_URL=https://your-worker.workers.dev node scripts/smoke-test.mjs
```

Checks `/`, `/login`, `/privacy`, `/api/health`, and
`/api/auth/get-session` each return their expected status code. Exits
non-zero on any failure, so it's CI/script-friendly.

## Static asset caching

Already handled automatically by the build tooling — no config needed here.
Nitro's Cloudflare-module build step writes `.output/public/_headers` with a
`cache-control: public, max-age=31536000, immutable` rule for every hashed
`/assets/*` file (JS/CSS), and auto-generates the `ASSETS` binding in the
built `wrangler.json` from `wrangler.jsonc` at build time — nothing to add to
`wrangler.jsonc` by hand. Confirm after any build with
`cat .output/public/_headers`, and after a deploy with
`curl -sI https://<worker>.workers.dev/assets/<a-real-hashed-file>.js`
(expect the header above). This app is fully SSR'd (no prerendered `.html`
files ship in `.output/public`), so every page request falls through to the
Worker's `fetch()` handler in `src/server.ts` regardless — that handler
deliberately sets no `Cache-Control` of its own, so dynamic HTML responses
are never cached at the edge. Don't add asset-cache config to
`security-headers.ts`/`server.ts` — it wouldn't apply to hashed assets
anyway (they never reach that code path) and risks the CSP-hydration class
of regression documented elsewhere in this project's history.

## Database migrations

Standing policy (also in CLAUDE.md — this section formalizes it, doesn't
change it):

1. Inspect the live schema (Neon MCP, read-only) and `src/db/schema.ts`
   before writing anything.
2. Write one additive-only SQL file in `drizzle/` (no `DROP`/`TRUNCATE`/
   `DELETE`/type changes/table recreation).
3. Show the exact SQL, confirm it's additive, stop for approval.
4. Show the runner script too (reads the exact reviewed file, wraps in
   `BEGIN`/`COMMIT` with `ROLLBACK` on any failure, reads secrets via
   `process.env["KEY"]`, never prints them) — see `_phase-*-apply-
   migration.mjs` in the repo root for the established pattern.
5. Apply only after explicit approval of both.
6. Re-query the live DB afterward to confirm exactly the expected change and
   nothing else.

**Rollback**: because every migration here is additive-only (new
tables/columns, never destructive), "rollback" in practice means writing a
new corrective migration through the same process above, not reverting a
transaction. No destructive down-migration has ever been written or run
against this database. If a migration needs to be undone, treat it with the
same care as any other schema change — write and review the exact `DROP`/
`ALTER` SQL rather than assuming it's safe.

## Recovery objectives (RPO / RTO)

Measured from the real Neon project (`creatoros-ai`, org
`org-young-wildflower-65815643`) via `describe_project`, not guessed:

- **RPO ≈ near-zero within a 6-hour window.** Neon's point-in-time recovery
  retention for this project is `history_retention_seconds: 21600` (6
  hours) on the current free tier — any point in the last 6 hours can be
  restored to. Data older than 6 hours ago, if it's since been overwritten
  or deleted, is not recoverable. Extending this window is a paid Neon plan
  upgrade — out of scope for this pass per the "leave what costs money"
  boundary, but worth knowing before treating 6 hours as generous.
- **RTO: drilled for real (2026-08-23), exact duration not timed.** The
  restore steps below were actually performed against a real scratch
  branch (`backup-drill-test`, point-in-time restore, auto-deleted after 1
  day) — not just estimated. A read query against it returned real,
  sensible data (a user count consistent with the restore timestamp
  chosen). What's confirmed: the mechanism works end-to-end, and branch
  creation felt fast enough in practice that nobody thought to time it
  precisely — so "a few minutes" remains the working estimate, now
  backed by one successful real run instead of pure inference. A future
  drill that actually stopwatches branch-creation-to-queryable would
  upgrade this from a working estimate to an exact number.
- **Cloudinary-hosted assets** (uploaded files, AI-generated images/
  thumbnails) have no separate backup/PITR at all — Cloudinary's own
  platform durability is the only protection. Not addressed by this pass;
  flagged as a gap, not silently assumed covered by the DB's PITR.

## Backup restore — manual steps (Neon MCP here is read-only, can't do this automatically)

1. Go to the Neon console → project `creatoros-ai` → Branches.
2. Create a new branch from the `production` branch: pick "Branch data and
   schema from a past point in time" (not the plain "Branch data and
   schema" option, which just clones current HEAD) and choose a timestamp
   within the last 6 hours. Setting auto-delete to "After 1 day" means you
   don't have to remember to clean it up.
3. Get the new branch's connection string (pooled).
4. Point a throwaway local `.env`'s `DATABASE_URL` at it (never the real
   `production` branch) and run a read query — either via Neon's own
   in-console SQL Editor (select the scratch branch first) or any
   Postgres client — to confirm the data at that point in time looks
   correct.
5. Delete the throwaway branch when done (or just let auto-delete handle it).

**Performed for real on 2026-08-23** (see the RTO note above) — confirmed
working end-to-end, not just documented in theory.

## Incident response (lightweight)

1. **Notice**: today, this is manual (console errors, a user report, or a
   failed smoke test) — no automated alerting exists yet (see the readiness
   audit's Monitoring section for what that would need).
2. **Triage**: check `npx wrangler tail` for live errors; check `/api/health`;
   check the AI Usage page for a spike in `failed` generations; check Neon's
   own dashboard for DB-side issues.
3. **Mitigate**: for a bad deploy, `npx wrangler rollback` (see above). For a
   provider outage (Groq/Cloudflare AI/Cloudinary/Resend/Polar), there's
   usually nothing to do but wait — the text router already has an
   automatic fallback (Groq → OpenRouter); images/storage/email/payments do
   not have a fallback provider.
4. **Record**: write down what happened, when, root cause, and what fixed
   it — even a few lines in a running log (this file, or a dedicated one)
   beats nothing. No formal postmortem template exists yet; add one here
   once a real incident happens and this is actually exercised.
