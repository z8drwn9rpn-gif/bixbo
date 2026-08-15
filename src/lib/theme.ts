import { useEffect } from "react";
import { useBixbo } from "@/lib/storage";

export type ThemeChoice = "light" | "dark" | "system";

export const BIXBO_THEME_CHOICE_KEY = "bixbo:theme-choice";

const LIGHT_THEME_COLOR = "#FBF7F3";
const DARK_THEME_COLOR = "#171A14";

function persistFastThemeChoice(theme: ThemeChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BIXBO_THEME_CHOICE_KEY, theme);
  } catch {
    // The canonical preference still lives in BIXBO storage.
  }
}

function syncBrowserChrome(isDark: boolean) {
  const root = document.documentElement;

  // The meta tag advertises that BIXBO supplies both palettes. The root CSS
  // property then locks the palette BIXBO actually selected. `only light`
  // prevents Chromium/Samsung auto-dark recolouring when the user explicitly
  // selected BIXBO Light while the phone itself is dark.
  root.style.colorScheme = isDark ? "dark" : "only light";

  const colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  colorSchemeMeta?.setAttribute("content", "light dark");

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

  // Keep both an explicit class and data markers on the root. Samsung Internet
  // can then see an author-controlled light/dark state even inside a dark OS
  // context, while Tailwind continues to use the existing `.dark` variant.
  root.dataset.themeChoice = theme;
  root.dataset.theme = isDark ? "dark" : "light";
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  syncBrowserChrome(isDark);
}

/**
 * Applies the persisted theme preference to <html>
 * and keeps it synchronized with the operating system.
 */
export function useThemeSync() {
  const { data, hydrated } = useBixbo();
  const theme: ThemeChoice = data.settings.theme ?? "system";

  useEffect(() => {
    if (!hydrated) return;
    applyThemeChoice(theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // React may not have removed this listener yet on the exact frame where
      // the user switches from System to Light/Dark. The root marker makes the
      // explicit user choice authoritative even during that race window.
      if (document.documentElement.dataset.themeChoice !== "system") return;
      applyThemeChoice("system");
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    // Older Safari fallback.
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [theme]);
}
