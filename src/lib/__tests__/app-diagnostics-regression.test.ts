import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("BIXBO app diagnostics", () => {
  it("keeps full scanner coverage and runtime error capture wired into the app", () => {
    const diagnostics = readFileSync("src/lib/appDiagnostics.ts", "utf8");
    const deepDiagnostics = readFileSync("src/lib/appDeepDiagnostics.ts", "utf8");
    const route = readFileSync("src/routes/diagnostics.tsx", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const server = readFileSync("src/server.ts", "utf8");
    const profiler = readFileSync("src/components/DiagnosticProfiler.tsx", "utf8");
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");

    expect(diagnostics).toContain('window.addEventListener("error", onError)');
    expect(diagnostics).toContain('window.addEventListener("unhandledrejection", onUnhandledRejection)');
    expect(diagnostics).toContain("recoverFromStaleAssetError(error)");
    expect(diagnostics).toContain("recoverFromStaleAssetError(event.reason)");
    expect(diagnostics).toContain('window.localStorage.setItem(RUNTIME_ERROR_KEY');
    expect(diagnostics).toContain('fetchCheck("/manifest.json"');
    expect(diagnostics).toContain('fetchCheck("/bixbo-push-sw.js"');
    expect(diagnostics).toContain('supabase.auth.getSession()');
    expect(diagnostics).toContain('dataIntegrityCheck()');
    expect(diagnostics).toContain('storageCheck()');

    expect(diagnostics).toContain('recordRuntimeDiagnosticIssue(\n      "freeze"');
    expect(diagnostics).toContain('recordRuntimeDiagnosticIssue(\n        "jank"');
    expect(diagnostics).toContain('supportedEntries.includes("longtask")');
    expect(diagnostics).toContain('supportedEntries.includes("event")');
    expect(diagnostics).toContain("requestAnimationFrame(watchFrames)");
    expect(diagnostics).toContain("mainThreadResponsivenessCheck()");
    expect(diagnostics).toContain("navigationPerformanceCheck()");
    expect(diagnostics).toContain("deviceCapabilityCheck()");
    expect(diagnostics).toContain("storageCapacityCheck()");
    expect(diagnostics).toContain("serviceWorkerCheck()");
    expect(diagnostics).toContain("runtimePerformanceCheck(runtimeIssues)");
    expect(diagnostics).toContain("recentNetworkCheck(runtimeIssues)");
    expect(diagnostics).toContain('window.addEventListener("error", onResourceError, true)');
    expect(diagnostics).toContain('window.addEventListener("offline", onOffline)');

    for (const path of [
      "/",
      "/profile",
      "/notifications",
      "/meds",
      "/insights",
      "/patterns",
      "/notes",
      "/couple",
      "/report",
      "/settings",
      "/pregnancy",
      "/postpartum",
      "/auth",
      "/admin",
    ]) {
      expect(diagnostics).toContain(`"${path}"`);
    }

    expect(deepDiagnostics).toContain("staleAssetSentinelCheck()");
    expect(deepDiagnostics).toContain("currentAssetCoherenceCheck()");
    expect(deepDiagnostics).toContain("requestTraceCheck()");
    expect(deepDiagnostics).toContain("networkAttributionCheck()");
    expect(deepDiagnostics).toContain("indexedDbProbe()");
    expect(deepDiagnostics).toContain("navigationBreakdownCheck()");
    expect(deepDiagnostics).toContain("resourceWaterfallCheck()");

    expect(route).toContain('createFileRoute("/diagnostics")');
    expect(route).toContain("BIXBO App Scanner");
    expect(route).toContain("Run scan");
    expect(route).toContain("Forensic incident clusters");
    expect(route).toContain("Black-box recorder:");
    expect(route).toContain("Measured delay:");
    expect(route).toContain("Incident clusters");
    expect(route).toContain("Top root cause");
    expect(route).toContain("60-second black-box timeline");
    expect(route).toContain("Copy forensic report");
    expect(route).toContain("runDeepBrowserDiagnostics");
    expect(route).toContain("getRuntimeDiagnosticIssues()");

    expect(root).toContain("installRuntimeDiagnostics");
    expect(root).toContain("BIXBO detected an app error");
    expect(root).toContain('router.navigate({ to: "/diagnostics" })');
    expect(root).toContain('<Link to="/diagnostics"');
    expect(root).toContain('<DiagnosticProfiler id="RouteTree">');
    expect(profiler).toContain("recordComponentRender");
    expect(shell).toContain('<DiagnosticProfiler id={`Screen:${pathname}`}>');
    expect(shell).toContain('import "@/lib/appVisualForensics"');

    // The custom launch splash is shown only for a real standalone PWA launch.
    // SPA navigation inside BIXBO does not recreate the document or replay it.
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_CSS");
    expect(root).toContain('(display-mode: standalone)');
    expect(root).toContain('if (!standalone) {');
    expect(root).toContain('root.dataset.bixboPwaLaunch = "visible"');
    expect(root).toContain("pointer-events: none");
    expect(root).toContain("}, 1000);");
    expect(root).not.toContain("bixbo-ios-launch-splash-hide");
    expect(root).toContain('/bixbo-mascot-user.png?v=20260816-launch5');

    expect(server).toContain('pathname.startsWith("/assets/")');
    expect(server).toContain("status: 404");
    expect(server).toContain('"application/javascript; charset=utf-8"');
    expect(server).toContain('hardened.headers.set("Cache-Control", "no-store, max-age=0")');
    expect(server).toContain("X-Bixbo-Trace");
    expect(server).toContain("Server-Timing");
  });
});
