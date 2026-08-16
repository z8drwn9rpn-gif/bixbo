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

export type RuntimeDiagnosticIssue = {
  id: string;
  at: number;
  kind: "error" | "unhandledrejection" | "route";
  area: string;
  message: string;
  path: string;
};

export type AppDiagnosticReport = {
  startedAt: number;
  finishedAt: number;
  results: DiagnosticResult[];
  runtimeIssues: RuntimeDiagnosticIssue[];
};

export type RoutePreloader = (path: string) => Promise<void>;

const RUNTIME_ERROR_KEY = "bixbo:runtime-diagnostics:v1";
const MAX_RUNTIME_ERRORS = 25;
const RECENT_RUNTIME_WINDOW_MS = 6 * 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 30_000;

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

  // Keep diagnostics useful without retaining arbitrary user-entered content.
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
    // Restricted storage must not break the app.
  }
}

export function recordRuntimeDiagnosticIssue(
  kind: RuntimeDiagnosticIssue["kind"],
  error: unknown,
  options?: { area?: string; path?: string },
): RuntimeDiagnosticIssue | null {
  if (typeof window === "undefined") return null;

  const path = options?.path ?? `${window.location.pathname}${window.location.search}`;
  const area = options?.area ?? areaForPath(window.location.pathname);
  const message = compactMessage(error);
  const now = Date.now();
  const previous = readRuntimeIssuesRaw();
  const duplicate = previous.find(
    (issue) => issue.message === message && issue.path === path && now - issue.at < DEDUPE_WINDOW_MS,
  );
  if (duplicate) return duplicate;

  const issue: RuntimeDiagnosticIssue = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    kind,
    area,
    message,
    path,
  };

  try {
    window.localStorage.setItem(RUNTIME_ERROR_KEY, JSON.stringify([issue, ...previous].slice(0, MAX_RUNTIME_ERRORS)));
  } catch {
    // Diagnostics are best-effort and never interfere with health data storage.
  }

  return issue;
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

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
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

function notificationCapabilityCheck(): DiagnosticResult {
  if (typeof window === "undefined") return result("push", "Notifications", "warning", "Notification support", "Notification APIs are unavailable during server rendering.");
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  if (!supported) return result("push", "Notifications", "warning", "Notification support", "This browser does not expose all Web Push APIs.");
  return result("push", "Notifications", "ok", "Notification support", `Web Push APIs are available; permission is ${Notification.permission}.`);
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
  const recent = issues.filter((issue) => issue.at >= cutoff);
  if (!recent.length) return result("runtime", "Runtime", "ok", "Recent runtime errors", "No uncaught app errors recorded in the last 6 hours.");
  const areas = [...new Set(recent.map((issue) => issue.area))].join(", ");
  return result("runtime", "Runtime", "error", "Recent runtime errors", `${recent.length} uncaught error${recent.length === 1 ? "" : "s"} recorded in: ${areas}.`);
}

export async function runAppDiagnostics(options?: { preloadRoute?: RoutePreloader }): Promise<AppDiagnosticReport> {
  const startedAt = Date.now();
  const runtimeIssues = getRuntimeDiagnosticIssues();
  const results: DiagnosticResult[] = [
    storageCheck(),
    dataIntegrityCheck(),
    savedSnapshotCheck(),
    browserCheck(),
    notificationCapabilityCheck(),
    recentRuntimeCheck(runtimeIssues),
  ];

  results.push(
    await fetchCheck("/manifest.json", "PWA manifest", async (response) => {
      const manifest = (await response.json()) as { name?: unknown; icons?: unknown };
      if (typeof manifest.name !== "string" || !manifest.name.trim()) throw new Error("Manifest name is missing.");
      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) throw new Error("Manifest icons are missing.");
    }),
  );
  results.push(await fetchCheck("/bixbo-push-sw.js", "Push service worker"));
  results.push(await cloudCheck());
  results.push(...(await routeChecks(options?.preloadRoute)));

  return { startedAt, finishedAt: Date.now(), results, runtimeIssues };
}
