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

import appCss from "../styles.css?url";
import whiteGreenThemeCss from "../white-green-theme.css?url";
import darkThemeCss from "../dark-theme.css?url";
import calendarPeriodFixCss from "../calendar-period-fix.css?url";
import iosTouchStabilityCss from "../ios-touch-stability.css?url";
import patternsRestoreCss from "../patterns-restore.css?url";
import { useCloudSync } from "../lib/cloudSync";
import { useThemeSync } from "../lib/theme";
import { useNotificationRuntime } from "../lib/notifications";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { AppPrivacyGuard } from "../components/AppPrivacyGuard";
import { Toaster } from "../components/ui/sonner";
import { useI18n } from "@/hooks/useI18n";
import { useDeploymentFreshness } from "@/lib/deploymentFreshness";

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

    // Samsung Internet can cache the document backing canvas before the later
    // theme stylesheets have painted. Lock the very first root frame to the
    // actual BIXBO canvas so rubber-band overscroll never exposes the obsolete
    // olive fallback colour.
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

function NotFoundComponent() {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    void router.navigate({ to: "/", replace: true });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-surface p-6 text-center shadow-sm ring-1 ring-border/70 sm:p-8">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("Page not found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-surface p-6 text-center shadow-sm ring-1 ring-border/70 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Try again</button>
          <a href="/" className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
      { rel: "stylesheet", href: whiteGreenThemeCss },
      { rel: "stylesheet", href: darkThemeCss },
      { rel: "stylesheet", href: calendarPeriodFixCss },
      { rel: "stylesheet", href: iosTouchStabilityCss },
      { rel: "stylesheet", href: patternsRestoreCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FBF7F3" />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <HeadContent />
      </head>
      <body data-bixbo-app-root>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useCloudSync();
  useThemeSync();
  useNotificationRuntime();
  useDeploymentFreshness();

  return (
    <QueryClientProvider client={queryClient}>
      <AppPrivacyGuard><Outlet /></AppPrivacyGuard>
      <NotificationPrompt />
      <Toaster />
    </QueryClientProvider>
  );
}
