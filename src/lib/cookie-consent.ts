export type CookieConsentChoice = "accepted" | "rejected";

const CONSENT_STORAGE_KEY = "creatoros-cookie-consent";

/**
 * The recorded choice for the "Preferences" cookie category (currently just
 * the local theme cache -- see theme.ts). Necessary cookies (the session
 * auth cookie) are never gated on this, since they're required for the
 * service the user explicitly asked for and are exempt from consent under
 * ePrivacy-style rules. Returns null when the user hasn't decided yet.
 */
export function getCookieConsent(): CookieConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(choice: CookieConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Best-effort -- if storage is unavailable the banner will just reappear next visit.
  }
}

/** Undecided is treated as "not consented" (opt-in, not opt-out) -- the safer default. */
export function hasPreferencesConsent(): boolean {
  return getCookieConsent() === "accepted";
}
