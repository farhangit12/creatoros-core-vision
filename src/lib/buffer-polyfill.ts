/**
 * Runs synchronously in <head>, before any bundled module, same pattern as
 * theme.ts's THEME_INIT_SCRIPT.
 *
 * src/lib/server/*.ts files export createServerFn RPC stubs alongside plain
 * helpers (e.g. requireUserId()) that import `@/lib/auth` for DB session
 * lookups. TanStack's createServerFn transform strips the *handler bodies*
 * for the client build, but dev-mode Vite still statically resolves the
 * file's other top-level imports (including auth.ts -> src/db/index.ts ->
 * `pg`) into the client dependency graph, since it doesn't tree-shake in
 * dev. `pg` transitively references the bare global `Buffer` (via
 * postgres-bytea, `var bufferFrom = Buffer.from || Buffer;` at module top
 * level) -- unavailable in browsers, so simply loading that chunk threw
 * `ReferenceError: Buffer is not defined` (reproduced live: fired on every
 * /login page mount via better-auth's client init, and blocked the
 * "Continue with Google" button's redirect -- not something specific to
 * Google, just the first button that happened to trigger loading it).
 *
 * Because the reference is a bare global identifier (not an import), no
 * module-resolution fix (alias/optimizeDeps) can intercept it -- verified
 * live: a `resolve.alias` for `pg` fixed the browser but leaked into the
 * server/SSR build too (Vite's resolver applies a top-level alias across
 * every environment), breaking real DB writes. This script instead defines
 * `Buffer` as a plain global, same technique as THEME_INIT_SCRIPT. This
 * dependency chain is never meaningfully exercised client-side (it's dead
 * code that just happens to get bundled), so the polyfill only needs to be
 * *callable without throwing* -- not semantically correct Node Buffer
 * behavior.
 */
export const BUFFER_POLYFILL_SCRIPT = `(function(){if(typeof window!=="undefined"&&typeof window.Buffer==="undefined"){function B(){}B.from=function(){return{}};B.isBuffer=function(){return false};window.Buffer=B;}})();`;
