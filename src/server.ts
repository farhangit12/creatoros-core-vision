import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { auth } from "./lib/auth";
import { applySecurityHeaders } from "./lib/server/security-headers";
import { logger } from "./lib/server/logger";
import { executionContextStorage } from "./lib/server/execution-context";
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
// {"unhandled":true,"message":"HTTPError"} -- the SSR call *returns*
// normally in that case, it never throws, so a plain try/catch around it
// never fires and never gets a chance to inspect (or retry on) the real
// error. `error-capture.ts` separately records the last Error passed to
// `console.error` (which better-auth's own internal logger goes through) --
// `consumeLastCapturedError()` recovers that real underlying error here,
// which is what actually makes the retry decision below possible instead of
// retrying blind on every swallowed 500 regardless of cause.
async function detectSwallowedSsrError(response: Response): Promise<unknown | undefined> {
  if (response.status < 500) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.clone().text();
    if (isH3SwallowedErrorBody(body)) {
      return consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
    }
  }
  // Live reproduction (real production requests against /dashboard) showed a
  // SECOND swallow shape this function originally missed entirely: for a
  // route-loader failure, TanStack Start's own router error boundary renders
  // a full HTML 500 page (real `<!DOCTYPE html>...`, content-type
  // `text/html`), not h3's raw JSON `{"unhandled":true,...}` shape checked
  // above -- so the content-type gate was silently discarding every one of
  // these and the retry below never fired, despite the failure being the
  // exact same underlying transient DB stall (confirmed via wrangler tail:
  // "Query read timeout" on the session lookup either way). Any 500 response
  // on this SSR path is now treated as swallowed regardless of shape;
  // `consumeLastCapturedError()` still recovers the real error when
  // available for logging, with a generic fallback so the retry still fires
  // even on a run where nothing happened to pass through console.error.
  return consumeLastCapturedError() ?? new Error(`SSR error response (status ${response.status})`);
}

// One SSR attempt that never throws -- any failure (thrown exception, or an
// h3-swallowed 500) comes back as `{ error }` instead, so the caller can
// make one uniform retry decision regardless of which of the two shapes the
// underlying `cloudflare:sockets`/pg stall (see src/db/index.ts) happened to
// take this time. Both are observed live for the identical root cause --
// which one occurs depends on exactly where in better-auth's internals the
// stalled query was awaited.
async function attemptSsrRender(
  request: Request,
  realEnv: unknown,
  ctx: unknown,
): Promise<{ response: Response } | { error: unknown; swallowed: boolean }> {
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, realEnv, ctx);
    const swallowedError = await detectSwallowedSsrError(response);
    if (swallowedError) return { error: swallowedError, swallowed: true };
    return { response };
  } catch (error) {
    return { error, swallowed: false };
  }
}

// Matches the exact error message shapes reproduced live via `wrangler
// tail` for the transport-level `cloudflare:sockets` stall documented in
// src/db/index.ts -- "Query read timeout" (pg's own query_timeout firing)
// and "timeout exceeded when trying to connect" (pg-pool's
// connectionTimeoutMillis firing while waiting on a slot). Intentionally
// narrow -- broad enough to catch this one confirmed failure class, not so
// broad it retries arbitrary application errors that might not be safe to
// re-run.
const RETRYABLE_DB_ERROR_PATTERN = /query read timeout|timeout exceeded when trying to connect|ECONNRESET|ECONNREFUSED/i;

// drizzle-orm wraps every real driver error in its own `DrizzleQueryError`
// (message: "Failed query: <sql>...") and puts the actual underlying pg
// error -- the one that actually says "Query read timeout" or "timeout
// exceeded when trying to connect" -- on `.cause` (see
// node_modules/drizzle-orm/errors.js), not in the wrapper's own `.message`
// or `.stack`. A shallow message check alone would never match a real
// occurrence of this bug; this walks the cause chain to find it.
function isRetryableDbError(error: unknown, depth = 0): boolean {
  if (error == null || depth > 5) return false;
  const message = error instanceof Error ? error.message : String(error);
  if (RETRYABLE_DB_ERROR_PATTERN.test(message)) return true;
  const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
  return isRetryableDbError(cause, depth + 1);
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

    // Runs the whole request inside an AsyncLocalStorage context carrying
    // this request's real ExecutionContext -- see execution-context.ts for
    // why this exists (better-auth's own background-task hook needs a real
    // ctx.waitUntil() it has no direct access to otherwise).
    const response = await executionContextStorage.run(
      ctx as { waitUntil(promise: Promise<unknown>): void },
      () => handleRequest(request, realEnv, ctx, pathname, requestId),
    );
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
    // Previously unwrapped -- unlike the SSR path below, a thrown/hung
    // auth.handler() call left zero application-level trace, only
    // Cloudflare's own generic runtime error. Real logging now, even though
    // this can't catch a true platform-level "Worker hung" cancellation
    // (Cloudflare kills the whole isolate before a catch block ever runs
    // for that specific case) -- it still catches genuine thrown errors.
    //
    // The single retry below targets a specific, confirmed-live failure
    // mode (see src/db/index.ts's pool comment and CLAUDE.md's "Final
    // Handover Push" section): `cloudflare:sockets`-backed pg connections
    // occasionally stall. With idleTimeoutMillis kept near-zero, a stall no
    // longer permanently wedges the pool, but a real production
    // reproduction (36-50 requests per run, watched live through
    // `wrangler tail`) showed each stall is isolated and self-heals on the
    // very next request -- consistent with a transient, per-connection-
    // attempt flake rather than a systemic outage. A bounded, error-
    // pattern-gated retry converts that into an invisible ~2-8s delay
    // instead of a hard failure. Deliberately narrow: only retries errors
    // that look like the exact DB-connection/timeout class already
    // reproduced (never a generic catch-all retry, which could double-
    // execute a genuinely non-idempotent failure for an unrelated bug).
    // `request.clone()` is taken up front because a Request's body stream
    // can only be read once -- the retry needs its own unconsumed copy.
    //
    // Two failure shapes, same as the SSR path below: a *thrown* exception
    // (caught directly, checked with `isRetryableDbError`), and a
    // *swallowed* one -- live reproduction on `/api/auth/sign-up/email`
    // showed better-auth can also catch this exact DB stall internally
    // (visible only via its own `console.error`/`# SERVER_ERROR:` logging)
    // and resolve normally with a bare empty-body 500 Response, never
    // throwing back to this try/catch at all -- so the thrown-only version
    // of this retry silently never fired for that shape. `consumeLastCapturedError()`
    // recovers the real error error-capture.ts caught from that console.error
    // call so the same narrow pattern-match gate applies to both shapes.
    const retryRequest = request.clone();
    let response: Response;
    try {
      response = await auth.handler(request);
    } catch (error) {
      logger.error("auth.handler failed", { requestId, pathname }, error);
      if (!isRetryableDbError(error)) throw error;
      logger.warn("Retrying auth.handler after a transient DB error (thrown)", { requestId, pathname });
      try {
        return await auth.handler(retryRequest);
      } catch (retryError) {
        logger.error("auth.handler retry also failed", { requestId, pathname }, retryError);
        throw retryError;
      }
    }
    // A FOURTH failure shape was live-reproduced on the real Google OAuth
    // callback (`/api/auth/callback/google`): the same DB stall, this time
    // hit inside better-auth's OAuth `parseState` step (a `verification`-
    // table lookup). Here better-auth doesn't return a 500 at all -- it does
    // a normal 302 redirect to its own `/error` page. A first attempt at
    // handling this (retrying unconditionally, same as the other GET cases
    // below) was tried live and made things WORSE, not better: per
    // `node_modules/better-auth/dist/oauth2/state.mjs`'s `parseGenericState`,
    // a successful `findVerificationValue` read is immediately followed by
    // `deleteVerificationByIdentifier` (the one-time login token is
    // consumed). If our client-side `query_timeout` fires because the
    // *response* from Postgres was slow to arrive back over
    // `cloudflare:sockets` -- not because the query itself was actually
    // slow -- the delete has very likely already happened server-side by
    // the time we give up waiting. Confirmed live: the retry's second
    // attempt then failed with a *different*, unrecoverable error
    // (`state_mismatch` -- "verification not found") instead of the
    // original, retryable-sounding `internal_server_error`. Unlike the
    // other GET requests handled below (`get-session`, plain page loads),
    // this one is NOT safely idempotent despite being a GET, because it
    // consumes a one-time server-side token as a side effect -- so it's
    // deliberately excluded from the "retry any GET" logic. If this stall
    // happens on a real login attempt, the only correct recovery is a fresh
    // "Continue with Google" click (a brand-new one-time code/token), not
    // an automatic retry of the same failed request -- see
    // `google-auth-button.tsx`/`login.tsx`/`auth.ts`'s `onAPIError.errorURL`
    // for how that failure is now surfaced to the user instead of silently
    // landing on the bare homepage.
    if (response.status >= 500) {
      const recovered = consumeLastCapturedError();
      // Live reproduction on /api/auth/get-session showed a THIRD failure
      // shape, one level deeper than the SSR bug above: better-auth's
      // internal logger calls `console.error` TWICE for the same failure --
      // first with the full, detailed error (real message: "Failed query:
      // ... caused by: Error: Query read timeout"), then again with a
      // generic wrapper it actually resolves the response with (`APIError:
      // "Failed to get session"`, no `.cause` chain at all). Since
      // `consumeLastCapturedError()` only ever holds the MOST RECENT
      // console.error argument, it reliably grabs the second, generic one --
      // which never matches `isRetryableDbError`, so the retry silently
      // never fired for this exact path even with the swallowed-error
      // handling added above. Fixed the same way as the SSR path: GET
      // requests here (get-session, and any other read-only, side-effect-
      // free auth endpoint) are inherently safe to retry unconditionally,
      // so they no longer depend on successfully recovering/pattern-
      // matching the real error at all. POST/mutating auth requests
      // (sign-up, sign-in, etc.) keep the narrower, precise-match-only
      // gate, same non-idempotent-risk reasoning as everywhere else in this
      // file -- and the OAuth callback above is deliberately excluded from
      // this branch entirely (it never reaches here, since it fails via a
      // redirect, not a >=500 status).
      const shouldRetry = request.method === "GET" || isRetryableDbError(recovered);
      if (shouldRetry) {
        logger.warn("Retrying auth.handler after a transient DB error (swallowed)", {
          requestId,
          pathname,
          method: request.method,
        });
        return await auth.handler(retryRequest);
      }
      logger.error("auth.handler returned 500 (not recognized as retryable)", { requestId, pathname }, recovered);
    }
    return response;
  }
  // Same transient-DB-error retry as the /api/auth branch above, and for the
  // same confirmed-live reason: any SSR route that needs the current
  // session (e.g. /dashboard's loader) calls into better-auth's own session
  // lookup, which goes through the identical pg pool and is subject to the
  // identical occasional stall -- reproduced live via wrangler tail
  // (`Failed query: select ... from "session" ... caused by: Error: Query
  // read timeout`), distinct from the rate-limiter query already moved off
  // Postgres. This code path was previously unretried entirely, showing
  // every affected visitor a generic "This page didn't load" error.
  //
  // Two different retry gates, deliberately: a *thrown* exception carries
  // the real error object directly, so it's checked precisely against
  // `isRetryableDbError` (same narrow gate as /api/auth, for the same
  // non-idempotent-risk reason). A *swallowed* h3 500 is different --
  // better-auth's internal logger bakes the error into a formatted message
  // string rather than passing the live Error instance where
  // error-capture.ts's console.error patch reliably recovers it (confirmed
  // live: a same-cause failure still retried using the identical fix but
  // the precise-match version left the retry not firing at all, and this
  // broader version fixed it) -- so for a swallowed error there's no
  // reliable way to fingerprint the cause. Retrying it unconditionally is
  // still safe specifically because GET requests are idempotent by
  // definition; this is never applied to POST/mutating requests.
  const retrySsrRequest = request.clone();
  let result = await attemptSsrRender(request, realEnv, ctx);
  const shouldRetry =
    "error" in result &&
    (result.swallowed ? request.method === "GET" : isRetryableDbError(result.error));
  if (shouldRetry) {
    logger.warn("Retrying SSR request after a transient error", { requestId, pathname });
    result = await attemptSsrRender(retrySsrRequest, realEnv, ctx);
  }
  if ("error" in result) {
    logger.error("Unhandled request error", { requestId, pathname }, result.error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return result.response;
}
