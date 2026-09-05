import { hasPreferencesConsent } from "@/lib/cookie-consent";

export type ThemeSetting = "dark" | "light" | "system";

export const THEME_OPTIONS: ThemeSetting[] = ["dark", "light", "system"];

export const THEME_STORAGE_KEY = "creatoros-theme";

export function resolveTheme(setting: ThemeSetting): "dark" | "light" {
  if (setting === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return setting;
}

/**
 * Applies the resolved theme to the document and, only if the user has
 * accepted the "Preferences" cookie category, caches the raw setting for
 * the next page load's inline init script. Without that consent the theme
 * still applies for the current page view, it just won't survive a reload
 * from local storage (the DB-persisted user_settings.theme, for signed-in
 * users, is unaffected either way -- this only gates the local cache).
 */
export function applyTheme(setting: ThemeSetting) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", resolveTheme(setting) === "light");
  try {
    if (hasPreferencesConsent()) {
      window.localStorage.setItem(THEME_STORAGE_KEY, setting);
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode / disabled) -- theme just won't survive a reload.
  }
}

/**
 * Runs synchronously in <head>, before the stylesheet and before hydration,
 * so the correct theme class is already present at first paint (no flash).
 * Keep THEME_STORAGE_KEY above and the consent key in sync with the literals
 * used here -- this string has to stand alone since it runs before any app
 * code loads. Only reads the cached theme when "Preferences" cookies were
 * actually accepted; otherwise it defaults to dark, matching applyTheme's
 * refusal to persist without consent.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var consent=localStorage.getItem("creatoros-cookie-consent");var s=consent==="accepted"?(localStorage.getItem("creatoros-theme")||"dark"):"dark";var r=s;if(s==="system"){r=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}if(r==="light"){document.documentElement.classList.add("light");}}catch(e){}})();`;
