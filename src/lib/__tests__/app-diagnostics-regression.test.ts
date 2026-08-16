import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("BIXBO app diagnostics", () => {
  it("keeps full scanner coverage and runtime error capture wired into the app", () => {
    const diagnostics = readFileSync("src/lib/appDiagnostics.ts", "utf8");
    const route = readFileSync("src/routes/diagnostics.tsx", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const server = readFileSync("src/server.ts", "utf8");

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

    expect(route).toContain('createFileRoute("/diagnostics")');
    expect(route).toContain("BIXBO App Scanner");
    expect(route).toContain("Run scan");
    expect(route).toContain("Recorded app incidents");
    expect(route).toContain("Performance recorder:");
    expect(route).toContain("Measured delay:");

    expect(root).toContain("installRuntimeDiagnostics");
    expect(root).toContain("BIXBO detected an app error");
    expect(root).toContain('window.location.assign("/diagnostics")');
    expect(root).toContain('href="/diagnostics"');

    expect(root).toContain("animation: bixbo-ios-launch-splash-hide 1s step-end forwards");
    expect(root).toContain("pointer-events: none");
    expect(root).not.toContain("}, 4500);");
    expect(root).not.toContain("}, 700);");

    expect(server).toContain('pathname.startsWith("/assets/")');
    expect(server).toContain("status: 404");
    expect(server).toContain('"application/javascript; charset=utf-8"');
    expect(server).toContain('hardened.headers.set("Cache-Control", "no-store, max-age=0")');
  });
});
