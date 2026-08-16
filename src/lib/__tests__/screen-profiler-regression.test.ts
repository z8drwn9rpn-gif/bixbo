import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("screen-level forensic profiling", () => {
  it("profiles every AppShell screen with its route identity", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const profiler = readFileSync("src/components/DiagnosticProfiler.tsx", "utf8");

    expect(shell).toContain('import { DiagnosticProfiler } from "./DiagnosticProfiler"');
    expect(shell).toContain('<DiagnosticProfiler id={`Screen:${pathname}`}>');
    expect(profiler).toContain("recordComponentRender(profileId, phase, actualDuration, baseDuration)");
  });
});
