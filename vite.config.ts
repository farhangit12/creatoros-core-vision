// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * Redirects `pg` to a harmless stub, but only for client (non-SSR)
 * resolution -- the `options.ssr` flag on `resolveId` is Vite's original,
 * long-established SSR/client distinction (predates the newer per-
 * environment config surface, which was tried here first and confirmed
 * live to not actually take effect for either the client bundle or the
 * dependency optimizer -- this hook-based approach is more direct and
 * verified working both ways). See the comment further down for why this
 * redirect exists at all.
 */
function stubPgForClientOnly(): Plugin {
  const stubPath = fileURLToPath(new URL("./src/lib/empty-pg-stub.ts", import.meta.url));
  return {
    name: "stub-pg-for-client-only",
    enforce: "pre",
    resolveId(source, _importer, options) {
      if (source === "pg" && !options.ssr) {
        return stubPath;
      }
      return null;
    },
  };
}

// Pinned per ASCEND A2 (2026-08-18): nitro's own default is the literal string
// "latest", which resolves to the build machine's current system date at build
// time — non-reproducible, and broke local `wrangler dev`/workerd entirely when
// this machine's clock read a date newer than what the installed wrangler/workerd
// build supports ("Compatibility date ... is in the future and unsupported").
// 2024-09-23 is the date nodejs_compat became broadly supported/documented by
// Cloudflare and has been verified working end-to-end against wrangler 4.123.0 in
// this repo's Worker boot/HTTP/SSR tests. Bump deliberately, not by letting it float.
// Set as an env var (nitro reads `COMPATIBILITY_DATE` at build time) rather than via
// the `nitro` option below, since @lovable.dev/vite-tanstack-config's type for that
// option deliberately excludes compatibilityDate (see its own comment on `nitro?:`).
process.env["COMPATIBILITY_DATE"] ??= "2024-09-23";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // The platform's default import-protection denies any client import from
    // **/server/**. src/lib/server/*.ts only exports createServerFn RPC stubs
    // (Phase 2B persistence layer) that route files must import client-side,
    // so exclude that folder specifically while keeping the blanket rule
    // for everything else.
    importProtection: {
      client: {
        excludeFiles: ["**/node_modules/**", "**/lib/server/**"],
      },
    },
  },
  // src/lib/server/*.ts files export createServerFn RPC stubs alongside plain
  // helpers (e.g. requireUserId()) that import `@/lib/auth` for DB session
  // lookups. TanStack's createServerFn transform strips the *handler bodies*
  // for the client build, but dev-mode Vite still statically resolves the
  // file's other top-level imports (including auth.ts -> src/db/index.ts ->
  // `pg`) into the client dependency graph, since it doesn't tree-shake in
  // dev. `pg`'s module graph references several Node builtins that don't
  // exist in browsers (confirmed live via two successive crashes: `Buffer`,
  // then a `class extends undefined` from a node:stream-derived class) --
  // pre-bundling any of it client-side is always wrong, dev-mode-only dead
  // weight (this dependency chain is never meaningfully exercised
  // client-side) that broke the "Continue with Google" button (and would
  // break any other button touching this same lazily-loaded chunk).
  //
  // Scoped to client-only resolution via stubPgForClientOnly() above -- a
  // plain top-level `resolve.alias` was tried first and confirmed live to
  // also reach the server/SSR build (breaking real DB writes, better-auth's
  // own session insert hit the stub); an `environments.client`-scoped alias
  // was tried next and confirmed live to just not take effect at all for
  // either the browser or the dependency optimizer. The resolveId-hook
  // approach below is verified live both ways: the browser no longer
  // crashes loading this chunk, AND a real signup through the actual server
  // still persists to Neon correctly.
  plugins: [stubPgForClientOnly()],
  vite: {
    optimizeDeps: {
      exclude: ["pg"],
    },
    // Vite's dev server rejects any Host header it doesn't recognize (DNS-
    // rebinding protection), which otherwise blocks a temporary cloudflared
    // quick tunnel (a random *.trycloudflare.com hostname) used to give
    // Polar's webhook a real internet-reachable URL pointing at local dev
    // for sandbox testing. Dev-server-only setting -- has no effect on the
    // production build/deploy.
    server: {
      allowedHosts: [".trycloudflare.com"],
    },
  },
});
