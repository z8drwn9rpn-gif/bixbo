/** Theme helpers for BIXBO light/dark/system preference. */

export type ThemePreference = "light" | "dark" | "system";

export function resolveTheme(preference: ThemePreference | undefined): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeClass(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}
