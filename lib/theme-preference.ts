export const WF_THEME_STORAGE_KEY = "worshipflow2-theme";

export type WfTheme = "light" | "dark";

export function getStoredWfTheme(): WfTheme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(WF_THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyWfTheme(theme: WfTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function persistWfTheme(theme: WfTheme): void {
  try {
    localStorage.setItem(WF_THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode / quota */
  }
  applyWfTheme(theme);
}
