import type { DiagnosticResult, DiagnosticStatus } from "./appDiagnostics";

function result(id: string, area: string, status: DiagnosticStatus, title: string, detail: string): DiagnosticResult {
  return { id, area, status, title, detail };
}

function scanUrl(value: string): string {
  const url = new URL(value, window.location.href);
  url.searchParams.set("__bixbo_scan", Date.now().toString(36));
  return url.href;
}

function parseBixboServerTiming(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(?:^|,)\s*bixbo(?:;[^,]*)?;dur=([0-9.]+)/i) ?? value.match(/bixbo;dur=([0-9.]+)/i);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function currentAssetCoherenceCheck(): Promise<DiagnosticResult> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return result("deep-assets", "Forensics", "warning", "Loaded build assets", "DOM asset inspection is unavailable outside the browser.");
  }

  const raw = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]")).map((node) => node.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>("link[href]")).map((node) => node.href),
  ];
  const urls = [...new Set(raw)]
    .map((value) => {
      try { return new URL(value, window.location.href); } catch { return null; }
    })
    .filter((url): url is URL => Boolean(url && url.origin === window.location.origin && url.pathname.startsWith("/assets/") && /\.(?:css|m?js)$/i.test(url.pathname)))
    .slice(0, 12);

  if (!urls.length) {
    return result("deep-assets", "Forensics", "warning", "Loaded build assets", "No hashed JavaScript/CSS assets were discoverable in the current document.");
  }

  const staleLoadedAssets: string[] = [];
  const hardFailures: string[] = [];
  for (const url of urls) {
    try {
      const response = await fetch(scanUrl(url.href), { method: "HEAD", cache: "no-store" });
      const type = (response.headers.get("content-type") ?? "").toLowerCase();
      const expectsCss = url.pathname.endsWith(".css");
      const mimeOk = expectsCss ? type.includes("text/css") : type.includes("javascript");
      const html = type.includes("text/html");
      if (response.ok && mimeOk && !html) continue;

      const detail = `${url.pathname} → HTTP ${response.status}, ${type || "missing content-type"}`;
      const safeMissingHashedAsset = response.status === 404 && mimeOk && !html;
      if (safeMissingHashedAsset) staleLoadedAssets.push(detail);
      else hardFailures.push(detail);
    } catch (error) {
      hardFailures.push(`${url.pathname} → ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (hardFailures.length) {
    return result(
      "deep-assets",
      "Forensics",
      "error",
      "Loaded build assets",
      `${hardFailures.length}/${urls.length} active build assets are genuinely incoherent: ${hardFailures.slice(0, 3).join(" · ")}`,
    );
  }

  if (staleLoadedAssets.length) {
    return result(
      "deep-assets",
      "Forensics",
      "warning",
      "Loaded build assets",
      `${staleLoadedAssets.length}/${urls.length} asset${staleLoadedAssets.length === 1 ? "" : "s"} belong to an older already-loaded build and now return the app's safe non-HTML 404: ${staleLoadedAssets.slice(0, 3).join(" · ")}. The current session can keep running; fully close and reopen BIXBO to move onto the newest build.`,
    );
  }

  return result("deep-assets", "Forensics", "ok", "Loaded build assets", `${urls.length} active hashed JavaScript/CSS assets returned the expected status and MIME type.`);
}

async function staleAssetSentinelCheck(): Promise<DiagnosticResult> {
  if (typeof window === "undefined") {
    return result("stale-asset-sentinel", "Forensics", "warning", "Stale-asset sentinel", "Live deployment probing is unavailable outside the browser.");
  }
  const path = `/assets/bixbo-stale-probe-${Date.now().toString(36)}.js`;
  try {
    const response = await fetch(scanUrl(path), { method: "HEAD", cache: "no-store" });
    const type = (response.headers.get("content-type") ?? "").toLowerCase();
    const cacheControl = (response.headers.get("cache-control") ?? "").toLowerCase();
    const safe404 = response.status === 404 && type.includes("javascript") && !type.includes("text/html");
    const nonCacheable = cacheControl.includes("no-store") || cacheControl.includes("no-cache") || cacheControl.includes("max-age=0");
    return safe404 && nonCacheable
      ? result("stale-asset-sentinel", "Forensics", "ok", "Stale-asset sentinel", "A deliberately missing hashed JS asset returned a non-cacheable JavaScript 404 instead of SSR HTML. Stale PWA chunks cannot masquerade as HTML here.")
      : result("stale-asset-sentinel", "Forensics", "error", "Stale-asset sentinel", `Missing JS probe returned HTTP ${response.status}, ${type || "no content-type"}, cache=${cacheControl || "missing"}; expected a non-cacheable JavaScript 404, never text/html.`);
  } catch (error) {
    return result("stale-asset-sentinel", "Forensics", "error", "Stale-asset sentinel", error instanceof Error ? error.message : String(error));
  }
}

async function requestTraceCheck(): Promise<DiagnosticResult> {
  if (typeof window === "undefined") {
    return result("request-trace", "Forensics", "warning", "End-to-end request trace", "Request tracing is unavailable outside the browser.");
  }
  const traceId = `scan-${Date.now().toString(36)}`;
  try {
    const response = await fetch(scanUrl("/"), {
      method: "HEAD",
      cache: "no-store",
      headers: { "x-bixbo-trace": traceId, "cache-control": "no-cache" },
    });
    const echoed = response.headers.get("x-bixbo-trace");
    const timing = response.headers.get("server-timing");
    if (!response.ok) return result("request-trace", "Forensics", "error", "End-to-end request trace", `Trace probe returned HTTP ${response.status}.`);
    if (echoed !== traceId || parseBixboServerTiming(timing) == null) {
      return result("request-trace", "Forensics", "warning", "End-to-end request trace", `Server responded, but forensic trace metadata was incomplete (trace=${echoed ?? "missing"}, server-timing=${timing ?? "missing"}).`);
    }
    return result("request-trace", "Forensics", "ok", "End-to-end request trace", `Trace ${traceId} was echoed by the Worker and included server execution timing.`);
  } catch (error) {
    return result("request-trace", "Forensics", "error", "End-to-end request trace", error instanceof Error ? error.message : String(error));
  }
}

async function networkAttributionCheck(): Promise<DiagnosticResult> {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return result("network-attribution", "Forensics", "warning", "Network vs server attribution", "High-resolution request timing is unavailable.");
  }
  const traceId = `attrib-${Date.now().toString(36)}`;
  const started = performance.now();
  try {
    const response = await fetch(scanUrl("/"), {
      method: "HEAD",
      cache: "no-store",
      headers: { "x-bixbo-trace": traceId, "cache-control": "no-cache" },
    });
    const totalMs = performance.now() - started;
    const serverMs = parseBixboServerTiming(response.headers.get("server-timing"));
    if (!response.ok) {
      return result("network-attribution", "Forensics", "error", "Network vs server attribution", `Attribution probe returned HTTP ${response.status} after ${Math.round(totalMs)} ms.`);
    }
    if (serverMs == null) {
      return result("network-attribution", "Forensics", "warning", "Network vs server attribution", `Round trip completed in ${Math.round(totalMs)} ms, but Worker execution time was not exposed.`);
    }

    const outsideServerMs = Math.max(0, totalMs - serverMs);
    const serverShare = totalMs > 0 ? serverMs / totalMs : 0;
    const dominant = totalMs < 1_000
      ? "No meaningful bottleneck in this probe."
      : serverShare >= 0.65
        ? "Most delay was inside Worker/server execution."
        : outsideServerMs >= 750
          ? "Most delay was outside Worker execution: network, radio, connection setup, browser scheduling or CDN transit."
          : "Delay was split between server execution and transport/browser overhead.";
    const status: DiagnosticStatus = totalMs >= 4_000 ? "error" : totalMs >= 1_500 ? "warning" : "ok";
    return result(
      "network-attribution",
      "Forensics",
      status,
      "Network vs server attribution",
      `Trace ${traceId}: total ${Math.round(totalMs)} ms · Worker ${Math.round(serverMs)} ms · outside Worker ${Math.round(outsideServerMs)} ms. ${dominant}`,
    );
  } catch (error) {
    const totalMs = performance.now() - started;
    return result("network-attribution", "Forensics", "error", "Network vs server attribution", `Request failed after ${Math.round(totalMs)} ms: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function localStorageLatencyCheck(): DiagnosticResult {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return result("storage-latency", "Forensics", "warning", "Storage latency", "Synchronous storage timing is unavailable.");
  }
  const key = `bixbo:diagnostic-latency:${Date.now()}`;
  const payload = "x".repeat(4096);
  const samples: number[] = [];
  try {
    for (let index = 0; index < 5; index += 1) {
      const started = performance.now();
      window.localStorage.setItem(key, payload);
      void window.localStorage.getItem(key);
      window.localStorage.removeItem(key);
      samples.push(performance.now() - started);
    }
    const worst = Math.max(...samples);
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const status: DiagnosticStatus = worst >= 200 ? "error" : worst >= 50 ? "warning" : "ok";
    return result("storage-latency", "Forensics", status, "Storage latency", `5 synthetic 4 KB localStorage round-trips: average ${average.toFixed(1)} ms · worst ${worst.toFixed(1)} ms.`);
  } catch (error) {
    try { window.localStorage.removeItem(key); } catch { /* best effort */ }
    return result("storage-latency", "Forensics", "error", "Storage latency", error instanceof Error ? error.message : String(error));
  }
}

async function indexedDbProbe(): Promise<DiagnosticResult> {
  if (typeof indexedDB === "undefined") {
    return result("indexeddb", "Forensics", "warning", "IndexedDB probe", "IndexedDB is unavailable in this browser context.");
  }

  const dbName = `bixbo-diagnostic-${Date.now()}`;
  const started = performance.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("IndexedDB probe timed out after 3 seconds.")), 3_000);
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("probe");
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("probe", "readwrite");
        const store = transaction.objectStore("probe");
        store.put("ok", "key");
        const read = store.get("key");
        read.onerror = () => reject(read.error ?? new Error("IndexedDB read failed."));
        read.onsuccess = () => {
          if (read.result !== "ok") reject(new Error("IndexedDB returned an unexpected probe value."));
        };
        transaction.oncomplete = () => {
          window.clearTimeout(timeout);
          db.close();
          indexedDB.deleteDatabase(dbName);
          resolve();
        };
        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
      };
    });
    const duration = performance.now() - started;
    const status: DiagnosticStatus = duration >= 1_500 ? "warning" : "ok";
    return result("indexeddb", "Forensics", status, "IndexedDB probe", `Ephemeral open/write/read transaction completed in ${Math.round(duration)} ms.`);
  } catch (error) {
    try { indexedDB.deleteDatabase(dbName); } catch { /* best effort */ }
    return result("indexeddb", "Forensics", "warning", "IndexedDB probe", error instanceof Error ? error.message : String(error));
  }
}

async function cacheStorageProbe(): Promise<DiagnosticResult> {
  if (typeof caches === "undefined") {
    return result("cache-storage", "Forensics", "warning", "CacheStorage state", "CacheStorage API is unavailable in this browser context.");
  }
  const started = performance.now();
  try {
    const names = await caches.keys();
    const duration = performance.now() - started;
    const status: DiagnosticStatus = duration >= 1_000 ? "warning" : "ok";
    return result("cache-storage", "Forensics", status, "CacheStorage state", `${names.length} cache bucket${names.length === 1 ? "" : "s"} enumerated in ${Math.round(duration)} ms${names.length ? `: ${names.slice(0, 4).join(", ")}` : "."}`);
  } catch (error) {
    return result("cache-storage", "Forensics", "warning", "CacheStorage state", error instanceof Error ? error.message : String(error));
  }
}

async function storagePersistenceCheck(): Promise<DiagnosticResult> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return result("storage-persistence", "Forensics", "warning", "Storage persistence", "StorageManager is unavailable in this browser.");
  }
  try {
    const [{ usage = 0, quota = 0 }, persisted] = await Promise.all([
      navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve({ usage: 0, quota: 0 }),
      navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false),
    ]);
    const pct = quota ? usage / quota * 100 : 0;
    const status: DiagnosticStatus = pct >= 95 ? "error" : pct >= 80 ? "warning" : "ok";
    return result(
      "storage-persistence",
      "Forensics",
      status,
      "Storage persistence",
      `${quota ? `${pct.toFixed(1)}% quota used` : "quota unavailable"} · persistent storage ${persisted ? "granted" : "not guaranteed by browser"}.`,
    );
  } catch (error) {
    return result("storage-persistence", "Forensics", "warning", "Storage persistence", error instanceof Error ? error.message : String(error));
  }
}

function domIntegrityCheck(): DiagnosticResult {
  if (typeof document === "undefined") return result("dom-integrity", "Forensics", "warning", "DOM identity integrity", "DOM inspection is unavailable.");
  const counts = new Map<string, number>();
  for (const node of document.querySelectorAll<HTMLElement>("[id]")) {
    if (!node.id) continue;
    counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
  return duplicates.length
    ? result("dom-integrity", "Forensics", "warning", "DOM identity integrity", `${duplicates.length} duplicate DOM id${duplicates.length === 1 ? " was" : "s were"} found: ${duplicates.slice(0, 5).map(([id, count]) => `${id}×${count}`).join(", ")}. Duplicate IDs can cause focus, jump or selector bugs.`)
    : result("dom-integrity", "Forensics", "ok", "DOM identity integrity", `${counts.size} DOM IDs checked; no duplicates detected.`);
}

function domComplexityCheck(): DiagnosticResult {
  if (typeof document === "undefined") return result("dom-complexity", "Forensics", "warning", "DOM complexity", "DOM inspection is unavailable.");
  const root = document.querySelector("[data-bixbo-app-root]") ?? document.body;
  if (!root) return result("dom-complexity", "Forensics", "warning", "DOM complexity", "App root was not found.");
  const elements = Array.from(root.querySelectorAll("*"));
  let maxDepth = 0;
  for (const element of elements) {
    let depth = 0;
    let node: Element | null = element;
    while (node && node !== root && depth <= 80) {
      depth += 1;
      node = node.parentElement;
    }
    maxDepth = Math.max(maxDepth, depth);
  }
  const count = elements.length;
  const status: DiagnosticStatus = count >= 5_000 || maxDepth >= 45 ? "warning" : "ok";
  return result("dom-complexity", "Forensics", status, "DOM complexity", `${count} rendered elements · maximum nesting depth ${maxDepth}.${status === "warning" ? " Very large/deep DOM trees can amplify style, layout and paint work during updates." : ""}`);
}

function navigationBreakdownCheck(): DiagnosticResult {
  if (typeof performance === "undefined") return result("navigation-breakdown", "Forensics", "warning", "Navigation waterfall", "Navigation timing is unavailable.");
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return result("navigation-breakdown", "Forensics", "warning", "Navigation waterfall", "No navigation timing entry exists for this app session.");

  const redirect = Math.max(0, nav.redirectEnd - nav.redirectStart);
  const dns = Math.max(0, nav.domainLookupEnd - nav.domainLookupStart);
  const connect = Math.max(0, nav.connectEnd - nav.connectStart);
  const tls = nav.secureConnectionStart > 0 ? Math.max(0, nav.connectEnd - nav.secureConnectionStart) : 0;
  const ttfb = Math.max(0, nav.responseStart - nav.requestStart);
  const download = Math.max(0, nav.responseEnd - nav.responseStart);
  const dom = Math.max(0, nav.domContentLoadedEventEnd - nav.responseEnd);
  const total = nav.loadEventEnd > 0 ? Math.max(0, nav.loadEventEnd - nav.startTime) : Math.max(0, nav.duration);
  const worst = Math.max(ttfb, download, dom);
  const status: DiagnosticStatus = total >= 5_000 || worst >= 3_000 ? "error" : total >= 2_500 || worst >= 1_500 ? "warning" : "ok";
  return result(
    "navigation-breakdown",
    "Forensics",
    status,
    "Navigation waterfall",
    `redirect ${Math.round(redirect)} ms · DNS ${Math.round(dns)} ms · connect ${Math.round(connect)} ms · TLS ${Math.round(tls)} ms · TTFB ${Math.round(ttfb)} ms · download ${Math.round(download)} ms · DOM work ${Math.round(dom)} ms · total ${Math.round(total)} ms.`,
  );
}

function resourceWaterfallCheck(): DiagnosticResult {
  if (typeof performance === "undefined") return result("resource-waterfall", "Forensics", "warning", "Resource waterfall", "Resource timing is unavailable.");
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  if (!entries.length) return result("resource-waterfall", "Forensics", "warning", "Resource waterfall", "No resource timing entries are available.");

  const relevant = entries.filter((entry) => {
    try {
      const url = new URL(entry.name, window.location.href);
      return url.origin === window.location.origin || /fonts\.(?:googleapis|gstatic)\.com$/i.test(url.hostname);
    } catch {
      return false;
    }
  });
  const slowest = [...relevant].sort((a, b) => b.duration - a.duration)[0];
  const transferBytes = relevant.reduce((sum, entry) => sum + Math.max(0, entry.transferSize || 0), 0);
  const slowCount = relevant.filter((entry) => entry.duration >= 1_000).length;
  const worst = slowest?.duration ?? 0;
  const status: DiagnosticStatus = worst >= 5_000 ? "error" : worst >= 2_000 || slowCount >= 3 ? "warning" : "ok";
  let slowestLabel = "none";
  if (slowest) {
    try { slowestLabel = new URL(slowest.name, window.location.href).pathname; } catch { slowestLabel = "resource"; }
  }
  return result(
    "resource-waterfall",
    "Forensics",
    status,
    "Resource waterfall",
    `${relevant.length} timed resources · ${slowCount} ≥1 s · observed transfer ${(transferBytes / 1024).toFixed(0)} KB · slowest ${slowestLabel} at ${Math.round(worst)} ms.`,
  );
}

async function fontPipelineCheck(): Promise<DiagnosticResult> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return result("font-pipeline", "Forensics", "warning", "Font pipeline", "Font Loading API is unavailable.");
  }
  const started = performance.now();
  try {
    const initialStatus = document.fonts.status;
    await Promise.race([
      document.fonts.ready,
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Font readiness timed out after 3 seconds.")), 3_000)),
    ]);
    const duration = performance.now() - started;
    const status: DiagnosticStatus = duration >= 1_500 ? "warning" : "ok";
    return result("font-pipeline", "Forensics", status, "Font pipeline", `Font set was ${initialStatus}; readiness settled in ${Math.round(duration)} ms with ${document.fonts.status} status.`);
  } catch (error) {
    return result("font-pipeline", "Forensics", "warning", "Font pipeline", error instanceof Error ? error.message : String(error));
  }
}

async function serviceWorkerLifecycleCheck(): Promise<DiagnosticResult> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return result("service-worker-lifecycle", "Forensics", "warning", "Service-worker lifecycle", "Service workers are unavailable.");
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return result("service-worker-lifecycle", "Forensics", "ok", "Service-worker lifecycle", "No service-worker registration is active on this scope.");
    const controller = navigator.serviceWorker.controller;
    const parts = [
      `controller=${controller ? new URL(controller.scriptURL).pathname : "none"}`,
      `active=${registration.active?.state ?? "none"}`,
      `waiting=${registration.waiting?.state ?? "none"}`,
      `installing=${registration.installing?.state ?? "none"}`,
    ];
    const risky = registration.waiting != null || registration.installing?.state === "redundant" || registration.active?.state === "redundant";
    return result("service-worker-lifecycle", "Forensics", risky ? "warning" : "ok", "Service-worker lifecycle", parts.join(" · "));
  } catch (error) {
    return result("service-worker-lifecycle", "Forensics", "warning", "Service-worker lifecycle", error instanceof Error ? error.message : String(error));
  }
}

function performanceApiCoverageCheck(): DiagnosticResult {
  if (typeof PerformanceObserver === "undefined") {
    return result("performance-api", "Forensics", "warning", "Performance telemetry coverage", "PerformanceObserver is unavailable; freeze detection falls back to timers and animation frames.");
  }
  const supported = (PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] }).supportedEntryTypes ?? [];
  const desired = ["event", "longtask", "long-animation-frame", "layout-shift", "largest-contentful-paint", "resource"];
  const active = desired.filter((type) => supported.includes(type));
  return result(
    "performance-api",
    "Forensics",
    active.length >= 4 ? "ok" : "warning",
    "Performance telemetry coverage",
    `${active.length}/${desired.length} advanced browser telemetry channels are exposed here: ${active.join(", ") || "none"}. Timer/frame probes remain active for missing channels.`,
  );
}

export async function runDeepBrowserDiagnostics(): Promise<DiagnosticResult[]> {
  const synchronous = [
    localStorageLatencyCheck(),
    domIntegrityCheck(),
    domComplexityCheck(),
    navigationBreakdownCheck(),
    resourceWaterfallCheck(),
    performanceApiCoverageCheck(),
  ];
  const asynchronous = await Promise.all([
    currentAssetCoherenceCheck(),
    staleAssetSentinelCheck(),
    requestTraceCheck(),
    networkAttributionCheck(),
    indexedDbProbe(),
    cacheStorageProbe(),
    storagePersistenceCheck(),
    fontPipelineCheck(),
    serviceWorkerLifecycleCheck(),
  ]);
  return [...synchronous, ...asynchronous];
}