// Repeatable production smoke test -- see docs/OPERATIONS.md.
// Usage: BASE_URL=https://your-worker.workers.dev node scripts/smoke-test.mjs
// (defaults to local dev if BASE_URL isn't set)

const baseUrl = (process.env.BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");

const checks = [
  { path: "/", expect: 200 },
  { path: "/login", expect: 200 },
  { path: "/privacy", expect: 200 },
  { path: "/api/health", expect: 200 },
  { path: "/api/auth/get-session", expect: 200 },
];

let failed = 0;

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const response = await fetch(url, { redirect: "manual" });
    const ok = response.status === check.expect;
    console.log(`${ok ? "PASS" : "FAIL"}  ${check.path}  (${response.status}, expected ${check.expect})`);
    if (!ok) failed += 1;
  } catch (error) {
    console.log(`FAIL  ${check.path}  (request error: ${error.message})`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed against ${baseUrl}.`);
