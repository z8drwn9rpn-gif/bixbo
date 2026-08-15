import { useEffect } from "react";
import { getBixbo, subscribeBixboChanges, useBixbo } from "@/lib/storage";

export type ThemeChoice = "light" | "dark" | "system";

export const BIXBO_THEME_CHOICE_KEY = "bixbo:theme-choice";

const LIGHT_THEME_COLOR = "#FBF7F3";
const DARK_THEME_COLOR = "#171A14";

function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

function readFastThemeChoice(): ThemeChoice | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem(BIXBO_THEME_CHOICE_KEY);
    return isThemeChoice(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function persistFastThemeChoice(theme: ThemeChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BIXBO_THEME_CHOICE_KEY, theme);
  } catch {
    // The current DOM state still keeps the selected theme for this session.
  }
}

function syncBrowserChrome(isDark: boolean, theme: ThemeChoice) {
  const root = document.documentElement;

  // Manual Light is an explicit opt-out from browser/Samsung Auto Dark.
  // Dark and System still advertise both author-provided schemes so Samsung
  // can use BIXBO's curated dark palette instead of inventing one.
  root.style.colorScheme = isDark ? "dark" : "only light";

  const colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  colorSchemeMeta?.setAttribute("content", theme === "light" ? "only light" : "light dark");

  const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColorMeta?.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

/**
 * Applies an explicit BIXBO theme choice immediately.
 * Light and dark always override the OS preference; only `system` follows it.
 */
export function applyThemeChoice(theme: ThemeChoice) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const systemIsDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemIsDark);

  persistFastThemeChoice(theme);

  root.dataset.themeChoice = theme;
  root.dataset.theme = isDark ? "dark" : "light";
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  syncBrowserChrome(isDark, theme);
}

/**
 * Applies the device-local theme preference to <html> and keeps System mode
 * synchronized with the operating system. The synced BIXBO settings value is
 * only a one-time migration fallback for devices that do not yet have the
 * dedicated local theme key.
 */
export function useThemeSync() {
  const { data, hydrated } = useBixbo();
  const storedTheme: ThemeChoice = data.settings.theme ?? "system";

  useEffect(() => {
    if (!hydrated) return;
    applyThemeChoice(readFastThemeChoice() ?? storedTheme);
  }, [storedTheme, hydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Track the canonical settings value only to recognize an actual local
    // Appearance-button change. Remote/cloud reconciles must never replace the
    // theme selected on this device.
    let lastCanonicalTheme: ThemeChoice = getBixbo().settings.theme ?? "system";

    return subscribeBixboChanges((next, reason) => {
      const nextCanonicalTheme: ThemeChoice = next.settings.theme ?? "system";
      const deviceTheme = readFastThemeChoice();

      if (reason === "remote") {
        lastCanonicalTheme = nextCanonicalTheme;
        if (deviceTheme) applyThemeChoice(deviceTheme);
        return;
      }

      if (nextCanonicalTheme === lastCanonicalTheme) return;
      lastCanonicalTheme = nextCanonicalTheme;
      applyThemeChoice(nextCanonicalTheme);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;

    const activeTheme = readFastThemeChoice() ?? storedTheme;
    if (activeTheme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if ((readFastThemeChoice() ?? document.documentElement.dataset.themeChoice) !== "system") return;
      applyThemeChoice("system");
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    // Older Safari fallback.
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [storedTheme, hydrated]);
}
