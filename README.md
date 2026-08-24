# CreatorOS AI

An all-in-one AI workspace for content creators: AI Chat, Script Studio, Image Studio, and Thumbnail Studio, alongside real Projects, a Content Planner, Files, and usage-based billing.

## Stack

- **Frontend/routing**: TanStack Start (React), Vite
- **Auth + database**: better-auth + Drizzle ORM + Neon Postgres
- **AI text**: Groq (primary), OpenRouter free tier (fallback)
- **AI images**: Cloudflare Workers AI, stored via Cloudinary
- **Billing**: Polar.sh (Merchant of Record — handles global tax/compliance)
- **Email**: Resend
- **Deployment target**: Vercel (current — plain Node.js runtime; `vercel deploy --prod` ships the whole app). Cloudflare Workers is also fully supported and kept deployable (`wrangler deploy`) as a second, independent target against the same database.

See `CLAUDE.md` for the full build history, architecture decisions, and every feature's implementation/verification notes — it's a detailed running engineering log, useful if you want the "why" behind a specific piece of code.

## Getting started

1. **Copy `.env.example` to `.env`** and fill in each value. Every entry explains where to get it (Neon, Groq, Cloudflare, Cloudinary, Resend, Google OAuth, Polar).
2. **Provision the database.** Create a Neon Postgres project, then run every file in `drizzle/` against it in order (`0000` through `0010`) — each is a small, additive, already-reviewed SQL migration. There's no `drizzle-kit push`/`generate` workflow here (see `CLAUDE.md`'s "Database Rules" for why); apply the `.sql` files directly.
3. **Install and run:**
   ```sh
   npm install
   npm run dev
   ```
   Opens on `http://localhost:8080` by default — make sure `BETTER_AUTH_URL` in `.env` matches whatever port it actually starts on.
4. **Build for production:**
   ```sh
   npm run build
   ```

## Deploying

- **Vercel (current):** `npx vercel deploy --prod` — secrets live in Vercel's own Production/Preview environment variables.
- **Cloudflare Workers (also supported):** `wrangler deploy` — config lives in `wrangler.jsonc`.

See `docs/OPERATIONS.md` for the full deployment runbook covering both targets: rollback, the repeatable smoke test (`npm run smoke-test`), migration procedure, recovery objectives, and incident response.

## Project structure

- `src/routes/` — pages (TanStack Start file-based routing)
- `src/lib/server/` — server-only logic (auth-gated, ownership-checked database access)
- `src/lib/ai/` — the provider-agnostic AI layer (routing, providers, registry)
- `src/db/schema.ts` — the full database schema
- `drizzle/` — versioned SQL migrations, applied in order
- `docs/OPERATIONS.md` — deployment, rollback, backups, incident response
