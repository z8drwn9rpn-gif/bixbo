type RuntimeKind =
  | "error"
  | "unhandledrejection"
  | "route"
  | "resource"
  | "freeze"
  | "jank"
  | "longtask"
  | "interaction"
  | "network"
  | "storage";

type Severity = "warning" | "error";

type RootCauseCategory =
  | "network-offline"
  | "network-latency"
  | "server-upstream"
  | "deployment-cache"
  | "main-thread"
  | "render-layout"
  | "javascript"
  | "browser-lifecycle"
  | "storage-pressure"
  | "unknown";

type StoredIssue = {
  id: string;
  at: number;
  kind: RuntimeKind;
  severity?: Severity;
  area: string;
  message: string;
  path: string;
  durationMs?: number;
  context?: string;
  incidentId?: string;
  fingerprint?: string;
  occurrenceCount?: number;
  rootCause?: RootCauseCategory;
  confidence?: number;
  traceId?: string;
  buildFingerprint?: string;
  timeline?: string[];
};

type Breadcrumb = {
  at: number;
  type: string;
  detail: string;
  path: string;
  traceId?: string;
};

type NavigatorWithDiagnostics = Navigator & {
  standalone?: boolean;
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
    saveData?: boolean;
  };
};

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
};

type LayoutShiftEntry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
};

type LongAnimationFrameEntry = PerformanceEntry & {
  blockingDuration?: number;
};

type SessionMarker = {
  id: string;
  active: boolean;
  lastSeen: number;
  path: string;
};

type WindowWithFlightRecorder = Window & {
  __bixboFlightRecorderV3?: boolean;
};

type RecentRequest = {
  traceId: string;
  at: number;
  label: string;
  status?: number;
  durationMs: number;
};

type BaselineStore = Record<string, number[]>;

const ISSUE_KEY = "bixbo:runtime-diagnostics:v1";
const BREADCRUMB_KEY = "bixbo:flight-breadcrumbs:v2";
const SESSION_KEY = "bixbo:flight-session:v1";
const BOOT_HISTORY_KEY = "bixbo:flight-boots:v1";
const BASELINE_KEY = "bixbo:flight-baselines:v1";
const MAX_ISSUES = 100;
const MAX_BREADCRUMBS = 80;
const BLACK_BOX_WINDOW_MS = 60_000;
const RESTORE_BREADCRUMB_WINDOW_MS = 120_000;
const DEDUPE_MS = 30_000;
const INCIDENT_WINDOW_MS = 10_000;

const PERFORMANCE_KINDS = new Set<RuntimeKind>(["freeze", "jank", "longtask", "interaction"]);
const DEFAULT_ERROR_KINDS = new Set<RuntimeKind>(["error", "unhandledrejection", "route", "resource"]);

const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let breadcrumbs: Breadcrumb[] = [];
let baselines: BaselineStore = {};
let lastRoutePath = "";
let lastRouteAt = 0;
let lastUserIntentAt = 0;
let lastScrollY = 0;
let cumulativeLayoutShift = 0;
let layoutShiftReported = false;
let slowLcpReported = false;
let recentRequest: RecentRequest | null = null;
let traceCounter = 0;
let breadcrumbPersistTimer: ReturnType<typeof setTimeout> | null = null;
let baselinePersistTimer: ReturnType<typeof setTimeout> | null = null;
let cachedBuildFingerprint = "";

function compact(value: unknown, limit = 360): string {
  let text = "Unknown application failure";
  if (value instanceof Error) text = `${value.name}: ${value.message}`;
  else if (typeof value === "string") text = value;
  else if (value && typeof value === "object" && "message" in value) {
    text = String((value as { message?: unknown }).message ?? text);
  } else if (value != null) text = String(value);

  return text
    .replace(/https?:\/\/[^\s)]+/gi, (url) => sanitizeUrl(url))
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, limit);
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.href : "https://bixbo.invalid/");
    if (typeof window !== "undefined" && url.origin === window.location.origin) return url.pathname;
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
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
  if (path.startsWith("/diagnostics")) return "App diagnostics";
  return path === "/" ? "Home" : "Application";
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Diagnostics are best effort; storage failure is checked by the manual scan.
  }
}

function readIssues(): StoredIssue[] {
  const parsed = readJson<unknown>(ISSUE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is StoredIssue => {
    if (!item || typeof item !== "object") return false;
    const row = item as Partial<StoredIssue>;
    return typeof row.id === "string" && typeof row.at === "number" && typeof row.kind === "string" && typeof row.message === "string" && typeof row.path === "string";
  });
}

function flushBreadcrumbs(): void {
  if (breadcrumbPersistTimer) {
    clearTimeout(breadcrumbPersistTimer);
    breadcrumbPersistTimer = null;
  }
  writeJson(BREADCRUMB_KEY, breadcrumbs);
}

function scheduleBreadcrumbPersist(): void {
  if (breadcrumbPersistTimer) return;
  breadcrumbPersistTimer = setTimeout(() => {
    breadcrumbPersistTimer = null;
    writeJson(BREADCRUMB_KEY, breadcrumbs);
  }, 500);
}

function rememberBreadcrumb(type: string, detail: string, traceId?: string): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const crumb: Breadcrumb = {
    at: now,
    type,
    detail: compact(detail, 150),
    path: currentPath(),
    ...(traceId ? { traceId } : {}),
  };
  breadcrumbs = [...breadcrumbs.filter((item) => now - item.at <= BLACK_BOX_WINDOW_MS), crumb].slice(-MAX_BREADCRUMBS);
  scheduleBreadcrumbPersist();
}

function restoreBreadcrumbs(): void {
  const stored = readJson<unknown>(BREADCRUMB_KEY, []);
  if (!Array.isArray(stored)) return;
  const now = Date.now();
  breadcrumbs = stored
    .filter((item): item is Breadcrumb => {
      if (!item || typeof item !== "object") return false;
      const row = item as Partial<Breadcrumb>;
      return typeof row.at === "number" && typeof row.type === "string" && typeof row.detail === "string" && typeof row.path === "string" && now - row.at <= RESTORE_BREADCRUMB_WINDOW_MS;
    })
    .slice(-MAX_BREADCRUMBS);
}

function flushBaselines(): void {
  if (baselinePersistTimer) {
    clearTimeout(baselinePersistTimer);
    baselinePersistTimer = null;
  }
  writeJson(BASELINE_KEY, baselines);
}

function scheduleBaselinePersist(): void {
  if (baselinePersistTimer) return;
  baselinePersistTimer = setTimeout(() => {
    baselinePersistTimer = null;
    writeJson(BASELINE_KEY, baselines);
  }, 2_000);
}

function restoreBaselines(): void {
  const stored = readJson<unknown>(BASELINE_KEY, {});
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
  const next: BaselineStore = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!Array.isArray(value)) continue;
    next[key] = value.filter((sample): sample is number => typeof sample === "number" && Number.isFinite(sample) && sample >= 0).slice(-24);
  }
  baselines = next;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function addBaseline(key: string, sample: number): { medianBefore: number; samplesBefore: number } {
  const previous = baselines[key] ?? [];
  const snapshot = { medianBefore: median(previous), samplesBefore: previous.length };
  baselines[key] = [...previous, Math.round(sample)].slice(-24);
  scheduleBaselinePersist();
  return snapshot;
}

function simpleHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizedFingerprintText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\/assets\/[a-z0-9._-]+/gi, "/assets/[build]")
    .replace(/\b\d+(?:\.\d+)?\b/g, "#")
    .replace(/\s+/g, " ")
    .slice(0, 180);
}

function issueFingerprint(kind: RuntimeKind, path: string, message: string): string {
  return `fp-${simpleHash(`${kind}|${path}|${normalizedFingerprintText(message)}`)}`;
}

function deploymentFingerprint(): string {
  if (cachedBuildFingerprint) return cachedBuildFingerprint;
  if (typeof document === "undefined") return "unknown";
  const assets = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]")).map((node) => node.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>("link[href]")).map((node) => node.href),
  ]
    .map((value) => sanitizeUrl(value))
    .filter((value) => value.startsWith("/assets/"))
    .sort();
  cachedBuildFingerprint = assets.length ? `assets-${simpleHash(assets.join("|"))}` : "assets-pending";
  return cachedBuildFingerprint;
}

function navType(): string {
  if (typeof performance === "undefined") return "unknown";
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return entry?.type ?? "unknown";
}

function timelineSnapshot(now = Date.now()): string[] {
  return breadcrumbs
    .filter((item) => now - item.at <= BLACK_BOX_WINDOW_MS)
    .slice(-10)
    .map((item) => {
      const ago = Math.max(0, Math.round((now - item.at) / 100) / 10);
      return `${ago}s ago · ${item.type} · ${item.detail}${item.traceId ? ` · ${item.traceId}` : ""}`;
    });
}

function inferRootCause(kind: RuntimeKind, message: string, durationMs?: number): { category: RootCauseCategory; confidence: number } {
  const now = Date.now();
  const text = message.toLowerCase();
  const recent = breadcrumbs.filter((item) => now - item.at <= INCIDENT_WINDOW_MS);
  const hasOffline = typeof navigator !== "undefined" && navigator.onLine === false || recent.some((item) => item.type === "network" && item.detail.includes("offline"));
  if (hasOffline) return { category: "network-offline", confidence: 99 };

  if (recentRequest && now - recentRequest.at <= INCIDENT_WINDOW_MS) {
    if ((recentRequest.status ?? 0) >= 500) return { category: "server-upstream", confidence: 96 };
    if (recentRequest.status === 429) return { category: "server-upstream", confidence: 94 };
    if (recentRequest.durationMs >= 2_500 && ["freeze", "jank", "interaction", "network"].includes(kind)) {
      return { category: "network-latency", confidence: recentRequest.durationMs >= 8_000 ? 96 : 87 };
    }
  }

  if (/mime type|chunk|dynamically imported|preload css|\/assets\//i.test(message)) {
    return { category: "deployment-cache", confidence: 97 };
  }
  if (kind === "resource") return { category: "deployment-cache", confidence: 88 };
  if (kind === "storage") return { category: "storage-pressure", confidence: 95 };
  if (kind === "error" || kind === "unhandledrejection") return { category: "javascript", confidence: 96 };
  if (kind === "longtask" || kind === "freeze" || kind === "interaction") return { category: "main-thread", confidence: durationMs && durationMs >= 3_000 ? 97 : 91 };
  if (kind === "jank" && /layout|scroll|movement|render|frame/i.test(text)) return { category: "render-layout", confidence: 92 };
  if (kind === "route" || /session|reload|launch/i.test(text)) return { category: "browser-lifecycle", confidence: 84 };
  if (kind === "network") return { category: "network-latency", confidence: 82 };
  return { category: "unknown", confidence: 55 };
}

function runtimeEvidence(cause: string, inference: { category: RootCauseCategory; confidence: number }, traceId?: string): string {
  if (typeof window === "undefined" || typeof navigator === "undefined" || typeof document === "undefined") {
    return `Primary root cause: ${inference.category} (${inference.confidence}% confidence); Likely cause: ${cause}`;
  }

  const nav = navigator as NavigatorWithDiagnostics;
  const perf = performance as PerformanceWithMemory;
  const connection = nav.connection;
  const memory = perf.memory;
  const standalone = Boolean(nav.standalone) || Boolean(window.matchMedia?.("(display-mode: standalone)").matches);
  const sw = "serviceWorker" in navigator && navigator.serviceWorker.controller
    ? sanitizeUrl(navigator.serviceWorker.controller.scriptURL)
    : "none";
  const recent = timelineSnapshot().join(" → ");

  const parts = [
    `Primary root cause: ${inference.category} (${inference.confidence}% confidence)`,
    `Likely cause: ${cause}`,
    `Session ${sessionId}`,
    `build=${deploymentFingerprint()}`,
    `route=${currentPath()}`,
    `navigation=${navType()}`,
    `display=${standalone ? "standalone-PWA" : "browser"}`,
    `visibility=${document.visibilityState}`,
    `online=${navigator.onLine !== false ? "yes" : "no"}`,
    `service-worker=${sw}`,
  ];
  if (traceId) parts.push(`trace=${traceId}`);
  if (typeof nav.hardwareConcurrency === "number") parts.push(`cpu=${nav.hardwareConcurrency}`);
  if (typeof nav.deviceMemory === "number") parts.push(`memory=${nav.deviceMemory}GB`);
  if (connection?.effectiveType) parts.push(`network=${connection.effectiveType}`);
  if (typeof connection?.rtt === "number") parts.push(`rtt=${connection.rtt}ms`);
  if (typeof connection?.downlink === "number") parts.push(`downlink=${connection.downlink}Mbps`);
  if (connection?.saveData) parts.push("save-data=yes");
  if (typeof memory?.usedJSHeapSize === "number" && typeof memory.jsHeapSizeLimit === "number" && memory.jsHeapSizeLimit > 0) {
    parts.push(`heap=${Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)}%`);
  }
  if (recentRequest && Date.now() - recentRequest.at <= INCIDENT_WINDOW_MS) {
    parts.push(`recent-request=${recentRequest.label} status=${recentRequest.status ?? "failed"} duration=${Math.round(recentRequest.durationMs)}ms trace=${recentRequest.traceId}`);
  }
  if (recent) parts.push(`Black-box timeline: ${recent}`);
  return parts.join("; ").slice(0, 3600);
}

function record(
  kind: RuntimeKind,
  message: string,
  options: {
    severity?: Severity;
    durationMs?: number;
    cause: string;
    path?: string;
    traceId?: string;
  },
): StoredIssue | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  const path = options.path ?? currentPath();
  const cleanMessage = compact(message);
  const fingerprint = issueFingerprint(kind, path, cleanMessage);
  const previous = readIssues();
  const duplicate = previous.find((issue) => {
    if (now - issue.at >= DEDUPE_MS) return false;
    return issue.fingerprint ? issue.fingerprint === fingerprint : issue.kind === kind && issue.path === path && (PERFORMANCE_KINDS.has(kind) || issue.message === cleanMessage);
  });
  const inference = inferRootCause(kind, cleanMessage, options.durationMs);
  const traceId = options.traceId ?? (recentRequest && now - recentRequest.at <= INCIDENT_WINDOW_MS ? recentRequest.traceId : undefined);

  if (duplicate) {
    const updated: StoredIssue = {
      ...duplicate,
      at: now,
      message: cleanMessage,
      occurrenceCount: (duplicate.occurrenceCount ?? 1) + 1,
      ...(typeof options.durationMs === "number" ? { durationMs: Math.max(duplicate.durationMs ?? 0, Math.round(options.durationMs)) } : {}),
      rootCause: inference.category,
      confidence: Math.max(duplicate.confidence ?? 0, inference.confidence),
      ...(traceId ? { traceId } : {}),
      buildFingerprint: deploymentFingerprint(),
      timeline: timelineSnapshot(now),
      context: runtimeEvidence(options.cause, inference, traceId),
    };
    writeJson(ISSUE_KEY, [updated, ...previous.filter((issue) => issue.id !== duplicate.id)].slice(0, MAX_ISSUES));
    return updated;
  }

  const correlated = previous.find((issue) => issue.path === path && now - issue.at <= INCIDENT_WINDOW_MS);
  const incidentId = correlated?.incidentId ?? correlated?.id ?? `inc-${now.toString(36)}-${simpleHash(path).slice(0, 5)}`;
  const issue: StoredIssue = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    kind,
    severity: options.severity ?? (DEFAULT_ERROR_KINDS.has(kind) ? "error" : "warning"),
    area: areaForPath(path),
    message: cleanMessage,
    path,
    ...(typeof options.durationMs === "number" ? { durationMs: Math.round(options.durationMs) } : {}),
    incidentId,
    fingerprint,
    occurrenceCount: 1,
    rootCause: inference.category,
    confidence: inference.confidence,
    ...(traceId ? { traceId } : {}),
    buildFingerprint: deploymentFingerprint(),
    timeline: timelineSnapshot(now),
    context: runtimeEvidence(options.cause, inference, traceId),
  };
  writeJson(ISSUE_KEY, [issue, ...previous].slice(0, MAX_ISSUES));
  return issue;
}

function targetLabel(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "unknown target";
  const tag = target.tagName.toLowerCase();
  const role = target.getAttribute("role");
  const aria = target.getAttribute("aria-label");
  const title = target.getAttribute("title");
  const testId = target.getAttribute("data-testid");
  const safeLabel = aria || title || testId;
  return [tag, role ? `role=${role}` : "", safeLabel ? `label=${safeLabel.slice(0, 60)}` : ""].filter(Boolean).join(" ");
}

function staleAssetLike(value: unknown): boolean {
  const text = compact(value, 700).toLowerCase();
  return [
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed",
    "failed to load module script",
    "not a valid javascript mime type for module script",
    "chunkloaderror",
    "loading chunk",
    "unable to preload css",
  ].some((pattern) => text.includes(pattern));
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    const raw = input instanceof Request ? input.url : String(input);
    return new URL(raw, window.location.href);
  } catch {
    return null;
  }
}

function shouldTraceRequest(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.searchParams.has("__bixbo_scan")) return false;
  return url.origin === window.location.origin || url.hostname.endsWith("supabase.co");
}

function methodFor(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function nextTraceId(): string {
  traceCounter += 1;
  return `bx-${sessionId.slice(-6)}-${traceCounter.toString(36)}`;
}

function installFetchTracing(): void {
  if (typeof window.fetch !== "function") return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    const trace = Boolean(url && shouldTraceRequest(url));
    const method = methodFor(input, init);
    const label = url ? sanitizeUrl(url.href) : "[request]";
    const traceId = trace ? nextTraceId() : "";
    const started = performance.now();
    let fetchInit = init;

    if (trace && url?.origin === window.location.origin && init?.mode !== "no-cors") {
      const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
      headers.set("x-bixbo-trace", traceId);
      fetchInit = { ...init, headers };
    }
    if (trace) rememberBreadcrumb("request", `${method} ${label}`, traceId);

    try {
      const response = await originalFetch(input, fetchInit);
      if (!trace) return response;

      const duration = performance.now() - started;
      const echoedTrace = response.headers.get("x-bixbo-trace") || traceId;
      const serverTiming = response.headers.get("server-timing");
      recentRequest = { traceId: echoedTrace, at: Date.now(), label: `${method} ${label}`, status: response.status, durationMs: duration };
      rememberBreadcrumb("response", `${method} ${label} → ${response.status} in ${Math.round(duration)}ms${serverTiming ? ` · ${serverTiming}` : ""}`, echoedTrace);

      if (response.status >= 500) {
        record("network", `${method} ${label} returned HTTP ${response.status}.`, {
          severity: "error",
          durationMs: duration,
          traceId: echoedTrace,
          cause: "The request reached the server/upstream service but a 5xx response was returned. Server-side execution or an upstream dependency is the leading suspect.",
        });
      } else if (response.status === 429) {
        record("network", `${method} ${label} was rate limited (HTTP 429).`, {
          severity: "warning",
          durationMs: duration,
          traceId: echoedTrace,
          cause: "The service temporarily rejected requests because too many were sent in a short period.",
        });
      } else if (duration >= 8_000) {
        record("network", `${method} ${label} took ${Math.round(duration)} ms.`, {
          severity: "error",
          durationMs: duration,
          traceId: echoedTrace,
          cause: "A critical network/API request was extremely slow. Slow connectivity, server latency or a stalled upstream request can make the app appear frozen.",
        });
      } else if (duration >= 2_500) {
        record("network", `${method} ${label} took ${Math.round(duration)} ms.`, {
          severity: "warning",
          durationMs: duration,
          traceId: echoedTrace,
          cause: "A network/API request was slow enough to delay the screen. Connection quality or server response time is the most likely contributor.",
        });
      }
      return response;
    } catch (error) {
      if (trace) {
        const duration = performance.now() - started;
        recentRequest = { traceId, at: Date.now(), label: `${method} ${label}`, durationMs: duration };
        record("network", `${method} ${label} failed: ${compact(error)}`, {
          severity: "error",
          durationMs: duration,
          traceId,
          cause: navigator.onLine === false
            ? "The device was offline when the request failed."
            : "The request failed before a usable HTTP response arrived. DNS, TLS, connection loss, blocked requests or server reachability are possible causes.",
        });
      }
      throw error;
    }
  };
}

function installPerformanceObservers(): void {
  if (typeof PerformanceObserver === "undefined") return;
  const supported = (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] }).supportedEntryTypes ?? [];

  if (supported.includes("resource")) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (entry.duration < 2_000) continue;
        const kind = entry.initiatorType.toLowerCase();
        if (!["script", "link", "css"].includes(kind)) continue;
        const url = sanitizeUrl(entry.name);
        record("resource", `Slow app asset: ${url} took ${Math.round(entry.duration)} ms to load.`, {
          severity: entry.duration >= 6_000 ? "error" : "warning",
          durationMs: entry.duration,
          cause: "A JavaScript or CSS asset loaded slowly. Cache misses, deployment churn, CDN latency or poor connectivity can delay rendering and navigation.",
        });
      }
    });
    observer.observe({ entryTypes: ["resource"] });
  }

  if (supported.includes("layout-shift")) {
    const observer = new PerformanceObserver((list) => {
      for (const raw of list.getEntries()) {
        const entry = raw as LayoutShiftEntry;
        if (entry.hadRecentInput) continue;
        const value = entry.value ?? 0;
        cumulativeLayoutShift += value;
        if (layoutShiftReported || (value < 0.15 && cumulativeLayoutShift < 0.35)) continue;
        layoutShiftReported = true;
        record("jank", `Unexpected layout movement detected (shift ${value.toFixed(3)}, cumulative ${cumulativeLayoutShift.toFixed(3)}).`, {
          severity: cumulativeLayoutShift >= 0.5 ? "error" : "warning",
          cause: "Visible content moved without recent user input. Late-loading content, image sizing, font/layout changes or a rerender likely made the screen jump.",
        });
      }
    });
    observer.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
  }

  if (supported.includes("long-animation-frame")) {
    const observer = new PerformanceObserver((list) => {
      for (const raw of list.getEntries()) {
        const entry = raw as LongAnimationFrameEntry;
        if (entry.duration < 200 || document.visibilityState !== "visible") continue;
        const blocking = entry.blockingDuration ?? 0;
        record("longtask", `A long animation frame lasted ${Math.round(entry.duration)} ms${blocking ? ` (${Math.round(blocking)} ms blocking)` : ""}.`, {
          severity: entry.duration >= 1_000 ? "error" : "warning",
          durationMs: entry.duration,
          cause: "Rendering or JavaScript work exceeded the frame budget. Heavy component rendering, synchronous calculations or layout/paint work is likely responsible for visible stutter.",
        });
      }
    });
    observer.observe({ type: "long-animation-frame", buffered: true } as PerformanceObserverInit);
  }

  if (supported.includes("event")) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < 300 || document.visibilityState !== "visible") continue;
        record("interaction", `${entry.name || "User interaction"} occupied the interaction pipeline for about ${Math.round(entry.duration)} ms.`, {
          severity: entry.duration >= 1_000 ? "error" : "warning",
          durationMs: entry.duration,
          cause: "The browser measured a slow interaction. Main-thread JavaScript, React rendering, style/layout or paint work delayed the response to user input.",
        });
      }
    });
    observer.observe({ type: "event", buffered: true, durationThreshold: 200 } as PerformanceObserverInit);
  }

  if (supported.includes("largest-contentful-paint")) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (slowLcpReported || entry.startTime < 4_000) continue;
        slowLcpReported = true;
        record("jank", `Main screen content took about ${Math.round(entry.startTime)} ms to become visible.`, {
          severity: entry.startTime >= 8_000 ? "error" : "warning",
          durationMs: entry.startTime,
          cause: "The main visual content rendered late. Startup JavaScript, data loading, asset loading or expensive rendering may be delaying first usable paint.",
        });
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true } as PerformanceObserverInit);
  }
}

function installInteractionBreadcrumbs(): void {
  const markIntent = (event: Event) => {
    lastUserIntentAt = Date.now();
    if (event.type === "click") rememberBreadcrumb("tap", targetLabel(event.target));
  };

  window.addEventListener("pointerdown", markIntent, true);
  window.addEventListener("touchstart", markIntent, { capture: true, passive: true });
  window.addEventListener("wheel", markIntent, { capture: true, passive: true });
  window.addEventListener("keydown", markIntent, true);
  window.addEventListener("click", markIntent, true);

  lastScrollY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const now = Date.now();
      const next = window.scrollY;
      const delta = Math.abs(next - lastScrollY);
      lastScrollY = next;
      if (document.visibilityState !== "visible") return;
      if (delta < Math.max(650, window.innerHeight * 0.9)) return;
      if (now - lastUserIntentAt < 700 || now - lastRouteAt < 1_000) return;
      record("jank", `Unexpected scroll jump of about ${Math.round(delta)} px detected.`, {
        severity: "warning",
        cause: "The page position changed sharply without a recent tap, touch, wheel/key action or route transition. Programmatic scrolling or a large layout reflow may have moved the screen.",
      });
    },
    { passive: true },
  );
}

function installLifecycleTracing(): void {
  const onVisibility = () => rememberBreadcrumb("visibility", document.visibilityState);
  const onOnline = () => rememberBreadcrumb("network", "online");
  const onOffline = () => {
    rememberBreadcrumb("network", "offline");
    record("network", "Device went offline while BIXBO was open.", {
      severity: "warning",
      cause: "The browser reported loss of network connectivity. Cloud actions may fail until connectivity returns.",
    });
  };
  const onPageShow = (event: PageTransitionEvent) => rememberBreadcrumb("pageshow", event.persisted ? "restored-from-bfcache" : "normal");
  const onPageHide = (event: PageTransitionEvent) => {
    rememberBreadcrumb("pagehide", event.persisted ? "bfcache" : "leaving");
    flushBreadcrumbs();
    flushBaselines();
    markSessionClean();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", () => {
    flushBreadcrumbs();
    flushBaselines();
    markSessionClean();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      cachedBuildFingerprint = "";
      rememberBreadcrumb("service-worker", "controller changed");
    });
  }

  window.addEventListener("securitypolicyviolation", (event: SecurityPolicyViolationEvent) => {
    record("resource", `Content Security Policy blocked ${event.violatedDirective || "a resource"}: ${sanitizeUrl(event.blockedURI || "")}.`, {
      severity: "error",
      cause: "The browser blocked a resource or execution because it violated the app Content Security Policy. A deployment/configuration mismatch is likely.",
    });
  });
}

function installEarlyErrorTracing(): void {
  window.addEventListener("error", (event: ErrorEvent) => {
    const error = event.error ?? event.message;
    if (staleAssetLike(error)) return;
    const source = event.filename ? `${sanitizeUrl(event.filename)}:${event.lineno || 0}:${event.colno || 0}` : currentPath();
    const stack = error instanceof Error && error.stack ? compact(error.stack, 900) : "stack unavailable";
    record("error", `${compact(error)} at ${source}.`, {
      severity: "error",
      cause: `An uncaught JavaScript exception escaped normal handling. Stack evidence: ${stack}`,
    });
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    if (staleAssetLike(event.reason)) return;
    const stack = event.reason instanceof Error && event.reason.stack ? compact(event.reason.stack, 900) : "stack unavailable";
    record("unhandledrejection", compact(event.reason), {
      severity: "error",
      cause: `A Promise rejected without a handler. This often indicates an async API, storage or route task failed unexpectedly. Stack evidence: ${stack}`,
    });
  });
}

function markSessionClean(): void {
  const marker = readJson<SessionMarker | null>(SESSION_KEY, null);
  if (!marker || marker.id !== sessionId) return;
  writeJson(SESSION_KEY, { ...marker, active: false, lastSeen: Date.now(), path: currentPath() });
}

function installSessionForensics(): void {
  const now = Date.now();
  const previous = readJson<SessionMarker | null>(SESSION_KEY, null);
  if (previous?.active && previous.id !== sessionId && now - previous.lastSeen < 120_000) {
    record("error", `Previous app session on ${previous.path || "an unknown screen"} ended without a clean pagehide signal.`, {
      severity: "warning",
      cause: "The previous PWA session disappeared while recently active. A browser/OS kill, crash, forced reload or abrupt termination is possible; this is evidence, not absolute proof of a crash.",
      path: previous.path || currentPath(),
    });
  }

  const boots = readJson<number[]>(BOOT_HISTORY_KEY, []).filter((value) => typeof value === "number" && now - value < 10 * 60_000);
  const nextBoots = [...boots, now].slice(-12);
  writeJson(BOOT_HISTORY_KEY, nextBoots);
  const lastMinute = nextBoots.filter((value) => now - value < 60_000);
  if (lastMinute.length >= 3) {
    record("route", `${lastMinute.length} BIXBO launches/reloads were detected within 60 seconds.`, {
      severity: "error",
      cause: "The app is restarting unusually often. A reload loop, stale deployment recovery, repeated crash or aggressive manual refresh is possible.",
    });
  }

  writeJson(SESSION_KEY, { id: sessionId, active: true, lastSeen: now, path: currentPath() } satisfies SessionMarker);
  window.setInterval(() => {
    writeJson(SESSION_KEY, { id: sessionId, active: true, lastSeen: Date.now(), path: currentPath() } satisfies SessionMarker);
  }, 5_000);
}

function measureRouteSettled(path: string): void {
  const started = performance.now();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const duration = performance.now() - started;
      const key = `route:${path}`;
      const baseline = addBaseline(key, duration);
      rememberBreadcrumb("route-settled", `${path} settled in ${Math.round(duration)}ms`);
      if (baseline.samplesBefore >= 5 && duration >= Math.max(700, baseline.medianBefore * 2.5)) {
        record("jank", `Route ${path} settled in ${Math.round(duration)} ms versus a ${Math.round(baseline.medianBefore)} ms device baseline.`, {
          severity: duration >= 2_000 ? "error" : "warning",
          durationMs: duration,
          path,
          cause: "This screen rendered substantially slower than its own recent baseline on this device. A heavy rerender, data transformation, layout/paint cost or a preceding slow request is likely.",
        });
      }
    });
  });
}

function installRouteTracing(): void {
  lastRoutePath = currentPath();
  lastRouteAt = Date.now();
  rememberBreadcrumb("route", `opened ${lastRoutePath}`);
  measureRouteSettled(lastRoutePath);
  window.setInterval(() => {
    const next = currentPath();
    if (next === lastRoutePath) return;
    const previous = lastRoutePath;
    lastRoutePath = next;
    lastRouteAt = Date.now();
    cumulativeLayoutShift = 0;
    layoutShiftReported = false;
    slowLcpReported = false;
    rememberBreadcrumb("route", `${previous} → ${next}`);
    measureRouteSettled(next);
  }, 250);
}

function installStartupFrameProbe(): void {
  const started = performance.now();
  let last = started;
  let rafId = 0;
  const frame = (now: number) => {
    const gap = now - last;
    last = now;
    if (document.visibilityState === "visible" && gap >= 250) {
      record(gap >= 1_200 ? "freeze" : "jank", `Startup frame gap of about ${Math.round(gap)} ms detected.`, {
        severity: gap >= 3_000 ? "error" : "warning",
        durationMs: gap,
        cause: "The main thread stopped producing frames during startup. Heavy JavaScript, synchronous storage/data work, rendering or asset execution likely blocked the UI.",
      });
    }
    if (now - started < 10_000) rafId = window.requestAnimationFrame(frame);
  };
  rafId = window.requestAnimationFrame(frame);

  const timerStarted = performance.now();
  window.setTimeout(() => {
    const lag = performance.now() - timerStarted;
    if (lag >= 700 && document.visibilityState === "visible") {
      record("freeze", `Startup timer was delayed by about ${Math.round(lag)} ms.`, {
        severity: lag >= 3_000 ? "error" : "warning",
        durationMs: lag,
        cause: "The browser main thread was blocked immediately after app startup. Synchronous initialization work is the leading suspect.",
      });
    }
  }, 0);

  window.setTimeout(() => window.cancelAnimationFrame(rafId), 10_500);
}

function installEnvironmentSnapshot(): void {
  window.setTimeout(() => {
    cachedBuildFingerprint = "";
    rememberBreadcrumb("deployment", `build ${deploymentFingerprint()}`);
    if ("serviceWorker" in navigator) {
      const controller = navigator.serviceWorker.controller;
      rememberBreadcrumb("service-worker", controller ? `controller ${sanitizeUrl(controller.scriptURL)}` : "no controller");
    }

    if (typeof caches !== "undefined") {
      void caches.keys().then((names) => rememberBreadcrumb("cache", `${names.length} CacheStorage bucket${names.length === 1 ? "" : "s"}: ${names.slice(0, 4).join(", ") || "none"}`)).catch(() => undefined);
    }

    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
        if (!quota) return;
        const pct = usage / quota * 100;
        rememberBreadcrumb("storage", `${pct.toFixed(1)}% quota used`);
        if (pct >= 90) {
          record("storage", `Browser storage usage reached ${pct.toFixed(1)}% of the available quota.`, {
            severity: pct >= 97 ? "error" : "warning",
            cause: "Browser storage is close to its quota. Writes, cache updates or offline/PWA storage can become unreliable under severe storage pressure.",
          });
        }
      }).catch(() => undefined);
    }
  }, 1_500);
}

function installMemoryPressureProbe(): void {
  const perf = performance as PerformanceWithMemory;
  if (!perf.memory?.jsHeapSizeLimit) return;
  let reportedAt = 0;
  window.setInterval(() => {
    const memory = (performance as PerformanceWithMemory).memory;
    if (!memory?.usedJSHeapSize || !memory.jsHeapSizeLimit) return;
    const pct = memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100;
    if (pct < 85 || Date.now() - reportedAt < 120_000) return;
    reportedAt = Date.now();
    record("freeze", `JavaScript heap pressure reached about ${Math.round(pct)}% of the browser limit.`, {
      severity: pct >= 95 ? "error" : "warning",
      cause: "High JavaScript heap pressure can trigger garbage collection pauses or an OS/browser process kill. A memory-heavy screen, retained objects or large in-memory data may be contributing.",
    });
  }, 15_000);
}

export function recordComponentRender(id: string, phase: string, actualDuration: number, baseDuration: number): void {
  if (typeof window === "undefined" || !Number.isFinite(actualDuration) || actualDuration < 0) return;
  const key = `component:${id}`;
  const baseline = addBaseline(key, actualDuration);
  if (actualDuration < 80) return;

  rememberBreadcrumb("react-render", `${id} ${phase} actual=${Math.round(actualDuration)}ms base=${Math.round(baseDuration)}ms`);
  const anomalous = baseline.samplesBefore >= 5 && actualDuration >= Math.max(120, baseline.medianBefore * 2.5);
  if (actualDuration < 250 && !anomalous) return;

  record("longtask", `React profiler: ${id} ${phase} render took ${Math.round(actualDuration)} ms${baseline.samplesBefore ? ` (device baseline ${Math.round(baseline.medianBefore)} ms)` : ""}.`, {
    severity: actualDuration >= 1_000 ? "error" : "warning",
    durationMs: actualDuration,
    cause: `React measured expensive rendering inside ${id}. The render itself is directly observed; component computation, reconciliation and downstream layout/paint are the leading contributors.`,
  });
}

function startFlightRecorder(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const recordWindow = window as WindowWithFlightRecorder;
  if (recordWindow.__bixboFlightRecorderV3) return;
  recordWindow.__bixboFlightRecorderV3 = true;

  restoreBreadcrumbs();
  restoreBaselines();
  installSessionForensics();
  installRouteTracing();
  installInteractionBreadcrumbs();
  installLifecycleTracing();
  installEarlyErrorTracing();
  installFetchTracing();
  installPerformanceObservers();
  installStartupFrameProbe();
  installEnvironmentSnapshot();
  installMemoryPressureProbe();
  rememberBreadcrumb("recorder", "forensic correlation engine v3 active");
}

startFlightRecorder();

export { startFlightRecorder };