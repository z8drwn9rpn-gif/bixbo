import { getBixbo } from "./storage";
import { recoverFromStaleAssetError } from "./staleAssetRecovery";
import { supabase } from "@/integrations/supabase/client";

export type DiagnosticStatus = "ok" | "warning" | "error";

export type DiagnosticResult = {
  id: string;
  area: string;
  status: DiagnosticStatus;
  title: string;
  detail: string;
};

export type RuntimeDiagnosticKind =
  | "error"
  | "unhandledrejection"
  | "route"
  | "resource"
  | "freeze"
  | "jank"
  | "longtask"
  | "interaction"
  | "network";

export type RuntimeDiagnosticIssue = {
  id: string;
  at: number;
  kind: RuntimeDiagnosticKind;
  severity?: "warning" | "error";
  area: string;
  message: string;
  path: string;
  durationMs?: number;
  context?: string;
};

export type AppDiagnosticReport = {
  startedAt: number;
  finishedAt: number;
  results: DiagnosticResult[];
  runtimeIssues: RuntimeDiagnosticIssue[];
};

export type RoutePreloader = (path: string) => Promise<void>;

const RUNTIME_ERROR_KEY = "bixbo:runtime-diagnostics:v1";
const MAX_RUNTIME_ERRORS = 50;
const RECENT_RUNTIME_WINDOW_MS = 6 * 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 30_000;
const ERROR_KINDS = new Set<RuntimeDiagnosticKind>(["error", "unhandledrejection", "route", "resource"]);
const PERFORMANCE_KINDS = new Set<RuntimeDiagnosticKind>(["freeze", "jank", "longtask", "interaction"]);

export const DIAGNOSTIC_ROUTES = [
  ["Home", "/"],
  ["Profile", "/profile"],
  ["Notifications", "/notifications"],
  ["Medications", "/meds"],
  ["Insights", "/insights"],
  ["Patterns", "/patterns"],
  ["Notes", "/notes"],
  ["Couple", "/couple"],
  ["Report", "/report"],
  ["Settings", "/settings"],
  ["Pregnancy", "/pregnancy"],
  ["Postpartum", "/postpartum"],
  ["Sign in", "/auth"],
  ["Admin", "/admin"],
] as const;

function compactMessage(value: unknown): string {
  let raw = "Unknown application error";
  if (value instanceof Error) raw = `${value.name}: ${value.message}`;
  else if (typeof value === "string") raw = value;
  else if (value && typeof value === "object" && "message" in value) raw = String((value as { message?: unknown }).message ?? raw);
  else if (value != null) raw = String(value);

  return raw
    .replace(/https?:\/\/[^\s)]+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return "[url]";
      }
    })
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 420);
}

function areaForPath(pathname: string): string {
  const path = pathname.toLowerCase();
  if (path.startsWith("/notifications")) return "Notifications";
  if (path.startsWith("/profile")) return "Profile";
  if (path.startsWith("/insights")) return "Insights";
  if (path.startsWith("/patterns")) return "Patterns";
  if (path.startsWith("/notes")) return "Notes";
  if (path.startsWith("/meds")) return "Medications";
  if (path.startsWith("/couple")) return "Couple";
  if (path.startsWith("/report")) return "Report";
  if (path.startsWith("/pregnancy")) return "Pregnancy";
  if (path.startsWith("/postpartum")) return "Postpartum";
  if (path.startsWith("/admin")) return "Admin";
  if (path.startsWith("/auth")) return "Sign in";
  return path === "/" ? "Home" : "Application";
}

type NavigatorDiagnostics = Navigator & {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
    saveData?: boolean;
  };
};

function runtimeContext(): string {
  if (typeof navigator === "undefined" || typeof document === "undefined") return "";
  const nav = navigator as NavigatorDiagnostics;
  const connection = nav.connection;
  const parts = [
    `visibility=${document.visibilityState}`,
    `online=${navigator.onLine !== false ? "yes" : "no"}`,
  ];
  if (typeof nav.hardwareConcurrency === "number") parts.push(`cpu=${nav.hardwareConcurrency}`);
  if (typeof nav.deviceMemory === "number") parts.push(`memory=${nav.deviceMemory}GB`);
  if (connection?.effectiveType) parts.push(`network=${connection.effectiveType}`);
  if (typeof connection?.rtt === "number") parts.push(`rtt=${connection.rtt}ms`);
  if (typeof connection?.downlink === "number") parts.push(`downlink=${connection.downlink}Mbps`);
  if (connection?.saveData) parts.push("save-data=yes");
  return parts.join(", ");
}

function readRuntimeIssuesRaw(): RuntimeDiagnosticIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RUNTIME_ERROR_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RuntimeDiagnosticIssue => {
      if (!item || typeof item !== "object") return false;
      const row = item as Partial<RuntimeDiagnosticIssue>;
      return typeof row.id === "string" && typeof row.at === "number" && typeof row.message === "string" && typeof row.path === "string";
    });
  } catch {
    return [];
  }
}

export function getRuntimeDiagnosticIssues(): RuntimeDiagnosticIssue[] {
  return readRuntimeIssuesRaw().sort((a, b) => b.at - a.at);
}

export function clearRuntimeDiagnosticIssues(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RUNTIME_ERROR_KEY);
  } catch {
  }
}

function defaultSeverity(kind: RuntimeDiagnosticKind): "warning" | "error" {
  return ERROR_KINDS.has(kind) ? "error" : "warning";
}

export function recordRuntimeDiagnosticIssue(
  kind: RuntimeDiagnosticKind,
  error: unknown,
  options?: {
    area?: string;
    path?: string;
    severity?: "warning" | "error";
    durationMs?: number;
    context?: string;
  },
): RuntimeDiagnosticIssue | null {
  if (typeof window === "undefined") return null;

  const path = options?.path ?? `${window.location.pathname}${window.location.search}`;
  const area = options?.area ?? areaForPath(window.location.pathname);
  const message = compactMessage(error);
  const now = Date.now();
  const previous = readRuntimeIssuesRaw();
  const duplicate = previous.find((issue) => {
    if (issue.kind !== kind || issue.path !== path || now - issue.at >= DEDUPE_WINDOW_MS) return false;
    return PERFORMANCE_KINDS.has(kind) || issue.message === message;
  });
  if (duplicate) return duplicate;

  const issue: RuntimeDiagnosticIssue = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    kind,
    severity: options?.severity ?? defaultSeverity(kind),
    area,
    message,
    path,
    ...(typeof options?.durationMs === "number" ? { durationMs: Math.round(options.durationMs) } : {}),
    context: options?.context ?? runtimeContext(),
  };

  try {
    window.localStorage.setItem(RUNTIME_ERROR_KEY, JSON.stringify([issue, ...previous].slice(0, MAX_RUNTIME_ERRORS)));
  } catch {
  }

  return issue;
}

function resourceUrlForTarget(target: EventTarget | null): string | null {
  if (target instanceof HTMLScriptElement) return target.src || null;
  if (target instanceof HTMLLinkElement) {
    const rel = target.rel.toLowerCase();
    if (rel === "stylesheet" || rel === "modulepreload" || rel === "preload") return target.href || null;
  }
  return null;
}

export function installRuntimeDiagnostics(onIssue?: (issue: RuntimeDiagnosticIssue) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

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

  let heartbeatExpected = performance.now() + 500;
  let lastFrame = performance.now();
  let rafId = 0;
  let longTaskObserver: PerformanceObserver | null = null;
  let eventObserver: PerformanceObserver | null = null;

  const resetPerformanceClocks = () => {
    heartbeatExpected = performance.now() + 500;
    lastFrame = performance.now();
  };

  const heartbeatId = window.setInterval(() => {
    const now = performance.now();
    const lag = now - heartbeatExpected;
    heartbeatExpected = now + 500;
    if (document.visibilityState !== "visible" || lag < 1_200) return;
    recordRuntimeDiagnosticIssue(
      "freeze",
      `Main thread stalled for about ${Math.round(lag)} ms. Scrolling, taps or screen changes may have appeared frozen.`,
      { durationMs: lag, severity: lag >= 3_000 ? "error" : "warning" },
    );
  }, 500);

  const watchFrames = (now: number) => {
    const gap = now - lastFrame;
    lastFrame = now;
    if (document.visibilityState === "visible" && gap >= 250 && gap < 1_200) {
      recordRuntimeDiagnosticIssue(
        "jank",
        `Visible frame gap of about ${Math.round(gap)} ms detected. The app may have visibly skipped or stuttered.`,
        { durationMs: gap },
      );
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

function result(
  id: string,
  area: string,
  status: DiagnosticStatus,
  title: string,
  detail: string,
): DiagnosticResult {
  return { id, area, status, title, detail };
}

async function fetchCheck(path: string, label: string, parse?: (response: Response) => Promise<void>): Promise<DiagnosticResult> {
  try {
    const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}__bixbo_scan=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!response.ok) {
      return result(`asset:${path}`, "PWA", "error", label, `Request failed with HTTP ${response.status}.`);
    }
    if (parse) await parse(response);
    return result(`asset:${path}`, "PWA", "ok", label, "Loaded successfully.");
  } catch (error) {
    return result(`asset:${path}`, "PWA", "error", label, compactMessage(error));
  }
}

function storageCheck(): DiagnosticResult {
  if (typeof window === "undefined") return result("storage", "Storage", "warning", "Local storage", "Browser storage is not available during server rendering.");
  const key = `bixbo:diagnostic-probe:${Date.now()}`;
  try {
    window.localStorage.setItem(key, "ok");
    const value = window.localStorage.getItem(key);
    window.localStorage.removeItem(key);
    return value === "ok"
      ? result("storage", "Storage", "ok", "Local storage", "Read/write test passed.")
      : result("storage", "Storage", "error", "Local storage", "The browser did not return the value that BIXBO wrote.");
  } catch (error) {
    return result("storage", "Storage", "error", "Local storage", compactMessage(error));
  }
}

function dataIntegrityCheck(): DiagnosticResult {
  try {
    const data = getBixbo();
    if (!data || typeof data !== "object") return result("data", "Data", "error", "BIXBO data", "The local BIXBO state is missing or invalid.");
    if (!data.settings || typeof data.settings !== "object") return result("data", "Data", "error", "BIXBO data", "Settings are missing from the local state.");
    if (!data.dayLogs || typeof data.dayLogs !== "object" || Array.isArray(data.dayLogs)) return result("data", "Data", "error", "BIXBO data", "Day logs have an invalid structure.");

    const invalidDates = Object.keys(data.dayLogs).filter((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date));
    if (invalidDates.length) {
      return result("data", "Data", "warning", "BIXBO data", `${invalidDates.length} day-log key${invalidDates.length === 1 ? " is" : "s are"} malformed.`);
    }

    JSON.stringify(data);
    return result("data", "Data", "ok", "BIXBO data", `Data structure is valid (${Object.keys(data.dayLogs).length} logged day${Object.keys(data.dayLogs).length === 1 ? "" : "s"}).`);
  } catch (error) {
    return result("data", "Data", "error", "BIXBO data", compactMessage(error));
  }
}

function savedSnapshotCheck(): DiagnosticResult {
  if (typeof window === "undefined") return result("snapshot", "Data", "warning", "Saved snapshot", "Cannot inspect saved data outside the browser.");
  try {
    const raw = window.localStorage.getItem("bixbo:v2") ?? window.localStorage.getItem("bixbo:v1");
    if (!raw) return result("snapshot", "Data", "ok", "Saved snapshot", "No legacy/local snapshot problem detected.");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return result("snapshot", "Data", "error", "Saved snapshot", "Saved BIXBO data is not a valid object.");
    return result("snapshot", "Data", "ok", "Saved snapshot", "Saved BIXBO data can be parsed successfully.");
  } catch (error) {
    return result("snapshot", "Data", "error", "Saved snapshot", `Saved BIXBO data cannot be parsed: ${compactMessage(error)}`);
  }
}

function browserCheck(): DiagnosticResult {
  if (typeof navigator === "undefined") return result("browser", "Browser", "warning", "Browser runtime", "Browser information is unavailable.");
  const online = navigator.onLine !== false;
  return online
    ? result("browser", "Browser", "ok", "Browser runtime", "Browser is online and JavaScript runtime is active.")
    : result("browser", "Browser", "warning", "Browser runtime", "Device is offline. Network-dependent checks may fail until connection returns.");
}

function deviceCapabilityCheck(): DiagnosticResult {
  if (typeof navigator === "undefined") return result("device", "Performance", "warning", "Device capacity", "Device information is unavailable.");
  const nav = navigator as NavigatorDiagnostics;
  const cores = nav.hardwareConcurrency;
  const memory = nav.deviceMemory;
  const connection = nav.connection;
  const details = [
    typeof cores === "number" ? `${cores} logical CPU cores` : "CPU count unavailable",
    typeof memory === "number" ? `${memory} GB device-memory hint` : "memory hint unavailable",
    connection?.effectiveType ? `${connection.effectiveType} network` : "network class unavailable",
  ];
  const constrained = (typeof cores === "number" && cores <= 2) || (typeof memory === "number" && memory <= 2);
  return result(
    "device",
    "Performance",
    constrained ? "warning" : "ok",
    "Device capacity",
    `${details.join(" · ")}.${constrained ? " Limited device resources can increase stutter under heavy screens." : ""}`,
  );
}

function navigationPerformanceCheck(): DiagnosticResult {
  if (typeof performance === "undefined") return result("navigation", "Performance", "warning", "Page startup timing", "Performance timing APIs are unavailable.");
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return result("navigation", "Performance", "warning", "Page startup timing", "Navigation timing is unavailable for this app session.");

  const ttfb = Math.max(0, nav.responseStart - nav.requestStart);
  const domReady = Math.max(0, nav.domContentLoadedEventEnd - nav.startTime);
  const load = nav.loadEventEnd > 0 ? Math.max(0, nav.loadEventEnd - nav.startTime) : Math.max(0, nav.duration);
  const worst = Math.max(ttfb, domReady, load);
  const status: DiagnosticStatus = worst >= 4_000 ? "error" : worst >= 2_000 ? "warning" : "ok";
  return result(
    "navigation",
    "Performance",
    status,
    "Page startup timing",
    `TTFB ${Math.round(ttfb)} ms · DOM ready ${Math.round(domReady)} ms · load ${Math.round(load)} ms.`,
  );
}

async function mainThreadResponsivenessCheck(): Promise<DiagnosticResult> {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return result("main-thread", "Performance", "warning", "Main-thread responsiveness", "Performance probing is unavailable.");
  }
  if (document.visibilityState !== "visible") {
    return result("main-thread", "Performance", "warning", "Main-thread responsiveness", "Skipped because the app is currently in the background.");
  }

  const sampleMs = 900;
  const intervalMs = 50;
  const started = performance.now();
  let expected = started + intervalMs;
  let worstTimerLag = 0;
  let worstFrameGap = 0;
  let lastFrame = started;
  let rafId = 0;

  const frame = (now: number) => {
    worstFrameGap = Math.max(worstFrameGap, now - lastFrame);
    lastFrame = now;
    if (now - started < sampleMs) rafId = window.requestAnimationFrame(frame);
  };
  rafId = window.requestAnimationFrame(frame);

  await new Promise<void>((resolve) => {
    const timer = window.setInterval(() => {
      const now = performance.now();
      worstTimerLag = Math.max(worstTimerLag, Math.max(0, now - expected));
      expected = now + intervalMs;
      if (now - started >= sampleMs) {
        window.clearInterval(timer);
        resolve();
      }
    }, intervalMs);
  });
  window.cancelAnimationFrame(rafId);

  const worst = Math.max(worstTimerLag, worstFrameGap);
  const status: DiagnosticStatus = worst >= 1_000 ? "error" : worst >= 200 ? "warning" : "ok";
  return result(
    "main-thread",
    "Performance",
    status,
    "Main-thread responsiveness",
    `Live 0.9 s probe: worst timer delay ${Math.round(worstTimerLag)} ms · worst frame gap ${Math.round(worstFrameGap)} ms.`,
  );
}

function notificationCapabilityCheck(): DiagnosticResult {
  if (typeof window === "undefined") return result("push", "Notifications", "warning", "Notification support", "Notification APIs are unavailable during server rendering.");
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  if (!supported) return result("push", "Notifications", "warning", "Notification support", "This browser does not expose all Web Push APIs.");
  return result("push", "Notifications", "ok", "Notification support", `Web Push APIs are available; permission is ${Notification.permission}.`);
}

async function serviceWorkerCheck(): Promise<DiagnosticResult> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return result("service-worker", "PWA", "warning", "Service worker state", "Service workers are unavailable in this browser.");
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return result("service-worker", "PWA", "ok", "Service worker state", "No service-worker registration is active; push may simply not be enabled on this device.");
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    return result(
      "service-worker",
      "PWA",
      worker?.state === "redundant" ? "error" : "ok",
      "Service worker state",
      `Registration found${worker ? `; worker state is ${worker.state}` : ""}${navigator.serviceWorker.controller ? "; page is controlled" : "; page is not currently controlled"}.`,
    );
  } catch (error) {
    return result("service-worker", "PWA", "warning", "Service worker state", compactMessage(error));
  }
}

async function storageCapacityCheck(): Promise<DiagnosticResult> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return result("storage-capacity", "Storage", "warning", "Storage capacity", "Browser storage-capacity estimates are unavailable.");
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!quota) return result("storage-capacity", "Storage", "warning", "Storage capacity", "Browser did not provide a storage quota.");
    const pct = (usage / quota) * 100;
    const status: DiagnosticStatus = pct >= 95 ? "error" : pct >= 80 ? "warning" : "ok";
    return result(
      "storage-capacity",
      "Storage",
      status,
      "Storage capacity",
      `${pct.toFixed(1)}% of the browser storage quota is currently used.`,
    );
  } catch (error) {
    return result("storage-capacity", "Storage", "warning", "Storage capacity", compactMessage(error));
  }
}

async function cloudCheck(): Promise<DiagnosticResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return result("cloud", "Cloud", "warning", "Cloud connection", "Skipped because the device is offline.");
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return result("cloud", "Cloud", "error", "Cloud session", compactMessage(error));
    if (!data.session) return result("cloud", "Cloud", "ok", "Cloud session", "Not signed in; cloud account verification was skipped.");

    const { error: userError } = await supabase.auth.getUser();
    if (userError) return result("cloud", "Cloud", "error", "Cloud connection", compactMessage(userError));
    return result("cloud", "Cloud", "ok", "Cloud connection", "Signed-in session and Supabase account check passed.");
  } catch (error) {
    return result("cloud", "Cloud", "error", "Cloud connection", compactMessage(error));
  }
}

async function routeChecks(preloadRoute?: RoutePreloader): Promise<DiagnosticResult[]> {
  if (!preloadRoute) {
    return [result("routes", "Screens", "warning", "Screen modules", "Route preloading is unavailable in this context.")];
  }

  const checks: DiagnosticResult[] = [];
  for (const [label, path] of DIAGNOSTIC_ROUTES) {
    try {
      await preloadRoute(path);
      checks.push(result(`route:${path}`, "Screens", "ok", label, `${path} module loaded successfully.`));
    } catch (error) {
      checks.push(result(`route:${path}`, "Screens", "error", label, compactMessage(error)));
    }
  }
  return checks;
}

function recentRuntimeCheck(issues: RuntimeDiagnosticIssue[]): DiagnosticResult {
  const cutoff = Date.now() - RECENT_RUNTIME_WINDOW_MS;
  const recent = issues.filter((issue) => issue.at >= cutoff && ERROR_KINDS.has(issue.kind));
  if (!recent.length) return result("runtime", "Runtime", "ok", "Recent runtime errors", "No uncaught app or resource errors recorded in the last 6 hours.");
  const areas = [...new Set(recent.map((issue) => issue.area))].join(", ");
  return result("runtime", "Runtime", "error", "Recent runtime errors", `${recent.length} app/resource error${recent.length === 1 ? "" : "s"} recorded in: ${areas}.`);
}

function recentNetworkCheck(issues: RuntimeDiagnosticIssue[]): DiagnosticResult {
  const cutoff = Date.now() - RECENT_RUNTIME_WINDOW_MS;
  const recent = issues.filter((issue) => issue.at >= cutoff && issue.kind === "network");
  if (!recent.length) return result("runtime-network", "Browser", "ok", "Recent connectivity drops", "No offline transition was recorded in the last 6 hours.");
  return result(
    "runtime-network",
    "Browser",
    "warning",
    "Recent connectivity drops",
    `${recent.length} offline transition${recent.length === 1 ? " was" : "s were"} recorded while BIXBO was open. Network loss can interrupt cloud actions but should not freeze local screens.`,
  );
}

function runtimePerformanceCheck(issues: RuntimeDiagnosticIssue[]): DiagnosticResult {
  const cutoff = Date.now() - RECENT_RUNTIME_WINDOW_MS;
  const recent = issues.filter((issue) => issue.at >= cutoff && PERFORMANCE_KINDS.has(issue.kind));
  if (!recent.length) {
    return result("runtime-performance", "Performance", "ok", "Recorded freezes & stutter", "No freeze, frame-skip, long-task or slow-interaction incident was recorded in the last 6 hours.");
  }
  const worst = recent.reduce((max, issue) => Math.max(max, issue.durationMs ?? 0), 0);
  const routes = [...new Set(recent.map((issue) => issue.area))].join(", ");
  const hasError = recent.some((issue) => issue.severity === "error");
  return result(
    "runtime-performance",
    "Performance",
    hasError ? "error" : "warning",
    "Recorded freezes & stutter",
    `${recent.length} performance incident${recent.length === 1 ? "" : "s"} recorded in: ${routes}. Worst measured delay: ${Math.round(worst)} ms. See Recorded app incidents below for exact route and time.`,
  );
}

export async function runAppDiagnostics(options?: { preloadRoute?: RoutePreloader }): Promise<AppDiagnosticReport> {
  const startedAt = Date.now();
  const runtimeIssues = getRuntimeDiagnosticIssues();
  const results: DiagnosticResult[] = [
    storageCheck(),
    dataIntegrityCheck(),
    savedSnapshotCheck(),
    browserCheck(),
    deviceCapabilityCheck(),
    navigationPerformanceCheck(),
    notificationCapabilityCheck(),
    recentRuntimeCheck(runtimeIssues),
    recentNetworkCheck(runtimeIssues),
    runtimePerformanceCheck(runtimeIssues),
  ];

  results.push(await mainThreadResponsivenessCheck());
  results.push(await storageCapacityCheck());
  results.push(
    await fetchCheck("/manifest.json", "PWA manifest", async (response) => {
      const manifest = (await response.json()) as { name?: unknown; icons?: unknown };
      if (typeof manifest.name !== "string" || !manifest.name.trim()) throw new Error("Manifest name is missing.");
      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) throw new Error("Manifest icons are missing.");
    }),
  );
  results.push(await fetchCheck("/bixbo-push-sw.js", "Push service worker"));
  results.push(await serviceWorkerCheck());
  results.push(await cloudCheck());
  results.push(...(await routeChecks(options?.preloadRoute)));

  return { startedAt, finishedAt: Date.now(), results, runtimeIssues };
}
