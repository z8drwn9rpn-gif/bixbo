type StoredPerformanceIssue = {
  id?: string;
  at?: number;
  kind?: string;
  message?: string;
  durationMs?: number;
  context?: string;
  timeline?: string[];
};

type BaselineStore = Record<string, number[]>;

const ISSUE_KEY = "bixbo:runtime-diagnostics:v1";
const BASELINE_KEY = "bixbo:flight-baselines:v1";
const LIFECYCLE_GUARD_WINDOW_MS = 3_000;
const IMPOSSIBLE_ROUTE_SETTLE_MS = 30_000;
const CONTAMINATED_STARTUP_GAP_MS = 3_000;
const UNCORROBORATED_IOS_HEARTBEAT_GAP_MS = 30_000;
const MAX_TRUSTED_BASELINE_SAMPLE_MS = 10_000;

let lifecycleTransitionAt = 0;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Forensics are best effort. The normal diagnostics scan checks storage separately.
  }
}

function isIosStandalonePwa(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean; maxTouchPoints?: number };
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1);
  const standalone = nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
  return ios && standalone;
}

function issueHasLifecycleEvidence(issue: StoredPerformanceIssue): boolean {
  const evidence = [issue.context ?? "", ...(Array.isArray(issue.timeline) ? issue.timeline : [])]
    .join(" ")
    .toLowerCase();
  return evidence.includes("visibility · hidden")
    || evidence.includes("visibility=hidden")
    || evidence.includes("pagehide")
    || evidence.includes("pageshow")
    || evidence.includes("restored-from-bfcache")
    || evidence.includes("browser-lifecycle");
}

export function isLifecycleContaminatedPerformanceIssue(
  issue: StoredPerformanceIssue,
  transitionAt = lifecycleTransitionAt,
  iosStandalone = false,
): boolean {
  if (!issue || (issue.kind !== "freeze" && issue.kind !== "jank")) return false;
  const duration = typeof issue.durationMs === "number" && Number.isFinite(issue.durationMs) ? issue.durationMs : 0;
  const message = issue.message ?? "";
  const at = typeof issue.at === "number" && Number.isFinite(issue.at) ? issue.at : 0;
  const closeToLifecycleTransition = transitionAt > 0 && at > 0 && Math.abs(at - transitionAt) <= LIFECYCLE_GUARD_WINDOW_MS;

  if (/^Route .* settled in /i.test(message)) {
    // A route cannot legitimately spend tens of seconds between two animation frames.
    // iOS pauses requestAnimationFrame while a standalone PWA is backgrounded, which
    // previously made the suspended time look like route rendering time.
    return duration >= IMPOSSIBLE_ROUTE_SETTLE_MS || closeToLifecycleTransition;
  }

  if (/^Startup frame gap of about /i.test(message)) {
    // Startup RAF gaps are only invalidated when lifecycle evidence exists or the
    // callback landed immediately around a visibility/pageshow transition.
    return closeToLifecycleTransition || (duration >= CONTAMINATED_STARTUP_GAP_MS && issueHasLifecycleEvidence(issue));
  }

  if (/^Main thread stalled for about /i.test(message)) {
    // iOS standalone can suspend JavaScript without first changing
    // document.visibilityState. A timer callback then resumes tens of seconds
    // later while the document still says "visible". Timer delay alone cannot
    // prove that JavaScript blocked the foreground UI for that whole interval.
    // Keep normal 1-30 s freeze evidence, but discard only the extreme timer-only
    // gap class seen when the OS freezes the PWA process.
    return iosStandalone && duration >= UNCORROBORATED_IOS_HEARTBEAT_GAP_MS;
  }

  return false;
}

export function sanitizeLifecyclePerformanceArtifacts(transitionAt = lifecycleTransitionAt): void {
  if (typeof window === "undefined") return;

  const iosStandalone = isIosStandalonePwa();
  const rawIssues = readJson<unknown>(ISSUE_KEY, []);
  if (Array.isArray(rawIssues)) {
    const filtered = rawIssues.filter((value) => {
      if (!value || typeof value !== "object") return true;
      return !isLifecycleContaminatedPerformanceIssue(value as StoredPerformanceIssue, transitionAt, iosStandalone);
    });
    if (filtered.length !== rawIssues.length) writeJson(ISSUE_KEY, filtered);
  }

  const rawBaselines = readJson<unknown>(BASELINE_KEY, {});
  if (rawBaselines && typeof rawBaselines === "object" && !Array.isArray(rawBaselines)) {
    let changed = false;
    const next: BaselineStore = {};
    for (const [key, value] of Object.entries(rawBaselines as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const samples = value.filter((sample): sample is number =>
        typeof sample === "number" && Number.isFinite(sample) && sample >= 0 && sample < MAX_TRUSTED_BASELINE_SAMPLE_MS,
      );
      if (samples.length !== value.length) changed = true;
      next[key] = samples.slice(-24);
    }
    if (changed) writeJson(BASELINE_KEY, next);
  }
}

export function installLifecyclePerformanceGuard(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;

  const timers = new Set<number>();
  let rafA = 0;
  let rafB = 0;

  const scheduleSanitize = () => {
    sanitizeLifecyclePerformanceArtifacts();
    rafA = window.requestAnimationFrame(() => {
      sanitizeLifecyclePerformanceArtifacts();
      rafB = window.requestAnimationFrame(() => sanitizeLifecyclePerformanceArtifacts());
    });
    for (const delay of [250, 1_000, 2_500]) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        sanitizeLifecyclePerformanceArtifacts();
      }, delay);
      timers.add(id);
    }
  };

  const onLifecycleTransition = () => {
    lifecycleTransitionAt = Date.now();
    scheduleSanitize();
  };

  // Clean up already-recorded WebKit lifecycle false positives immediately.
  sanitizeLifecyclePerformanceArtifacts(0);

  document.addEventListener("visibilitychange", onLifecycleTransition);
  window.addEventListener("pageshow", onLifecycleTransition);
  window.addEventListener("pagehide", onLifecycleTransition);

  // Backstop for incidents written by the legacy forensic recorder after its own
  // delayed RAF/timer callback returns from an iOS background suspension.
  const intervalId = window.setInterval(() => sanitizeLifecyclePerformanceArtifacts(), 2_000);

  return () => {
    document.removeEventListener("visibilitychange", onLifecycleTransition);
    window.removeEventListener("pageshow", onLifecycleTransition);
    window.removeEventListener("pagehide", onLifecycleTransition);
    window.clearInterval(intervalId);
    if (rafA) window.cancelAnimationFrame(rafA);
    if (rafB) window.cancelAnimationFrame(rafB);
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  };
}
