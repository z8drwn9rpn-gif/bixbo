import type { DiagnosticResult, DiagnosticStatus } from "./appDiagnostics";

function result(id: string, area: string, status: DiagnosticStatus, title: string, detail: string): DiagnosticResult {
  return { id, area, status, title, detail };
}

function scanUrl(value: string): string {
  const url = new URL(value, window.location.href);
  url.searchParams.set("__bixbo_scan", Date.now().toString(36));
  return url.href;
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

  const failures: string[] = [];
  for (const url of urls) {
    try {
      const response = await fetch(scanUrl(url.href), { method: "HEAD", cache: "no-store" });
      const type = (response.headers.get("content-type") ?? "").toLowerCase();
      const expectsCss = url.pathname.endsWith(".css");
      const mimeOk = expectsCss ? type.includes("text/css") : type.includes("javascript");
      if (!response.ok || !mimeOk || type.includes("text/html")) {
        failures.push(`${url.pathname} → HTTP ${response.status}, ${type || "missing content-type"}`);
      }
    } catch (error) {
      failures.push(`${url.pathname} → ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return failures.length
    ? result("deep-assets", "Forensics", "error", "Loaded build assets", `${failures.length}/${urls.length} active build assets failed coherence: ${failures.slice(0, 3).join(" · ")}`)
    : result("deep-assets", "Forensics", "ok", "Loaded build assets", `${urls.length} active hashed JavaScript/CSS assets returned the expected status and MIME type.`);
}

async function staleAssetSentinelCheck(): Promise<DiagnosticResult> {
  if (typeof window === "undefined") {
    return result("stale-asset-sentinel", "Forensics", "warning", "Stale-asset sentinel", "Live deployment probing is unavailable outside the browser.");
  }
  const path = `/assets/bixbo-stale-probe-${Date.now().toString(36)}.js`;
  try {
    const response = await fetch(scanUrl(path), { method: "HEAD", cache: "no-store" });
    const type = (response.headers.get("content-type") ?? "").toLowerCase();
    const safe404 = response.status === 404 && type.includes("javascript") && !type.includes("text/html");
    return safe404
      ? result("stale-asset-sentinel", "Forensics", "ok", "Stale-asset sentinel", "A deliberately missing hashed JS asset returned a non-cacheable JavaScript 404 instead of SSR HTML. Stale PWA chunks cannot masquerade as HTML here.")
      : result("stale-asset-sentinel", "Forensics", "error", "Stale-asset sentinel", `Missing JS probe returned HTTP ${response.status} with ${type || "no content-type"}; expected a JavaScript 404, never text/html.`);
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
    if (echoed !== traceId || !timing?.includes("bixbo;dur=")) {
      return result("request-trace", "Forensics", "warning", "End-to-end request trace", `Server responded, but forensic trace metadata was incomplete (trace=${echoed ?? "missing"}, server-timing=${timing ?? "missing"}).`);
    }
    return result("request-trace", "Forensics", "ok", "End-to-end request trace", `Trace ${traceId} was echoed by the Worker and included server execution timing.`);
  } catch (error) {
    return result("request-trace", "Forensics", "error", "End-to-end request trace", error instanceof Error ? error.message : String(error));
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
  const synchronous = [localStorageLatencyCheck(), domIntegrityCheck(), performanceApiCoverageCheck()];
  const asynchronous = await Promise.all([
    currentAssetCoherenceCheck(),
    staleAssetSentinelCheck(),
    requestTraceCheck(),
    indexedDbProbe(),
    cacheStorageProbe(),
  ]);
  return [...synchronous, ...asynchronous];
}
