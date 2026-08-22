// Generic passthrough wrapper for ad hoc wrangler commands (e.g. `kv
// namespace create`) -- same token-aliasing and Windows .cmd-spawn handling
// as scripts/deploy.mjs and scripts/tail.mjs. Run with: npm run wrangler -- <args>
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(repoRoot, ".env") });

if (!process.env.CLOUDFLARE_DEPLOY_TOKEN) {
  console.error("CLOUDFLARE_DEPLOY_TOKEN is not set in .env -- aborting.");
  process.exit(1);
}

const wranglerBin = join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);

const result = spawnSync(wranglerBin, process.argv.slice(2), {
  cwd: repoRoot,
  env: { ...process.env, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_DEPLOY_TOKEN },
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("Failed to launch wrangler:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
