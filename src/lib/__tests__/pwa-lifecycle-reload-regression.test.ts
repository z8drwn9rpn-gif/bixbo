import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iOS PWA reload and lifecycle hardening", () => {
  it("keeps proactive deployment polling disconnected and guards any future refresh hook reuse", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const freshness = readFileSync("src/lib/deploymentFreshness.ts", "utf8");
    const autoUpdate = readFileSync("src/hooks/useAppAutoUpdate.ts", "utf8");

    expect(shell).not.toContain('useDeploymentFreshness');
    expect(shell).not.toContain('deploymentFreshness');

    expect(freshness).toContain('DEPLOYMENT_RELOAD_GUARD_KEY');
    expect(freshness).toContain('DEPLOYMENT_RELOAD_GUARD_MS = 5 * 60_000');
    expect(freshness).toContain('window.location.replace(currentUrlWithDeploymentBust())');
    expect(freshness).toContain('url.searchParams.set(DEPLOYMENT_REFRESH_PARAM');
    expect(freshness).toContain('url.searchParams.set(DEPLOYMENT_CHECK_PARAM');
    expect(freshness).toContain('fetch(currentRouteCheckUrl()');
    expect(freshness).not.toContain('fetch(`${window.location.origin}/?__bixbo_deploy_check=');
    expect(freshness).toContain('node.getAttribute("src") || node.src');

    expect(autoUpdate).toContain('UPDATE_RELOAD_GUARD_MS = 5 * 60_000');
    expect(autoUpdate).toContain('sessionStorage.getItem(UPDATE_TARGET_KEY)');
    expect(autoUpdate).toContain('sessionStorage.getItem(UPDATE_ATTEMPT_KEY)');
    expect(autoUpdate).toContain('window.location.replace(currentUrlWithUpdateBust())');
  });

  it("keeps the deep recorder but removes known standalone iOS lifecycle false positives", () => {
    const guard = readFileSync("src/lib/forensicLifecycleGuard.ts", "utf8");
    const staleRecovery = readFileSync("src/lib/staleAssetRecovery.ts", "utf8");

    expect(staleRecovery).toContain('installForensicLifecycleGuard()');
    expect(staleRecovery).toContain('void import("./appFlightRecorder")');
    expect(guard).toContain('RELOAD_LOOP_THRESHOLD = 5');
    expect(guard).toContain('RELOAD_ALERT_COOLDOWN_MS = 60_000');
    expect(guard).toContain('TypeError: Load failed');
    expect(guard).toContain('visibility(?:=| · )hidden');
    expect(guard).toContain('display=standalone-PWA');
    expect(guard).toContain('marker.active !== true');
    expect(guard).toContain('writeLocalJson(LEGACY_BOOT_HISTORY_KEY, [])');
  });
});
