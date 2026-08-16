import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("forensic report fixes", () => {
  test("proactively recovers long-running sessions onto the current deployment", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const freshness = readFileSync("src/lib/deploymentFreshness.ts", "utf8");

    expect(shell).toContain('import { useDeploymentFreshness } from "@/lib/deploymentFreshness"');
    expect(shell).toContain("useDeploymentFreshness();");
    expect(freshness).toContain("hasNewDeployment()");
    expect(freshness).toContain("window.location.reload()");
  });

  test("preloads mobile route chunks before navigation commits", () => {
    const router = readFileSync("src/router.tsx", "utf8");
    const bottomNav = readFileSync("src/components/BottomNav.tsx", "utf8");

    expect(router).toContain('defaultPreload: "intent"');
    expect(bottomNav).toContain('preload="intent"');
    expect(bottomNav).toContain("pointer-events-none");
  });

  test("does not classify partial Safari telemetry support as an app-health warning", () => {
    const deep = readFileSync("src/lib/appDeepDiagnostics.ts", "utf8");

    expect(deep).toContain('active.length > 0 ? "ok" : "warning"');
    expect(deep).toContain("partial native coverage is a browser capability difference, not an app-health warning");
  });

  test("keeps evidence thresholds and stale-asset distinction from the post-report fixes", () => {
    const runtime = readFileSync("src/lib/runtimeDiagnosticsInstaller.ts", "utf8");
    const deep = readFileSync("src/lib/appDeepDiagnostics.ts", "utf8");

    expect(runtime).toContain("const FRAME_GAP_EVIDENCE_COUNT = 2");
    expect(runtime).toContain("qualifyingFrameGapCount >= FRAME_GAP_EVIDENCE_COUNT");
    expect(deep).toContain("safeMissingHashedAsset");
    expect(deep).toContain("older already-loaded build");
  });
});
