import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iOS PWA reload and lifecycle hardening", () => {
  it("keeps proactive deployment freshness disconnected from the live AppShell", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const freshness = readFileSync("src/lib/deploymentFreshness.ts", "utf8");
    const cleanup = readFileSync("src/lib/legacyDeploymentRefreshCleanup.ts", "utf8");
    const autoUpdate = readFileSync("src/hooks/useAppAutoUpdate.ts", "utf8");

    expect(shell).not.toContain('useDeploymentFreshness');
    expect(shell).not.toContain('deploymentFreshness');
    expect(shell).toContain('import "@/lib/legacyDeploymentRefreshCleanup"');

    // The old module remains defensive if reused by a future screen, but it is
    // not mounted globally and therefore cannot produce lifecycle reloads.
    expect(freshness).toContain('DEPLOYMENT_RELOAD_GUARD_KEY');
    expect(freshness).toContain('DEPLOYMENT_RELOAD_GUARD_MS = 5 * 60_000');
    expect(freshness).toContain('window.location.replace(currentUrlWithDeploymentBust())');
    expect(freshness).not.toContain('setInterval');

    expect(cleanup).toContain('__bixbo_deploy_refresh');
    expect(cleanup).toContain('App open-to-paint latency was about');
    expect(cleanup).toContain('window.history.replaceState');

    expect(autoUpdate).toContain('UPDATE_RELOAD_GUARD_MS = 5 * 60_000');
    expect(autoUpdate).toContain('sessionStorage.getItem(UPDATE_TARGET_KEY)');
    expect(autoUpdate).toContain('sessionStorage.getItem(UPDATE_ATTEMPT_KEY)');
    expect(autoUpdate).toContain('window.location.replace(currentUrlWithUpdateBust())');
  });

  it("keeps the deep recorder while coalescing mobile cloud traffic", () => {
    const guard = readFileSync("src/lib/forensicLifecycleGuard.ts", "utf8");
    const staleRecovery = readFileSync("src/lib/staleAssetRecovery.ts", "utf8");
    const runtime = readFileSync("src/lib/networkEfficientCloudRuntime.ts", "utf8");

    expect(staleRecovery).toContain('installForensicLifecycleGuard()');
    expect(staleRecovery).toContain('void import("./appFlightRecorder")');
    expect(guard).toContain('RELOAD_LOOP_THRESHOLD = 5');
    expect(guard).toContain('RELOAD_ALERT_COOLDOWN_MS = 60_000');
    expect(guard).toContain('TypeError: Load failed');
    expect(guard).toContain('visibility(?:=| · )hidden');
    expect(guard).toContain('isBackgroundSuspendedNetworkIssue');
    expect(guard).toContain('POST_RESUME_SANITIZE_MS = 1_000');
    expect(guard).toContain('display=standalone-PWA');
    expect(guard).toContain('writeLocalJson(LEGACY_BOOT_HISTORY_KEY, [])');

    expect(runtime).toContain('CLOUD_CHANGE_DEBOUNCE_MS = 5_000');
    expect(runtime).toContain('CLOUD_RECONCILE_INTERVAL_MS = 5 * 60_000');
    expect(runtime).toContain('NOTIFICATION_CHANGE_DEBOUNCE_MS = 15_000');
    expect(runtime).toContain('NOTIFICATION_SERVER_SYNC_MS = 5 * 60_000');
    expect(runtime).toContain('if (key === lastCloudSnapshotKey) continue');
    expect(runtime).toContain('if (reconcileInFlight) return reconcileInFlight');
  });
});
