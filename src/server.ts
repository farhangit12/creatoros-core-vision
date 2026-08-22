import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { auth } from "./lib/auth";
import { applySecurityHeaders } from "./lib/server/security-headers";
import { logger } from "./lib/server/logger";
import { db } from "./db";
import { sql } from "drizzle-orm";

type ServerEntry = {
  fetch: (request: Request) => Promise<Response> | Response;
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
//
// This retry machinery (and the DB-stall pattern it targets) was built for
// a Cloudflare-Workers-specific `cloudflare:sockets` transport quirk (see
// CLAUDE.md's "Final Handover Push" section) that motivated this app's move
// to Vercel's plain Node.js runtime in the first place. It's kept here,
// unchanged, as cheap insurance -- Neon (any Postgres, really) can still
// have a slow/failed query for other reasons, and a bounded, narrow,
// idempotency-aware retry is harmless if it rarely or never fires here.
async function detectSwallowedSsrError(response: Response): Promise<unknown | undefined> {
  if (response.status < 500) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.clone().text();
    if (isH3SwallowedErrorBody(body)) {
      return consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
    }
  }
  // A route-loader failure can also come back as a full HTML 500 page (real
  // `<!DOCTYPE html>...`, content-type `text/html`) from TanStack Start's
  // own router error boundary, not h3's raw JSON `{"unhandled":true,...}`
  // shape checked above. Any 500 response on this SSR path is treated as
  // swallowed regardless of shape; `consumeLastCapturedError()` still
  // recovers the real error when available for logging, with a generic
  // fallback so the retry still fires even on a run where nothing happened
  // to pass through console.error.
  return consumeLastCapturedError() ?? new Error(`SSR error response (status ${response.status})`);
}

// One SSR attempt that never throws -- any failure (thrown exception, or an
// h3-swallowed 500) comes back as `{ error }` instead, so the caller can
// make one uniform retry decision regardless of which of the two shapes a
// transient DB failure happened to take this time.
async function attemptSsrRender(
  request: Request,
): Promise<{ response: Response } | { error: unknown; swallowed: boolean }> {
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request);
    const swallowedError = await detectSwallowedSsrError(response);
    if (swallowedError) return { error: swallowedError, swallowed: true };
    return { response };
  } catch (error) {
    return { error, swallowed: false };
  }
}

// Matches the exact error message shapes reproduced live (on Cloudflare) for
// a transient DB connection failure -- "Query read timeout" (pg's own
// query_timeout firing) and "timeout exceeded when trying to connect"
// (pg-pool's connectionTimeoutMillis firing while waiting on a slot).
// Intentionally narrow -- broad enough to catch this one confirmed failure
// class, not so broad it retries arbitrary application errors that might
// not be safe to re-run.
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

/** Real DB connectivity check -- used by GET /api/health. A trivial SELECT 1
 * is enough to prove the deployed function can actually reach the database,
 * not just that the process is running. */
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
  async fetch(request: Request) {
    const requestId = crypto.randomUUID();
    const pathname = new URL(request.url).pathname;
    const response = await handleRequest(request, pathname, requestId);
    const withSecurityHeaders = await applySecurityHeaders(response);
    withSecurityHeaders.headers.set("X-Request-Id", requestId);
    return withSecurityHeaders;
  },
};

async function handleRequest(request: Request, pathname: string, requestId: string): Promise<Response> {
  if (pathname === "/api/health") {
    return checkHealth();
  }
  if (pathname.startsWith("/api/auth")) {
    // A thrown/hung auth.handler() call previously left zero application-
    // level trace on Cloudflare, only the platform's own generic runtime
    // error -- real logging here still catches genuine thrown errors.
    //
    // The single retry below targets a specific, confirmed-live failure
    // mode from this app's time on Cloudflare Workers (see CLAUDE.md's
    // "Final Handover Push" section): `cloudflare:sockets`-backed pg
    // connections occasionally stalled. Kept here as cheap insurance
    // against any transient DB connection error, Vercel or not.
    // Deliberately narrow: only retries errors that look like the exact
    // DB-connection/timeout class already reproduced (never a generic
    // catch-all retry, which could double-execute a genuinely non-
    // idempotent failure for an unrelated bug). `request.clone()` is taken
    // up front because a Request's body stream can only be read once -- the
    // retry needs its own unconsumed copy.
    //
    // Two failure shapes: a *thrown* exception (caught directly, checked
    // with `isRetryableDbError`), and a *swallowed* one -- better-auth can
    // also catch a DB failure internally (visible only via its own
    // `console.error`/`# SERVER_ERROR:` logging) and resolve normally with a
    // bare empty-body 500 Response, never throwing back to this try/catch
    // at all -- so the thrown-only version of this retry would silently
    // never fire for that shape. `consumeLastCapturedError()` recovers the
    // real error error-capture.ts caught from that console.error call so
    // the same narrow pattern-match gate applies to both shapes.
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
    // The Google OAuth callback (`/api/auth/callback/google`) hits the same
    // class of DB failure inside better-auth's OAuth `parseState` step (a
    // `verification`-table lookup), but doesn't return a 500 at all -- it
    // does a normal 302 redirect to its own `/error` page. Per
    // `node_modules/better-auth/dist/oauth2/state.mjs`'s
    // `parseGenericState`, a successful `findVerificationValue` read is
    // immediately followed by `deleteVerificationByIdentifier` (the
    // one-time login token is consumed) -- so blindly retrying this
    // specific redirect is NOT safe despite being a GET (confirmed live on
    // Cloudflare: a retry after a slow-but-succeeded read traded a
    // retryable-looking `internal_server_error` for a permanent
    // `state_mismatch`). It never reaches this branch anyway, since it
    // fails via a redirect, not a >=500 status -- see
    // `google-auth-button.tsx`/`login.tsx`/`auth.ts`'s `onAPIError.errorURL`
    // for how that failure is surfaced to the user instead of silently
    // landing on the bare homepage.
    if (response.status >= 500) {
      const recovered = consumeLastCapturedError();
      // better-auth's internal logger can call `console.error` TWICE for the
      // same failure -- once with the full detailed error, then again with a
      // generic wrapper it actually resolves the response with (no `.cause`
      // chain at all). Since `consumeLastCapturedError()` only ever holds
      // the MOST RECENT console.error argument, it can end up holding the
      // generic one, which never matches `isRetryableDbError`. GET requests
      // here (get-session, and any other read-only, side-effect-free auth
      // endpoint) are inherently safe to retry unconditionally, so they
      // don't depend on successfully recovering/pattern-matching the real
      // error at all. POST/mutating auth requests (sign-up, sign-in, etc.)
      // keep the narrower, precise-match-only gate, same non-idempotent-risk
      // reasoning as everywhere else in this file.
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
  // same reason: any SSR route that needs the current session (e.g.
  // /dashboard's loader) calls into better-auth's own session lookup, which
  // goes through the same pg pool and is subject to the same class of
  // occasional stall.
  //
  // Two different retry gates, deliberately: a *thrown* exception carries
  // the real error object directly, so it's checked precisely against
  // `isRetryableDbError` (same narrow gate as /api/auth, for the same
  // non-idempotent-risk reason). A *swallowed* h3 500 is different --
  // better-auth's internal logger bakes the error into a formatted message
  // string rather than passing the live Error instance where
  // error-capture.ts's console.error patch reliably recovers it -- so for a
  // swallowed error there's no reliable way to fingerprint the cause.
  // Retrying it unconditionally is still safe specifically because GET
  // requests are idempotent by definition; this is never applied to
  // POST/mutating requests.
  const retrySsrRequest = request.clone();
  let result = await attemptSsrRender(request);
  const shouldRetry =
    "error" in result &&
    (result.swallowed ? request.method === "GET" : isRetryableDbError(result.error));
  if (shouldRetry) {
    logger.warn("Retrying SSR request after a transient error", { requestId, pathname });
    result = await attemptSsrRender(retrySsrRequest);
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
