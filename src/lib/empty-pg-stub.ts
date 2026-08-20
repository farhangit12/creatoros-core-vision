/**
 * Client-only stand-in for the real `pg` package. `pg` is a Node-only
 * Postgres driver whose module graph references several Node builtins
 * (Buffer, node:stream classes, etc.) that don't exist in browsers -- but
 * several src/lib/server/*.ts files mix createServerFn RPC-stub exports with
 * plain helpers (e.g. requireUserId()) that import `@/lib/auth` for DB
 * session lookups, which transitively imports `src/db/index.ts` (module-
 * scope `new Pool(...)` + `drizzle(pool, ...)`). Dev-mode Vite doesn't
 * tree-shake unused imports out of the client bundle, so this module-level
 * code is still evaluated in the browser even though it's never
 * meaningfully used there.
 *
 * Aliased over `pg` for the CLIENT environment only (see vite.config.ts's
 * `environments.client.resolve.alias` -- deliberately NOT a top-level
 * alias, which was tried first and confirmed live to also reach the
 * server/SSR build, breaking real DB writes). Just needs to be
 * constructible/callable without throwing -- nothing here is ever expected
 * to actually connect to a database in the browser.
 */
export class Pool {
  on(): this {
    return this;
  }
  connect(): never {
    throw new Error("pg is server-only and was stubbed out of the client bundle.");
  }
  query(): never {
    throw new Error("pg is server-only and was stubbed out of the client bundle.");
  }
  end(): Promise<void> {
    return Promise.resolve();
  }
}

export class Client extends Pool {}

export default { Pool, Client };
