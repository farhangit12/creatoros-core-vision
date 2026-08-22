// Streams live production logs (same token-aliasing rationale as
// scripts/deploy.mjs) and also mirrors them to .tail-output.log in the repo
// root so they can be reviewed after the fact without needing to copy
// terminal scrollback. Run with: npm run tail
import { config } from "dotenv";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createWriteStream } from "node:fs";

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

const logPath = join(repoRoot, ".tail-output.log");
const logStream = createWriteStream(logPath, { flags: "w" });
console.log(`Tailing live production logs -- also writing to ${logPath}\nPress Ctrl+C to stop.\n`);

const child = spawn(wranglerBin, ["tail", "--format", "pretty"], {
  cwd: repoRoot,
  env: { ...process.env, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_DEPLOY_TOKEN },
  shell: process.platform === "win32",
});

child.stdout.on("data", (d) => {
  process.stdout.write(d);
  logStream.write(d);
});
child.stderr.on("data", (d) => {
  process.stderr.write(d);
  logStream.write(d);
});
child.on("exit", (code) => {
  logStream.end();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
