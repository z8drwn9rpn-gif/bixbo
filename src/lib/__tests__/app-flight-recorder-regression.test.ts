import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("forensic app flight recorder", () => {
  it("keeps deep correlated runtime evidence wired in without capturing form values", () => {
    const recorder = readFileSync("src/lib/appFlightRecorder.ts", "utf8");
    const staleRecovery = readFileSync("src/lib/staleAssetRecovery.ts", "utf8");
    const diagnostics = readFileSync("src/routes/diagnostics.tsx", "utf8");
    const profiler = readFileSync("src/components/DiagnosticProfiler.tsx", "utf8");
    const server = readFileSync("src/server.ts", "utf8");

    expect(staleRecovery).toContain('void import("./appFlightRecorder")');

    expect(recorder).toContain('window.fetch = async');
    expect(recorder).toContain('headers.set("x-bixbo-trace", traceId)');
    expect(recorder).toContain('response.status >= 500');
    expect(recorder).toContain('response.status === 429');
    expect(recorder).toContain('duration >= 8_000');
    expect(recorder).toContain('supported.includes("resource")');
    expect(recorder).toContain('supported.includes("layout-shift")');
    expect(recorder).toContain('supported.includes("long-animation-frame")');
    expect(recorder).toContain('supported.includes("event")');
    expect(recorder).toContain('supported.includes("largest-contentful-paint")');
    expect(recorder).toContain('window.addEventListener("securitypolicyviolation"');
    expect(recorder).toContain('window.addEventListener("unhandledrejection"');
    expect(recorder).toContain('Unexpected scroll jump');
    expect(recorder).toContain('Previous app session');
    expect(recorder).toContain('launches/reloads were detected within 60 seconds');
    expect(recorder).toContain('Black-box timeline:');
    expect(recorder).toContain('Primary root cause:');
    expect(recorder).toContain('fingerprint');
    expect(recorder).toContain('occurrenceCount');
    expect(recorder).toContain('buildFingerprint');
    expect(recorder).toContain('measureRouteSettled');
    expect(recorder).toContain('recordComponentRender');
    expect(recorder).toContain('JavaScript heap pressure');
    expect(recorder).toContain('Browser storage usage reached');

    expect(profiler).toContain('<Profiler');
    expect(profiler).toContain('recordComponentRender');
    expect(diagnostics).toContain('Incident clusters');
    expect(diagnostics).toContain('Top root cause');
    expect(diagnostics).toContain('60-second black-box timeline');
    expect(diagnostics).toContain('Primary root cause:');
    expect(server).toContain('X-Bixbo-Trace');
    expect(server).toContain('Server-Timing');

    // Diagnostics may record control labels and technical routes, but never
    // health-field contents, request bodies, input values or text-node content.
    expect(recorder).not.toContain("target.textContent");
    expect(recorder).not.toContain("target.value");
    expect(recorder).not.toContain("requestBody");
    expect(recorder).not.toContain("body:");
  });
});
