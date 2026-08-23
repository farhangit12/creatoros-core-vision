export function canonicalLinks(pathname: string): Array<{ rel: "canonical"; href: string }> {
  const siteUrl = process.env["SITE_URL"];
  if (!siteUrl) return [];
  try {
    return [{ rel: "canonical", href: new URL(pathname, siteUrl).toString() }];
  } catch {
    return [];
  }
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
