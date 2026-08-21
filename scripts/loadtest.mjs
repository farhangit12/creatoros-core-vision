// Local-only load-test baseline -- see the readiness audit / docs/OPERATIONS.md.
//
// Deliberately never points at the live deployed Worker, Neon, or Cloudflare
// Workers AI: those share real, metered free-tier quota with real users
// (see SAFE_DAILY_IMAGE_CAP in src/lib/server/credits.ts) and hammering them
// here would burn exactly the budget that safety valve exists to protect.
// This gives real, measured throughput/latency numbers for a local dev
// server -- an honest baseline, not a substitute for real production-
// infrastructure load testing (which needs a live target and is explicitly
// left for later, same as any paid load-testing service would be).
//
// Usage: npm run dev (in one terminal), then in another:
//   node scripts/loadtest.mjs

import autocannon from "autocannon";

const baseUrl = process.env.BASE_URL ?? "http://localhost:8081";

const targets = [
  { title: "GET / (SSR landing page)", path: "/" },
  { title: "GET /api/health", path: "/api/health" },
];

for (const target of targets) {
  console.log(`\n=== ${target.title} ===`);
  const result = await autocannon({
    url: `${baseUrl}${target.path}`,
    connections: 10,
    duration: 10,
  });
  console.log(autocannon.printResult(result));
}
