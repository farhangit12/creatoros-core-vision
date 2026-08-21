import "dotenv/config";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const sql = readFileSync("./drizzle/0008_rate_limit.sql", "utf8");

const statements = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const client = new Client({ connectionString: process.env["DATABASE_URL"] });

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const stmt of statements) {
      console.log("--- executing ---");
      console.log(stmt);
      await client.query(stmt);
    }
    await client.query("COMMIT");
    console.log("COMMIT OK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ROLLED BACK:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
