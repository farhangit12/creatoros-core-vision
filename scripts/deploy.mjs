// Thin wrapper around `wrangler deploy`. Exists purely to alias
// CLOUDFLARE_DEPLOY_TOKEN (the Workers-deploy-scoped token, kept separate
// from the live Workers AI image pipeline's own CLOUDFLARE_API_TOKEN) into
// the env var wrangler itself actually reads -- and to sidestep the
// documented PowerShell quirk where inline `VAR=value command` syntax and
// multi-line pastes with embedded braces are unreliable in the legacy
// console host (see CLAUDE.md's "wrangler/PowerShell environment notes").
// Run with: npm run deploy
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

const result = spawnSync(wranglerBin, ["deploy", ...process.argv.slice(2)], {
  cwd: repoRoot,
  env: { ...process.env, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_DEPLOY_TOKEN },
  stdio: "inherit",
  // Windows can't exec a .cmd file directly without going through a shell
  // (it isn't a PE binary) -- omitting this silently fails the spawn.
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("Failed to launch wrangler:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
