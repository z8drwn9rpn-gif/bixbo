import { recordRuntimeDiagnosticIssue, type RuntimeDiagnosticIssue } from "./appDiagnostics";
import { installLifecyclePerformanceGuard } from "./lifecyclePerformanceGuard";
import { recoverFromStaleAssetError } from "./staleAssetRecovery";

const HEARTBEAT_INTERVAL_MS = 500;
const FREEZE_THRESHOLD_MS = 1_200;
const FRAME_GAP_MIN_MS = 250;
const FRAME_GAP_MAX_MS = 1_200;
const FRAME_GAP_CLUSTER_WINDOW_MS = 2_000;
const FRAME_GAP_EVIDENCE_COUNT = 2;

function resourceUrlForTarget(target: EventTarget | null): string | null {
  if (target instanceof HTMLScriptElement) return target.src || null;
  if (target instanceof HTMLLinkElement) {
    const rel = target.rel.toLowerCase();
    if (rel === "stylesheet" || rel === "modulepreload" || rel === "preload") return target.href || null;
  }
  return null;
}

/**
 * Installs the live runtime recorder used by the app shell.
 *
 * A single requestAnimationFrame gap is not enough evidence of app jank on iOS:
 * WebKit can pause delivery around PWA lifecycle, compositing and OS scheduling.
 * We therefore require two qualifying visible gaps in a short window before a
 * FRAME / LAYOUT incident is persisted. Long tasks, freezes and slow user
 * interactions are still recorded independently as direct evidence.
 */
export function installRuntimeDiagnostics(onIssue?: (issue: RuntimeDiagnosticIssue) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const cleanupLifecycleGuard = installLifecyclePerformanceGuard();

  const onError = (event: ErrorEvent) => {
    const error = event.error ?? event.message;
    if (recoverFromStaleAssetError(error)) return;
    const issue = recordRuntimeDiagnosticIssue("error", error);
    if (issue) onIssue?.(issue);
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (recoverFromStaleAssetError(event.reason)) return;
    const issue = recordRuntimeDiagnosticIssue("unhandledrejection", event.reason);
    if (issue) onIssue?.(issue);
  };

  const onResourceError = (event: Event) => {
    const url = resourceUrlForTarget(event.target);
    if (!url) return;
    recordRuntimeDiagnosticIssue("resource", `Failed to load app resource: ${url}`);
  };

  const onOffline = () => {
    recordRuntimeDiagnosticIssue("network", "Device went offline while BIXBO was open.", { severity: "warning" });
  };

  let heartbeatExpected = performance.now() + HEARTBEAT_INTERVAL_MS;
  let lastFrame = performance.now();
  let rafId = 0;
  let lastQualifyingFrameGapAt = 0;
  let qualifyingFrameGapCount = 0;
  let worstClusterFrameGap = 0;
  let longTaskObserver: PerformanceObserver | null = null;
  let eventObserver: PerformanceObserver | null = null;

  const resetPerformanceClocks = () => {
    const now = performance.now();
    heartbeatExpected = now + HEARTBEAT_INTERVAL_MS;
    lastFrame = now;
    lastQualifyingFrameGapAt = 0;
    qualifyingFrameGapCount = 0;
    worstClusterFrameGap = 0;
  };

  const heartbeatId = window.setInterval(() => {
    const now = performance.now();
    const lag = now - heartbeatExpected;
    heartbeatExpected = now + HEARTBEAT_INTERVAL_MS;
    if (document.visibilityState !== "visible" || lag < FREEZE_THRESHOLD_MS) return;
    recordRuntimeDiagnosticIssue(
      "freeze",
      `Main thread stalled for about ${Math.round(lag)} ms. Scrolling, taps or screen changes may have appeared frozen.`,
      { durationMs: lag, severity: lag >= 3_000 ? "error" : "warning" },
    );
  }, HEARTBEAT_INTERVAL_MS);

  const watchFrames = (now: number) => {
    const gap = now - lastFrame;
    lastFrame = now;

    if (document.visibilityState === "visible" && gap >= FRAME_GAP_MIN_MS && gap < FRAME_GAP_MAX_MS) {
      const sameCluster = lastQualifyingFrameGapAt > 0 && now - lastQualifyingFrameGapAt <= FRAME_GAP_CLUSTER_WINDOW_MS;
      qualifyingFrameGapCount = sameCluster ? qualifyingFrameGapCount + 1 : 1;
      lastQualifyingFrameGapAt = now;
      worstClusterFrameGap = sameCluster ? Math.max(worstClusterFrameGap, gap) : gap;

      if (qualifyingFrameGapCount >= FRAME_GAP_EVIDENCE_COUNT) {
        recordRuntimeDiagnosticIssue(
          "jank",
          `Repeated visible frame gaps detected; worst gap was about ${Math.round(worstClusterFrameGap)} ms. The app may have visibly skipped or stuttered.`,
          { durationMs: worstClusterFrameGap },
        );
        qualifyingFrameGapCount = 0;
        lastQualifyingFrameGapAt = 0;
        worstClusterFrameGap = 0;
      }
    }

    rafId = window.requestAnimationFrame(watchFrames);
  };
  rafId = window.requestAnimationFrame(watchFrames);

  const supportedEntries = typeof PerformanceObserver === "undefined"
    ? []
    : (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] }).supportedEntryTypes ?? [];

  if (supportedEntries.includes("longtask")) {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < 200 || document.visibilityState !== "visible") continue;
        recordRuntimeDiagnosticIssue(
          "longtask",
          `A JavaScript main-thread task blocked the app for about ${Math.round(entry.duration)} ms.`,
          { durationMs: entry.duration, severity: entry.duration >= 1_000 ? "error" : "warning" },
        );
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
  }

  if (supportedEntries.includes("event")) {
    eventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < 300 || document.visibilityState !== "visible") continue;
        recordRuntimeDiagnosticIssue(
          "interaction",
          `${entry.name || "User interaction"} took about ${Math.round(entry.duration)} ms to process.`,
          { durationMs: entry.duration, severity: entry.duration >= 1_000 ? "error" : "warning" },
        );
      }
    });
    eventObserver.observe({ type: "event", buffered: true, durationThreshold: 200 } as PerformanceObserverInit);
  }

  window.addEventListener("error", onError);
  window.addEventListener("error", onResourceError, true);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("offline", onOffline);
  window.addEventListener("pageshow", resetPerformanceClocks);
  document.addEventListener("visibilitychange", resetPerformanceClocks);

  return () => {
    cleanupLifecycleGuard();
    window.removeEventListener("error", onError);
    window.removeEventListener("error", onResourceError, true);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("pageshow", resetPerformanceClocks);
    document.removeEventListener("visibilitychange", resetPerformanceClocks);
    window.clearInterval(heartbeatId);
    window.cancelAnimationFrame(rafId);
    longTaskObserver?.disconnect();
    eventObserver?.disconnect();
  };
}
