import { describe, expect, it } from "vitest";
import {
  BIXBO_ACCOUNT_SWITCH_BACKUP_KEY,
  BIXBO_CLOUD_OWNER_KEY,
  guardCloudAccountOwnership,
  type CloudAccountStorage,
} from "../cloudAccountOwnership";

class MemoryStorage implements CloudAccountStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("cloud account ownership guard", () => {
  it("binds the first authenticated user without touching existing data", () => {
    const storage = new MemoryStorage();
    storage.setItem("bixbo:v2", '{"dayLogs":{"2026-08-20":{}}}');

    expect(guardCloudAccountOwnership("user-a", storage)).toBe("bound");
    expect(storage.getItem(BIXBO_CLOUD_OWNER_KEY)).toBe("user-a");
    expect(storage.getItem("bixbo:v2")).toContain("2026-08-20");
  });

  it("does nothing when the same authenticated user returns", () => {
    const storage = new MemoryStorage();
    storage.setItem(BIXBO_CLOUD_OWNER_KEY, "user-a");
    storage.setItem("bixbo:v2", "important-diary");

    expect(guardCloudAccountOwnership("user-a", storage)).toBe("same");
    expect(storage.getItem("bixbo:v2")).toBe("important-diary");
    expect(storage.getItem(BIXBO_ACCOUNT_SWITCH_BACKUP_KEY)).toBeNull();
  });

  it("backs up and clears only account-scoped BIXBO state on a real account switch", () => {
    const storage = new MemoryStorage();
    storage.setItem(BIXBO_CLOUD_OWNER_KEY, "user-a");
    storage.setItem("bixbo:v2", "primary-diary");
    storage.setItem("bixbo:v1", "legacy-diary");
    storage.setItem("bixbo:pending-cloud-sync", "1");
    storage.setItem("bixbo:last-cloud-sync-at", "yesterday");
    storage.setItem("bixbo:last-auto-backup-at", "yesterday");
    storage.setItem("bixbo-device-quick-log-v1", "quick-tags");
    storage.setItem("bixbo:supabase-auth:v1", "keep-auth-session");
    storage.setItem("bixbo:legal-consent", "keep-device-consent");

    expect(guardCloudAccountOwnership("user-b", storage)).toBe("switched");

    expect(storage.getItem(BIXBO_CLOUD_OWNER_KEY)).toBe("user-b");
    expect(storage.getItem("bixbo:v2")).toBeNull();
    expect(storage.getItem("bixbo:v1")).toBeNull();
    expect(storage.getItem("bixbo:pending-cloud-sync")).toBeNull();
    expect(storage.getItem("bixbo:last-cloud-sync-at")).toBeNull();
    expect(storage.getItem("bixbo:last-auto-backup-at")).toBeNull();
    expect(storage.getItem("bixbo-device-quick-log-v1")).toBeNull();
    expect(storage.getItem("bixbo:install-origin-v3")).toBe("fresh");

    expect(storage.getItem("bixbo:supabase-auth:v1")).toBe("keep-auth-session");
    expect(storage.getItem("bixbo:legal-consent")).toBe("keep-device-consent");

    const backup = JSON.parse(storage.getItem(BIXBO_ACCOUNT_SWITCH_BACKUP_KEY) ?? "{}") as {
      fromUserId?: string;
      toUserId?: string;
      snapshots?: Record<string, string>;
    };
    expect(backup.fromUserId).toBe("user-a");
    expect(backup.toUserId).toBe("user-b");
    expect(backup.snapshots?.["bixbo:v2"]).toBe("primary-diary");
    expect(backup.snapshots?.["bixbo:v1"]).toBe("legacy-diary");
  });
});
