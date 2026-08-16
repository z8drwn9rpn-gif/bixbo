import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("screen-level forensic profiling", () => {
  it("profiles every AppShell screen with production-safe commit timing without profiling the scanner itself", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const profiler = readFileSync("src/components/DiagnosticProfiler.tsx", "utf8");

    expect(shell).toContain('import { DiagnosticProfiler } from "./DiagnosticProfiler"');
    expect(shell).toContain('<DiagnosticProfiler id={`Screen:${pathname}`}>');
    expect(profiler).toContain("useLayoutEffect");
    expect(profiler).toContain('commitCount.current === 1 ? "mount-commit" : "update-commit"');
    expect(profiler).toContain("recordComponentRender(");
    expect(profiler).toContain('`react-${phase}`');
    expect(profiler).toContain('window.location.pathname.startsWith("/diagnostics")');
    expect(profiler).toContain("if (diagnosticScreen) return");
  });
});
