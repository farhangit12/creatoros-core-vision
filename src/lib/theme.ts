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

/** Applies the resolved theme to the document and caches the raw setting for the next page load's inline init script. */
export function applyTheme(setting: ThemeSetting) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", resolveTheme(setting) === "light");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, setting);
  } catch {
    // localStorage unavailable (private mode / disabled) -- theme just won't survive a reload.
  }
}

/**
 * Runs synchronously in <head>, before the stylesheet and before hydration,
 * so the correct theme class is already present at first paint (no flash).
 * Keep THEME_STORAGE_KEY above in sync with the literal used here -- this
 * string has to stand alone since it runs before any app code loads.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("creatoros-theme")||"dark";var r=s;if(s==="system"){r=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}if(r==="light"){document.documentElement.classList.add("light");}}catch(e){}})();`;
