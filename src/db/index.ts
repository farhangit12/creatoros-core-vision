import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// `query_timeout` (client-side, a plain `setTimeout` armed when the query is
// submitted -- see node_modules/pg/lib/client.js -- independent of whatever
// the socket layer is doing) bounds an individual query once a connection is
// already acquired; `connectionTimeoutMillis` bounds acquiring that
// connection in the first place. Without a query_timeout, a query that
// stalls inside pg-cloudflare's `cloudflare:sockets` layer (never resolves,
// never rejects) had nothing to turn it into a real error -- it just hung
// until Cloudflare's own platform watchdog killed the whole isolate,
// surfacing as error 1101 "Worker hung" with zero application-level trace.
//
// `idleTimeoutMillis` history: originally set near-zero (`1`) because a live
// production reproduction (watched through `wrangler tail`) showed this
// pool's persistent, cross-request-reused connections were the root cause of
// the intermittent auth-route hang documented in CLAUDE.md's "Final Handover
// Push" section -- Cloudflare Workers ties I/O objects (including
// `cloudflare:sockets` connections) to the request context that created
// them, so a connection pg-pool handed to a *later*, separate request could
// silently stall forever. Forcing eviction+reconnect on almost every request
// fixed that cascading failure, but a follow-up reproduction (once
// `query_timeout` + the release-handler above were also in place) showed a
// new cost: opening a fresh `cloudflare:sockets` connection is itself slow
// to stall-prone under rapid eviction/reopen churn -- 23 of 25 real requests
// each took the full ~8s `query_timeout` on their first attempt and only
// succeeded on the automatic retry (see server.ts), meaning the page never
// showed an error but took 8+ seconds to load almost every time. Raised back
// up to let nearby requests reuse a live connection (matching normal
// browsing gaps) now that `query_timeout` (bounds any single stuck query)
// and the `release` handler above (force-destroys a connection the instant
// it errors, freeing the slot immediately instead of leaking it) already
// cover the original cascading-exhaustion risk on their own -- the near-zero
// value was a workaround for a problem those two now solve more directly.
const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  query_timeout: 8_000,
});

// A `query_timeout` (above) turns a stalled query into a rejected promise,
// and pg-pool's own `_release(client, idleListener, err)` -- triggered by
// `pool.query()`'s automatic `client.release(err)` on any query error --
// removes that client from its bookkeeping immediately (synchronous, see
// node_modules/pg-pool/index.js) and then calls the *graceful* `client.end()`
// to actually close it. For a connection that's genuinely stuck at the
// transport layer -- the underlying cause of the stall in the first place --
// that graceful close can itself never complete, silently leaking the real
// `cloudflare:sockets` connection for the rest of the isolate's lifetime.
// Confirmed live: after wiring up `query_timeout` alone, the hang was gone,
// but a real reproduction run showed failures escalating over time to 100%
// -- consistent with an isolate progressively running out of concurrent
// outbound connections as more of them leak this way. Forcibly destroying
// the raw stream the moment an errored release happens (rather than
// trusting the graceful path) frees the real connection slot immediately.
// `client.connection.stream` is the same internal path pg's own
// query_timeout handler uses for its "pipeline" branch (see
// node_modules/pg/lib/client.js) -- undocumented but stable pg internals.
pool.on("release", (err, client) => {
  if (!err) return;
  try {
    (
      client as unknown as { connection?: { stream?: { destroy?: () => void } } }
    ).connection?.stream?.destroy?.();
  } catch {
    // best-effort -- the client is already being discarded either way.
  }
});

export const db = drizzle(pool, { schema });
