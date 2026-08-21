/**
 * Hash-locking script-src to the two static inline scripts in __root.tsx
 * (THEME_INIT_SCRIPT, BUFFER_POLYFILL_SCRIPT) was tried first and reverted
 * -- confirmed live via a real hydration failure ("Invariant failed:
 * Expected to find bootstrap data on window.$_TSR") -- TanStack Start
 * injects its own inline hydration-bootstrap `<script>` with per-request
 * serialized router state, which is dynamic content that can't be
 * pre-hashed the way the two static scripts can. A CSP that only allowed
 * the two known hashes silently broke every page's hydration. `unsafe-
 * inline` on script-src is the correct, honest choice here (also: CSP spec
 * ignores `unsafe-inline` whenever any hash/nonce source is present, so
 * mixing the two wouldn't have worked anyway). Everything else below still
 * meaningfully restricts the page -- no external script sources, no
 * framing, no cross-origin form posts.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://res.cloudinary.com",
  // Uploads (files, avatar, image/thumbnail reference images) go straight
  // from the browser to Cloudinary's upload API via signed XHR/fetch (see
  // src/lib/files-upload-client.ts) -- connect-src must allow it or every
  // direct upload silently fails with a CSP-blocked fetch error.
  "connect-src 'self' https://api.cloudinary.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

/**
 * Applied to every response (SSR pages and API routes alike) from
 * src/server.ts's fetch handler -- one enforcement point for the whole app.
 * `style-src` also needs 'unsafe-inline' because Tailwind/Radix/many UI
 * primitives in this app set inline `style` attributes at runtime.
 */
export async function applySecurityHeaders(response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
