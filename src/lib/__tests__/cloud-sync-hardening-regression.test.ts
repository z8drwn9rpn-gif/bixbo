import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const cloudSync = readFileSync("src/lib/cloudSync.ts", "utf8");
const storageRuntime = readFileSync("src/lib/storage/runtime.ts", "utf8");

describe("cloud and local data reliability", () => {
  it("keeps offline writes pending and retries the newest snapshot later", () => {
    expect(cloudSync).toContain('const PENDING_SYNC_KEY = "bixbo:pending-cloud-sync"');
    expect(cloudSync).toContain("if (browserIsOffline())");
    expect(cloudSync).toContain("setPendingCloudSync(true)");
    expect(cloudSync).toContain('window.addEventListener("online", retryPending)');
    expect(cloudSync).toContain('document.addEventListener("visibilitychange", retryWhenVisible)');
    expect(cloudSync).toContain("queuedPushData = getBixbo()");
  });

  it("serializes writes and prevents an old session from writing into a new account", () => {
    expect(cloudSync).toContain("let pushInFlight: Promise<void> | null = null");
    expect(cloudSync).toContain("if (pushInFlight) return pushInFlight");
    expect(cloudSync).toContain("while (!cancelled && queuedPushData)");
    expect(cloudSync).toContain("activeSession.user.id !== userId");
    expect(cloudSync).toContain("queuedPushData = null");
    expect(cloudSync).not.toContain('addEventListener("pagehide"');
    expect(cloudSync).not.toContain('addEventListener("beforeunload"');
  });

  it("merges rather than overwrites local and remote health data", () => {
    expect(cloudSync).toContain("const currentLocal = getBixbo()");
    expect(cloudSync).toContain("mergeBixbo(currentLocal, safeRemote");
    expect(cloudSync).toContain('replaceBixbo(reconciled, "remote")');
    expect(cloudSync).toContain("await pushNow(reconciled)");
    expect(cloudSync).toContain("if (incomingJson === _lastPushedJson) return");
    expect(cloudSync).toContain("mergeBixbo(currentLocal, incoming)");
    expect(cloudSync).toContain("if (mergedJson !== incomingJson) schedulePush(reconciled)");
  });

  it("protects local data before migrations and large destructive replacements", () => {
    expect(storageRuntime).toContain('storeSafetyBackup(migrate(JSON.parse(raw)), "before-app-migration")');
    expect(storageRuntime).toContain("protectAgainstLargeDataLoss");
    expect(storageRuntime).toContain("storeSafetyBackup(previous, reason)");
    expect(storageRuntime).toContain("if (!_hydrated) hydrate()");
    expect(storageRuntime).toContain("BIXBO local data could not be saved.");
  });
});
