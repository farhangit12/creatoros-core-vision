import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { auth } from "./lib/auth";
import { applySecurityHeaders } from "./lib/server/security-headers";
import { logger } from "./lib/server/logger";
import { db } from "./db";
import { sql } from "drizzle-orm";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  logger.error("h3 swallowed SSR error", undefined, consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// ASCEND A2-C. Two independent, compounding gaps caused DB/env access to
// silently fail on the real deployed Worker (see CLAUDE.md for the full
// trace): (1) `nodejs_compat` alone makes bare `import ... from "node:process"`
// resolve to workerd's own NATIVE process implementation, whose `.env` stays
// empty unless `nodejs_compat_populate_process_env` is also set in
// wrangler.jsonc (the actual fix, plain-string bindings only) -- and (2) by
// the time TanStack's own server-entry (invoked via `handler.fetch` below)
// runs, its own `env` parameter is always `undefined` regardless, since h3's
// internal dispatch (`h3App.fetch(req)`) only ever passes the request, never
// env/context, no matter how nitro's outer Cloudflare handler received them.
// The only place the real bindings reliably survive that entire chain is
// `request.runtime.cloudflare.env`, attached by nitro's own `augmentReq()` at
// the true entry point. This restores `globalThis.__env__` from there as a
// belt-and-suspenders path for any code going through the unenv-style shim
// instead of native `node:process` (the flag above doesn't cover object-typed
// bindings like Hyperdrive, which still need this route).
function restoreCloudflareEnv(request: Request, fallback: unknown): unknown {
  const cfEnv = (request as unknown as { runtime?: { cloudflare?: { env?: unknown } } }).runtime
    ?.cloudflare?.env;
  if (typeof cfEnv === "object" && cfEnv !== null) {
    (globalThis as unknown as { __env__?: unknown }).__env__ = cfEnv;
    return cfEnv;
  }
  return fallback;
}

/** Real DB connectivity check -- used by GET /api/health. A trivial SELECT 1
 * is enough to prove the Worker can actually reach the database, not just
 * that the process is running. */
async function checkHealth(): Promise<Response> {
  try {
    await db.execute(sql`SELECT 1`);
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    logger.error("Health check DB connectivity failed", undefined, error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const requestId = crypto.randomUUID();
    // Use the restored value (not the incoming `env`, which is always
    // `undefined` by the time this function is called -- see comment above)
    // for every downstream call too. TanStack's own server-entry does its
    // own `globalThis.__env__ = env` bookkeeping internally, and passing it
    // the still-broken original `env` would immediately clobber the fix.
    const realEnv = restoreCloudflareEnv(request, env);
    const pathname = new URL(request.url).pathname;

    const response = await handleRequest(request, realEnv, ctx, pathname, requestId);
    const withSecurityHeaders = await applySecurityHeaders(response);
    withSecurityHeaders.headers.set("X-Request-Id", requestId);
    return withSecurityHeaders;
  },
};

async function handleRequest(
  request: Request,
  realEnv: unknown,
  ctx: unknown,
  pathname: string,
  requestId: string,
): Promise<Response> {
  if (pathname === "/api/health") {
    return checkHealth();
  }
  if (pathname.startsWith("/api/auth")) {
    return auth.handler(request);
  }
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, realEnv, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    logger.error("Unhandled request error", { requestId, pathname }, error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}
