// Quick health-check for the CLOUDFLARE_API_TOKEN used by Image Studio /
// Thumbnail Studio / image variations (src/lib/ai/providers/image/cloudflare.ts).
//
// Run with: node _check-cloudflare-ai-token.mjs
//
// Cloudflare Workers AI tokens on this project have, more than once, shown a
// specific failure mode: the token reports "active" and can list the
// account, but every Workers AI call still 401s with a generic
// "Authentication error" -- editing the same token's permissions did not
// fix it; only issuing a brand-new token did. This script reproduces the
// exact failing call directly (bypassing the app) so that failure mode can
// be confirmed in seconds instead of a full manual re-diagnosis.
//
// No secret values are ever printed -- only pass/fail status.

import "dotenv/config";

const apiToken = process.env["CLOUDFLARE_API_TOKEN"];
const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];

if (!apiToken || !accountId) {
  console.error("FAIL: CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is missing from .env.");
  process.exit(1);
}

const verifyRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
  headers: { Authorization: `Bearer ${apiToken}` },
});
const verifyJson = await verifyRes.json();
const tokenOk = verifyRes.status === 200 && verifyJson.result?.status === "active";
console.log(tokenOk ? "OK  Token is valid and active." : "FAIL  Token verify failed -- token itself is invalid/expired.");
if (!tokenOk) {
  console.log(JSON.stringify(verifyJson));
  process.exit(1);
}

const model = "@cf/black-forest-labs/flux-2-klein-4b";
const form = new FormData();
form.append("prompt", "a red apple on a white table, minimal");
form.append("width", "256");
form.append("height", "256");

const runRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiToken}` },
  body: form,
});
const runJson = await runRes.json();

if (runRes.status === 200 && runJson.success) {
  console.log("OK  Workers AI image generation succeeded -- Image Studio / Thumbnail Studio should work.");
  process.exit(0);
}

if (runRes.status === 401) {
  console.log(
    "FAIL  Workers AI call returned 401 Authentication error, even though the token itself is valid.\n" +
      "      This is the known stale-permission pattern -- editing the existing token's\n" +
      "      permissions has NOT fixed this before. Create a brand-new Cloudflare API token\n" +
      "      instead (Account -> Workers AI -> Edit + Read, scoped to this account), then\n" +
      "      update CLOUDFLARE_API_TOKEN in .env and restart the dev server.",
  );
  process.exit(1);
}

console.log(`FAIL  Unexpected response (status ${runRes.status}):`, JSON.stringify(runJson));
process.exit(1);
