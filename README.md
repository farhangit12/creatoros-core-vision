# CreatorOS AI

An all-in-one AI workspace for content creators: AI Chat, Script Studio, Image Studio, and Thumbnail Studio, alongside real Projects, a Content Planner, Files, and usage-based billing.

Live: **[creatoros-core-vision.vercel.app](https://creatoros-core-vision.vercel.app)**

## Stack

- **Frontend/routing**: TanStack Start (React), Vite
- **Auth + database**: better-auth + Drizzle ORM + Neon Postgres
- **AI text**: Groq (primary), OpenRouter free tier (fallback)
- **AI images**: Cloudflare Workers AI, stored via Cloudinary
- **Billing**: Polar.sh (Merchant of Record — handles global tax/compliance)
- **Email**: Resend
- **Hosting**: Vercel (Node.js runtime) — `main` auto-deploys on push

See `CLAUDE.md` for current state and architecture decisions, and `docs/BUILD-HISTORY.md` for the phase-by-phase build log with verification notes.

## Getting started

1. **Copy `.env.example` to `.env`** and fill in each value. Every entry explains where to get it (Neon, Groq, Cloudflare, Cloudinary, Resend, Google OAuth, Polar).
2. **Provision the database.** Create a Neon Postgres project, then run every file in `drizzle/` against it in order (`0000` through `0010`) — each is a small, additive, already-reviewed SQL migration. There's no `drizzle-kit push`/`generate` workflow here (see `CLAUDE.md`'s "Database Rules" for why); apply the `.sql` files directly.
3. **Install and run:**
   ```sh
   npm install
   npm run dev
   ```
   The dev server starts on `http://localhost:8080`, or the next free port (often `8081`). Make sure `BETTER_AUTH_URL` in `.env` matches the port it actually binds.
4. **Build for production:**
   ```sh
   npm run build
   ```

## Deploying

`main` is connected to Vercel and deploys automatically on push. For a manual deploy: `npx vercel deploy --prod`. Secrets live in Vercel's Production/Preview environment variables.

See `docs/OPERATIONS.md` for the full runbook: rollback, the repeatable smoke test (`npm run smoke-test`), migration procedure, recovery objectives, and incident response.

> A Cloudflare Workers build target also exists on the `feature/v1-functional` branch (frozen). `main` targets Vercel only.

## Project structure

- `src/routes/` — pages (TanStack Start file-based routing)
- `src/lib/server/` — server-only logic (auth-gated, ownership-checked database access)
- `src/lib/ai/` — the provider-agnostic AI layer (routing, providers, registry)
- `src/db/schema.ts` — the full database schema
- `drizzle/` — versioned SQL migrations, applied in order
- `docs/OPERATIONS.md` — deployment, rollback, backups, incident response
