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

const pool = new Pool({
  connectionString: hyperdrive?.connectionString ?? process.env["DATABASE_URL"],
});

export const db = drizzle(pool, { schema });
