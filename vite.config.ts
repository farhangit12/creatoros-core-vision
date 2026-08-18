// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

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
});
