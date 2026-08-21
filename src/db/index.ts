import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// On the deployed Worker, `process.env` is a proxy over the raw Cloudflare
// binding object (see node_modules/unenv's process/env.mjs), so a Hyperdrive
// binding shows up here as an object, not a string -- unlike every other env
// var. Locally there's no such binding, so this is always undefined and
// DATABASE_URL is used exactly as before (ASCEND A2-B).
interface HyperdriveBinding {
  connectionString: string;
}
const hyperdrive = process.env["HYPERDRIVE"] as unknown as HyperdriveBinding | undefined;

// Small `max` deliberately -- each Worker isolate should hold few direct
// connections of its own; Neon's pooled (-pooler) endpoint (or Hyperdrive,
// when bound) already does the real multiplexing across all isolates. A
// short idleTimeout releases idle connections promptly instead of holding
// them open for an isolate's whole lifetime.
const pool = new Pool({
  connectionString: hyperdrive?.connectionString ?? process.env["DATABASE_URL"],
  max: 5,
  idleTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
