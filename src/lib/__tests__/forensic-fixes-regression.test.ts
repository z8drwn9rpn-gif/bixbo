import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("forensic report fixes", () => {
  test("keeps proactive deployment polling disconnected and stale recovery guarded", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const freshness = readFileSync("src/lib/deploymentFreshness.ts", "utf8");
    const staleRecovery = readFileSync("src/lib/staleAssetRecovery.ts", "utf8");
    const cleanup = readFileSync("src/lib/legacyDeploymentRefreshCleanup.ts", "utf8");

    expect(shell).not.toContain('useDeploymentFreshness');
    expect(shell).not.toContain('deploymentFreshness');
    expect(shell).toContain('legacyDeploymentRefreshCleanup');
    expect(freshness).toContain("DEPLOYMENT_RELOAD_GUARD_KEY");
    expect(freshness).toContain("DEPLOYMENT_RELOAD_GUARD_MS = 5 * 60_000");
    expect(freshness).not.toContain("setInterval");
    expect(staleRecovery).toContain("recoverFromStaleAssetError");
    expect(staleRecovery).toContain("RECOVERY_WINDOW_MS = 30_000");
    expect(cleanup).toContain("__bixbo_deploy_refresh");
    expect(cleanup).toContain("App open-to-paint latency was about");
  });

  test("coalesces cloud and reminder writes instead of syncing every local interaction", () => {
    const runtime = readFileSync("src/lib/networkEfficientCloudRuntime.ts", "utf8");
    const consentRuntime = readFileSync("src/components/ConsentAwareCloudRuntime.tsx", "utf8");

    expect(consentRuntime).toContain("useNetworkEfficientCloudSync();");
    expect(consentRuntime).toContain("useNetworkEfficientNotificationRuntime();");
    expect(consentRuntime).not.toContain("useCloudSync();");
    expect(consentRuntime).not.toContain("useNotificationRuntime();");

    expect(runtime).toContain("CLOUD_CHANGE_DEBOUNCE_MS = 5_000");
    expect(runtime).toContain("CLOUD_RECONCILE_INTERVAL_MS = 5 * 60_000");
    expect(runtime).toContain("NOTIFICATION_CHANGE_DEBOUNCE_MS = 15_000");
    expect(runtime).toContain("NOTIFICATION_SERVER_SYNC_MS = 5 * 60_000");
    expect(runtime).toContain("if (key === lastCloudSnapshotKey) continue");
    expect(runtime).toContain("if (reconcileInFlight) return reconcileInFlight");
  });

  test("keeps router intent preload while avoiding eager BottomNav preloads", () => {
    const router = readFileSync("src/router.tsx", "utf8");
    const bottomNav = readFileSync("src/components/BottomNav.tsx", "utf8");

    expect(router).toContain('defaultPreload: "intent"');
    expect(bottomNav).toContain('preload={false}');
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