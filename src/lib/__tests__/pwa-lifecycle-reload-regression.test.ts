import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iOS PWA reload and lifecycle hardening", () => {
  it("checks deployment freshness only on foreground lifecycle events with reload guards", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const freshness = readFileSync("src/lib/deploymentFreshness.ts", "utf8");
    const autoUpdate = readFileSync("src/hooks/useAppAutoUpdate.ts", "utf8");

    expect(shell).toContain('useDeploymentFreshness');
    expect(shell).toContain('useDeploymentFreshness();');

    expect(freshness).toContain('DEPLOYMENT_RELOAD_GUARD_KEY');
    expect(freshness).toContain('DEPLOYMENT_RELOAD_GUARD_MS = 5 * 60_000');
    expect(freshness).toContain('DEPLOYMENT_CHECK_COOLDOWN_MS = 15_000');
    expect(freshness).toContain('window.location.replace(currentUrlWithDeploymentBust())');
    expect(freshness).toContain('url.searchParams.set(DEPLOYMENT_REFRESH_PARAM');
    expect(freshness).toContain('url.searchParams.set(DEPLOYMENT_CHECK_PARAM');
    expect(freshness).toContain('fetch(currentRouteCheckUrl()');
    expect(freshness).not.toContain('fetch(`${window.location.origin}/?__bixbo_deploy_check=');
    expect(freshness).toContain('node.getAttribute("src") || node.src');
    expect(freshness).toContain('window.addEventListener("focus", onFocus)');
    expect(freshness).toContain('document.addEventListener("visibilitychange", onVisible)');
    expect(freshness).not.toContain('setInterval');

    expect(autoUpdate).toContain('UPDATE_RELOAD_GUARD_MS = 5 * 60_000');
    expect(autoUpdate).toContain('sessionStorage.getItem(UPDATE_TARGET_KEY)');
    expect(autoUpdate).toContain('sessionStorage.getItem(UPDATE_ATTEMPT_KEY)');
    expect(autoUpdate).toContain('window.location.replace(currentUrlWithUpdateBust())');
  });

  it("keeps the deep recorder but removes known standalone iOS lifecycle false positives", () => {
    const guard = readFileSync("src/lib/forensicLifecycleGuard.ts", "utf8");
    const staleRecovery = readFileSync("src/lib/staleAssetRecovery.ts", "utf8");
    const cloudSync = readFileSync("src/lib/cloudSync.ts", "utf8");

    expect(staleRecovery).toContain('installForensicLifecycleGuard()');
    expect(staleRecovery).toContain('void import("./appFlightRecorder")');
    expect(guard).toContain('RELOAD_LOOP_THRESHOLD = 5');
    expect(guard).toContain('RELOAD_ALERT_COOLDOWN_MS = 60_000');
    expect(guard).toContain('TypeError: Load failed');
    expect(guard).toContain('visibility(?:=| · )hidden');
    expect(guard).toContain('isBackgroundSuspendedNetworkIssue');
    expect(guard).toContain('· visibility · hidden\\b');
    expect(guard).toContain('· visibility · visible\\b');
    expect(guard).toContain('POST_RESUME_SANITIZE_MS = 1_000');
    expect(guard).toContain('display=standalone-PWA');
    expect(guard).toContain('marker.active !== true');
    expect(guard).toContain('writeLocalJson(LEGACY_BOOT_HISTORY_KEY, [])');

    expect(cloudSync).toContain('if (!queuedPushData) queuedPushData = payload');
    expect(cloudSync).toContain('setPendingCloudSync(true)');
    expect(cloudSync).toContain('document.addEventListener("visibilitychange", retryWhenVisible)');
  });
});
