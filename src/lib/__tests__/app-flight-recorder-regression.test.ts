import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("forensic app flight recorder", () => {
  it("keeps deep runtime evidence collection wired in without capturing form values", () => {
    const recorder = readFileSync("src/lib/appFlightRecorder.ts", "utf8");
    const staleRecovery = readFileSync("src/lib/staleAssetRecovery.ts", "utf8");

    expect(staleRecovery).toContain('void import("./appFlightRecorder")');

    expect(recorder).toContain('window.fetch = async');
    expect(recorder).toContain('response.status >= 500');
    expect(recorder).toContain('response.status === 429');
    expect(recorder).toContain('duration >= 8_000');
    expect(recorder).toContain('supported.includes("resource")');
    expect(recorder).toContain('supported.includes("layout-shift")');
    expect(recorder).toContain('supported.includes("long-animation-frame")');
    expect(recorder).toContain('supported.includes("largest-contentful-paint")');
    expect(recorder).toContain('window.addEventListener("securitypolicyviolation"');
    expect(recorder).toContain('window.addEventListener("unhandledrejection"');
    expect(recorder).toContain('Unexpected scroll jump');
    expect(recorder).toContain('Previous app session');
    expect(recorder).toContain('launches/reloads were detected within 60 seconds');
    expect(recorder).toContain('Before incident:');
    expect(recorder).toContain('Likely cause:');

    // Diagnostics may record control labels and technical routes, but never
    // health-field contents, request bodies, input values or text-node content.
    expect(recorder).not.toContain("target.textContent");
    expect(recorder).not.toContain("target.value");
    expect(recorder).not.toContain("requestBody");
    expect(recorder).not.toContain("body:");
  });
});
