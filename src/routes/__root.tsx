import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import themeSystemCss from "../theme-system.css?url";
import calendarSystemCss from "../calendar-system.css?url";
import deviceRenderingFixesCss from "../device-rendering-fixes.css?url";
import { useCloudSync } from "../lib/cloudSync";
import { useThemeSync } from "../lib/theme";
import { useNotificationRuntime } from "../lib/notifications";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { AppPrivacyGuard } from "../components/AppPrivacyGuard";
import { DiagnosticProfiler } from "../components/DiagnosticProfiler";
import { Toaster } from "../components/ui/sonner";
import { useI18n } from "@/hooks/useI18n";
import { clearStaleAssetRecoveryGuard, recoverFromStaleAssetError } from "@/lib/staleAssetRecovery";
import { installRuntimeDiagnostics, recordRuntimeDiagnosticIssue } from "@/lib/appDiagnostics";

const THEME_BOOTSTRAP_SCRIPT = `(() => {
  try {
    const root = document.documentElement;
    const valid = (value) => value === "light" || value === "dark" || value === "system";
    let choice = localStorage.getItem("bixbo:theme-choice");
    if (!valid(choice)) {
      const raw = localStorage.getItem("bixbo:v2") || localStorage.getItem("bixbo:v1");
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          const storedTheme = stored && stored.settings && stored.settings.theme;
          if (valid(storedTheme)) choice = storedTheme;
        } catch {}
      }
    }
    if (!valid(choice)) choice = "system";
    localStorage.setItem("bixbo:theme-choice", choice);
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = choice === "dark" || (choice === "system" && systemDark);
    const canvas = isDark ? "#171A14" : "#FBF7F3";
    const isSamsungInternet = /SamsungBrowser\\//i.test(navigator.userAgent || "");
    root.dataset.themeChoice = choice;
    root.dataset.theme = isDark ? "dark" : "light";
    root.dataset.browser = isSamsungInternet ? "samsung-internet" : "other";
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "only light";
    root.style.background = canvas;
    root.style.setProperty("background-color", canvas, "important");
    const syncBodyCanvas = () => {
      if (!document.body) return;
      document.body.style.background = canvas;
      document.body.style.setProperty("background-color", canvas, "important");
    };
    if (document.body) syncBodyCanvas();
    else document.addEventListener("DOMContentLoaded", syncBodyCanvas, { once: true });
    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (colorSchemeMeta) colorSchemeMeta.setAttribute("content", isDark ? "dark" : "only light");
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.setAttribute("content", canvas);
  } catch {}
})();`;

const APPLE_PWA_LAUNCH_SPLASH_CSS = `
  #bixbo-ios-launch-splash {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    pointer-events: none;
    background: #FBF7F3;
    opacity: 1;
  }
  html[data-theme="dark"] #bixbo-ios-launch-splash { background: #171A14; }
  html[data-bixbo-pwa-launch="visible"] #bixbo-ios-launch-splash,
  html[data-bixbo-pwa-launch="hiding"] #bixbo-ios-launch-splash { display: flex; }
  html[data-bixbo-pwa-launch="hiding"] #bixbo-ios-launch-splash { animation: bixbo-ios-launch-splash-hide 240ms ease-out forwards; }
  #bixbo-ios-launch-splash img {
    width: 160px;
    height: 160px;
    object-fit: contain;
    filter: drop-shadow(0 10px 18px rgba(57, 70, 43, 0.16));
  }
  @keyframes bixbo-ios-launch-splash-hide { to { opacity: 0; visibility: hidden; } }
`;

const APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP = `(() => {
  try {
    const root = document.documentElement;
    const nav = window.navigator;
    const standalone = Boolean(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || nav.standalone === true;
    if (!standalone) return;
    root.dataset.bixboPwaLaunch = "visible";
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      window.setTimeout(() => {
        root.dataset.bixboPwaLaunch = "hiding";
        window.setTimeout(() => { delete root.dataset.bixboPwaLaunch; }, 260);
      }, 1000);
    };
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide, { once: true });
    window.setTimeout(hide, 3500);
  } catch {}
})();`;

function NotFoundComponent() {
  const { t } = useI18n();
  const router = useRouter();
  useEffect(() => { void router.navigate({ to: "/", replace: true }); }, [router]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-md rounded-3xl border border-border/70 bg-surface p-6 text-center shadow-sm ring-1 ring-border/70 sm:p-8"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">{t("Page not found")}</h2><p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p><div className="mt-6"><Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Go home</Link></div></div></div>;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  useEffect(() => { const recovered = recoverFromStaleAssetError(error); if (!recovered) recordRuntimeDiagnosticIssue("route", error); }, [error]);
  const retry = () => { clearStaleAssetRecoveryGuard(); reset(); window.location.reload(); };
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-md rounded-3xl border border-border/70 bg-surface p-6 text-center shadow-sm ring-1 ring-border/70 sm:p-8"><h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1><p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={retry} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Try again</button><Link to="/diagnostics" className="inline-flex items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15">App scan</Link><Link to="/" className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">Go home</Link></div></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "BIXBO — Health diary" },
      { name: "description", content: "BIXBO — a calm diary for your cycle, pain, meds and notes." },
      { name: "author", content: "BIXBO" },
      { name: "apple-mobile-web-app-title", content: "BIXBO" },
      { name: "application-name", content: "BIXBO" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "BIXBO — Health diary" },
      { property: "og:description", content: "A calm diary for your cycle, pain, meds and notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: themeSystemCss },
      { rel: "stylesheet", href: calendarSystemCss },
      { rel: "stylesheet", href: deviceRenderingFixesCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-startup-image", href: "/apple-launch-bixbo.png?v=1" },
      { rel: "preload", as: "image", href: "/bixbo-mascot-user.png?v=20260816-launch2" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><head><meta name="theme-color" content="#FBF7F3" /><meta name="color-scheme" content="light dark" /><script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} /><style dangerouslySetInnerHTML={{ __html: APPLE_PWA_LAUNCH_SPLASH_CSS }} /><script dangerouslySetInnerHTML={{ __html: APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP }} /><HeadContent /></head><body data-bixbo-app-root><div id="bixbo-ios-launch-splash" aria-hidden="true"><img src="/bixbo-mascot-user.png?v=20260816-launch2" alt="" fetchPriority="high" /></div>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useCloudSync(); useThemeSync(); useNotificationRuntime();
  useEffect(() => installRuntimeDiagnostics((issue) => { toast.error("BIXBO detected an app error", { description: `${issue.area}: ${issue.message}`, action: { label: "App scan", onClick: () => void router.navigate({ to: "/diagnostics" }) } }); }), [router]);
  return <QueryClientProvider client={queryClient}><AppPrivacyGuard><DiagnosticProfiler id="RouteTree"><Outlet /></DiagnosticProfiler></AppPrivacyGuard><NotificationPrompt /><Toaster /></QueryClientProvider>;
}
