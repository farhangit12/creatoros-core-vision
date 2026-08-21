export function canonicalLinks(pathname: string): Array<{ rel: "canonical"; href: string }> {
  const siteUrl = process.env["SITE_URL"];
  if (!siteUrl) return [];
  try {
    return [{ rel: "canonical", href: new URL(pathname, siteUrl).toString() }];
  } catch {
    return [];
  }
}
