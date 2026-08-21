import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Makes the current request's Cloudflare Workers `ExecutionContext`
 * available to code that has no direct access to it (e.g. better-auth's
 * internal `runInBackgroundOrAwait`, called deep inside its own request
 * handler). Without this, better-auth's `advanced.backgroundTasks.handler`
 * can't be wired to a real `ctx.waitUntil()`, so it falls through to a plain
 * `await` -- silently turning every "background" task (e.g. the rate
 * limiter's periodic expired-rows cleanup) into something that blocks the
 * response. Set in src/server.ts's fetch handler, read in src/lib/auth.ts.
 */
export const executionContextStorage = new AsyncLocalStorage<{ waitUntil(promise: Promise<unknown>): void }>();
