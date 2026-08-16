import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("deep App Scanner forensics", () => {
  it("keeps live deployment, storage and incident-correlation probes wired in", () => {
    const deep = readFileSync("src/lib/appDeepDiagnostics.ts", "utf8");
    const diagnostics = readFileSync("src/routes/diagnostics.tsx", "utf8");
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");

    expect(deep).toContain("currentAssetCoherenceCheck()");
    expect(deep).toContain("staleAssetSentinelCheck()");
    expect(deep).toContain('headers: { "x-bixbo-trace": traceId');
    expect(deep).toContain('method: "HEAD"');
    expect(deep).toContain('"x".repeat(4096)');
    expect(deep).toContain("indexedDB.open");
    expect(deep).toContain("caches.keys()");
    expect(deep).toContain('querySelectorAll<HTMLElement>("[id]")');
    expect(deep).toContain("PerformanceObserver");

    expect(diagnostics).toContain("runDeepBrowserDiagnostics");
    expect(diagnostics).toContain("getRuntimeDiagnosticIssues()");
    expect(diagnostics).toContain("Forensic incident clusters");
    expect(diagnostics).toContain("Primary root cause:");
    expect(diagnostics).toContain("Copy forensic report");
    expect(diagnostics).toContain("60-second black-box timeline");

    expect(shell).toContain('<DiagnosticProfiler id={`Screen:${pathname}`}>');
  });
});
