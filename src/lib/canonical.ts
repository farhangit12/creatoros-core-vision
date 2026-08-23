/**
 * Absolute URL for the given pathname on the real deployed site, or
 * undefined when SITE_URL isn't configured -- callers must skip emitting
 * canonical/og:url tags entirely rather than fall back to a fake domain,
 * since a wrong canonical actively hurts indexing more than a missing one.
 */
export function absoluteUrl(pathname: string): string | undefined {
  const siteUrl = process.env["SITE_URL"];
  if (!siteUrl) return undefined;
  try {
    return new URL(pathname, siteUrl).toString();
  } catch {
    return undefined;
  }
}

export function canonicalLinks(pathname: string): Array<{ rel: "canonical"; href: string }> {
  const href = absoluteUrl(pathname);
  return href ? [{ rel: "canonical", href }] : [];
}

/** og:url meta entry for the given pathname, or [] when SITE_URL isn't set. */
export function ogUrlMeta(pathname: string): Array<{ property: "og:url"; content: string }> {
  const href = absoluteUrl(pathname);
  return href ? [{ property: "og:url", content: href }] : [];
}

/**
 * Absolute URL for social-preview images (og:image/twitter:image). Both
 * protocols require an absolute URL -- a relative path like "/favicon.png"
 * silently fails to resolve for crawlers that don't share the page's
 * browsing context (Facebook/Twitter/etc.), unlike a normal <img> tag.
 * Falls back to the bare relative path only when SITE_URL isn't set (better
 * than a hardcoded guess, since this app has no fixed domain yet).
 */
export function absoluteAssetUrl(assetPath: string): string {
  const siteUrl = process.env["SITE_URL"];
  if (!siteUrl) return assetPath;
  try {
    return new URL(assetPath, siteUrl).toString();
  } catch {
    return assetPath;
  }
}
