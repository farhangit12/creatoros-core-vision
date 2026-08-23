import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Makes the current request's real Vercel `waitUntil` function available to
 * code that has no direct access to it (e.g. better-auth's internal
 * `runInBackgroundOrAwait`, called deep inside its own request handler).
 * Without this, better-auth's `advanced.backgroundTasks.handler` can't be
 * wired to a real fire-and-forget primitive, so it falls through to a plain
 * `await` -- turning every "background" task (e.g. the rate limiter's
 * periodic expired-rows cleanup) into something that blocks the response.
 *
 * nitro's `vercel` preset already attaches a real `waitUntil` function
 * directly onto the incoming `Request` object (confirmed in the built
 * output's `vercel.web.mjs`: `req.waitUntil = context?.waitUntil`) -- this
 * just makes that same function reachable from code that only has access to
 * `auth.ts`'s config object, not the original Request. Set in
 * src/server.ts's fetch handler, read in src/lib/auth.ts.
 */
export const executionContextStorage = new AsyncLocalStorage<
  ((promise: Promise<unknown>) => void) | undefined
>();

/** `request.waitUntil` isn't part of the standard Fetch API Request type --
 * it's a Vercel-runtime-specific property nitro's vercel preset attaches at
 * the true entry point. Absent locally (dev server, no such runtime), in
 * which case the caller falls back to a plain `await` -- exactly the same
 * safe behavior this app already had before this wiring existed. */
export function getRequestWaitUntil(request: Request): ((promise: Promise<unknown>) => void) | undefined {
  return (request as unknown as { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil;
}
