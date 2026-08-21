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
- **RTO: not measured, estimated at a few minutes.** Neon's branch-restore
  mechanism (create a new branch from a point in time, then point the app
  at it) is typically fast, but this has never actually been drilled in
  this project — see Backup restore below. Treat the "few minutes" figure
  as an estimate until it's been tested once for real.
- **Cloudinary-hosted assets** (uploaded files, AI-generated images/
  thumbnails) have no separate backup/PITR at all — Cloudinary's own
  platform durability is the only protection. Not addressed by this pass;
  flagged as a gap, not silently assumed covered by the DB's PITR.

## Backup restore — manual steps (Neon MCP here is read-only, can't do this automatically)

1. Go to the Neon console → project `creatoros-ai` → Branches.
2. Create a new branch from the `production` branch, selecting "Restore to
   a point in time" and picking a timestamp within the last 6 hours.
3. Get the new branch's connection string.
4. Point a throwaway local `.env`'s `DATABASE_URL` at it (never the real
   `production` branch) and run a read query to confirm the data at that
   point in time looks correct.
5. Delete the throwaway branch when done.

This has **not** been performed yet in this project — doing it once for
real (even against a scratch branch, not production) is the only way to
turn the RTO estimate above into a measured number.

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
