import { recordRuntimeDiagnosticIssue } from "./appDiagnostics";

type LayoutShiftSource = {
  node?: Node | null;
  previousRect?: DOMRectReadOnly;
  currentRect?: DOMRectReadOnly;
};

type LayoutShiftWithSources = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
  sources?: LayoutShiftSource[];
};

type WindowWithVisualForensics = Window & {
  __bixboVisualForensicsV1?: boolean;
};

const SLOW_LOCAL_TAP_MS = 350;
const SLOW_NAVIGATION_TAP_MS = 600;
const CRITICAL_TAP_MS = 1_200;
const SLOW_APP_OPEN_MS = 1_500;
const CRITICAL_APP_OPEN_MS = 3_000;
const SLOW_APP_RESUME_MS = 700;
const CRITICAL_APP_RESUME_MS = 2_000;
const NAVIGATION_WATCHDOG_MS = 5_000;

function compact(value: string, limit = 120): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function actionableElement(node: Node | null | undefined): Element | null {
  if (!(node instanceof Element)) return null;
  return node.closest("a[href],button,[data-bixbo-nav-id],[role='button']") ?? node;
}

function safeElementLabel(node: Node | null | undefined): string {
  const element = actionableElement(node);
  if (!element) return "unknown element";
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${compact(element.id, 40)}` : "";
  const testId = element.getAttribute("data-testid");
  const role = element.getAttribute("role");
  const aria = element.getAttribute("aria-label");
  const title = element.getAttribute("title");
  const navId = element.getAttribute("data-bixbo-nav-id");
  const navTarget = element.getAttribute("data-bixbo-nav-target");
  const safeName = testId || aria || title;
  return [
    tag,
    id,
    role ? `role=${compact(role, 30)}` : "",
    navId ? `nav=${compact(navId, 30)}` : "",
    navTarget ? `target=${compact(navTarget, 60)}` : "",
    safeName ? `label=${compact(safeName, 60)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function sameOriginNavigationDestination(node: Node | null | undefined): string | null {
  const element = actionableElement(node);
  if (!element) return null;
  const explicitTarget = element.getAttribute("data-bixbo-nav-target");
  const anchor = element.matches("a[href]") ? element as HTMLAnchorElement : element.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) {
    return explicitTarget?.startsWith("/") ? explicitTarget : null;
  }
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return explicitTarget?.startsWith("/") ? explicitTarget : null;
  }
}

function currentNavigationLocation(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function afterTwoAnimationFrames(callback: () => void): void {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

function rectDelta(source: LayoutShiftSource): string {
  const before = source.previousRect;
  const after = source.currentRect;
  if (!before || !after) return "geometry unavailable";
  const dx = Math.round(after.x - before.x);
  const dy = Math.round(after.y - before.y);
  const dw = Math.round(after.width - before.width);
  const dh = Math.round(after.height - before.height);
  return `Δx=${dx}px Δy=${dy}px Δw=${dw}px Δh=${dh}px`;
}

function installLayoutShiftSourceForensics(): void {
  if (typeof PerformanceObserver === "undefined") return;
  const supported = (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] }).supportedEntryTypes ?? [];
  if (!supported.includes("layout-shift")) return;

  const observer = new PerformanceObserver((list) => {
    if (document.visibilityState !== "visible" || window.location.pathname.startsWith("/diagnostics")) return;
    for (const raw of list.getEntries()) {
      const entry = raw as LayoutShiftWithSources;
      const value = entry.value ?? 0;
      if (entry.hadRecentInput || value < 0.12) continue;
      const sources = (entry.sources ?? []).slice(0, 4);
      const evidence = sources.length
        ? sources.map((source) => `${safeElementLabel(source.node)} (${rectDelta(source)})`).join(" · ")
        : "Browser did not expose source nodes for this layout shift.";
      recordRuntimeDiagnosticIssue(
        "jank",
        `Unexpected layout shift ${value.toFixed(3)} was traced to ${sources.length || "unknown"} visual source${sources.length === 1 ? "" : "s"}.`,
        {
          severity: value >= 0.35 ? "error" : "warning",
          context: `Visual source forensics: ${evidence}. No text-node contents or form values were captured.`,
        },
      );
    }
  });
  observer.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
}

function measureNavigationTap(pointerAt: number, label: string, destination: string): void {
  const source = currentNavigationLocation();
  if (destination === source) return;
  const deadline = performance.now() + NAVIGATION_WATCHDOG_MS;

  const waitForRouteChange = () => {
    if (document.visibilityState !== "visible" || window.location.pathname.startsWith("/diagnostics")) return;
    const current = currentNavigationLocation();
    if (current !== source) {
      const routeChangedAt = performance.now();
      afterTwoAnimationFrames(() => {
        const paintedAt = performance.now();
        const latency = paintedAt - pointerAt;
        if (latency < SLOW_NAVIGATION_TAP_MS) return;
        const routeChangeMs = routeChangedAt - pointerAt;
        const paintAfterRouteMs = paintedAt - routeChangedAt;
        recordRuntimeDiagnosticIssue(
          "interaction",
          `Navigation tap-to-paint latency was about ${Math.round(latency)} ms after ${label}.`,
          {
            durationMs: latency,
            severity: latency >= CRITICAL_TAP_MS ? "error" : "warning",
            context: `Interaction source: ${label}. Expected destination ${destination}. Route ${source} → ${current}. Pointer-to-route-change ${Math.round(routeChangeMs)} ms · route-change-to-second-paint ${Math.round(paintAfterRouteMs)} ms.`,
          },
        );
      });
      return;
    }

    if (performance.now() >= deadline) {
      const latency = performance.now() - pointerAt;
      recordRuntimeDiagnosticIssue(
        "interaction",
        `Tap on ${label} did not produce the expected route response within about ${Math.round(latency)} ms.`,
        {
          durationMs: latency,
          severity: "error",
          context: `Interaction source: ${label}. Expected same-origin destination ${destination} from ${source}; no route change was observed before the ${NAVIGATION_WATCHDOG_MS} ms watchdog expired.`,
        },
      );
      return;
    }

    window.requestAnimationFrame(waitForRouteChange);
  };

  window.requestAnimationFrame(waitForRouteChange);
}

function installTapToPaintForensics(): void {
  let lastPointerAt = 0;
  let lastPointerTarget: EventTarget | null = null;

  window.addEventListener("pointerdown", (event) => {
    if (window.location.pathname.startsWith("/diagnostics")) return;
    lastPointerAt = performance.now();
    lastPointerTarget = event.target;
  }, true);

  window.addEventListener("click", (event) => {
    if (window.location.pathname.startsWith("/diagnostics") || document.visibilityState !== "visible") return;
    const target = event.target ?? lastPointerTarget;
    const targetNode = target instanceof Node ? target : null;
    const pointerAt = lastPointerAt || performance.now();
    const label = safeElementLabel(targetNode);
    const navigationDestination = sameOriginNavigationDestination(targetNode);

    lastPointerAt = 0;
    lastPointerTarget = null;

    if (navigationDestination) {
      measureNavigationTap(pointerAt, label, navigationDestination);
      return;
    }

    afterTwoAnimationFrames(() => {
      const latency = performance.now() - pointerAt;
      if (latency < SLOW_LOCAL_TAP_MS) return;
      recordRuntimeDiagnosticIssue(
        "interaction",
        `Tap-to-paint latency was about ${Math.round(latency)} ms after ${label}.`,
        {
          durationMs: latency,
          severity: latency >= CRITICAL_TAP_MS ? "error" : "warning",
          context: `Interaction source: ${label}. Measurement spans pointer-down to the second animation frame after click, helping distinguish a sluggish control from general background work.`,
        },
      );
    });
  }, true);
}

function installAppOpenForensics(): void {
  if (window.location.pathname.startsWith("/diagnostics")) return;

  afterTwoAnimationFrames(() => {
    if (document.visibilityState !== "visible") return;
    const latency = performance.now();
    if (latency < SLOW_APP_OPEN_MS) return;
    recordRuntimeDiagnosticIssue(
      latency >= CRITICAL_APP_OPEN_MS ? "freeze" : "jank",
      `App open-to-paint latency was about ${Math.round(latency)} ms.`,
      {
        durationMs: latency,
        severity: latency >= CRITICAL_APP_OPEN_MS ? "error" : "warning",
        context: "Startup responsiveness measured from browser navigation start to the second animation frame after the BIXBO app shell loaded. This persists into App Scan so slow launches remain visible after startup completes.",
      },
    );
  });

  let hiddenAt = document.visibilityState === "hidden" ? performance.now() : 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = performance.now();
      return;
    }
    if (!hiddenAt || window.location.pathname.startsWith("/diagnostics")) return;

    const visibleAt = performance.now();
    const hiddenFor = visibleAt - hiddenAt;
    hiddenAt = 0;
    if (hiddenFor < 1_000) return;

    afterTwoAnimationFrames(() => {
      const latency = performance.now() - visibleAt;
      if (latency < SLOW_APP_RESUME_MS) return;
      recordRuntimeDiagnosticIssue(
        latency >= CRITICAL_APP_RESUME_MS ? "freeze" : "jank",
        `App resume-to-paint latency was about ${Math.round(latency)} ms after returning to BIXBO.`,
        {
          durationMs: latency,
          severity: latency >= CRITICAL_APP_RESUME_MS ? "error" : "warning",
          context: `Resume responsiveness measured from visibility returning to the second animation frame after BIXBO became visible. The app had been hidden for about ${Math.round(hiddenFor)} ms.`,
        },
      );
    });
  });
}

function installVisualForensics(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const marked = window as WindowWithVisualForensics;
  if (marked.__bixboVisualForensicsV1) return;
  marked.__bixboVisualForensicsV1 = true;

  installLayoutShiftSourceForensics();
  installTapToPaintForensics();
  installAppOpenForensics();
}

installVisualForensics();

export { installVisualForensics };
