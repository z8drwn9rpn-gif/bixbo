export const BIXBO_CLOUD_OWNER_KEY = "bixbo:cloud-owner-user-id:v1";
export const BIXBO_ACCOUNT_SWITCH_BACKUP_KEY = "bixbo:account-switch-backup:v1";

const ACCOUNT_SCOPED_DATA_KEYS = [
  "bixbo:v2",
  "bixbo:v1",
  "bixbo:safety-backup:v1",
  "bixbo:health-preferences",
] as const;
const ACCOUNT_SCOPED_CACHE_KEYS = [
  "bixbo:pending-cloud-sync",
  "bixbo:last-cloud-sync-at",
  "bixbo:last-auto-backup-at",
  "bixbo-device-quick-log-v1",
] as const;
const INSTALL_ORIGIN_KEY = "bixbo:install-origin-v3";

export interface CloudAccountStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type CloudAccountOwnershipResult = "bound" | "same" | "switched";

/**
 * Bind the device-local BIXBO diary to the authenticated Supabase user.
 *
 * A BIXBO snapshot historically lived in one device-wide localStorage slot.
 * Without an owner marker, signing into a second Supabase account could merge
 * the first account's diary into the second account. On a real account switch
 * we preserve the raw account-scoped snapshots, clear only account-scoped
 * BIXBO state, mark the new install as fresh, and let cloud sync hydrate the
 * new account. Auth/session storage and device-wide consent/theme state are
 * deliberately untouched.
 */
export function guardCloudAccountOwnership(
  nextUserId: string,
  storage: CloudAccountStorage = window.localStorage,
): CloudAccountOwnershipResult {
  const next = nextUserId.trim();
  if (!next) return "same";

  const previous = storage.getItem(BIXBO_CLOUD_OWNER_KEY);
  if (!previous) {
    storage.setItem(BIXBO_CLOUD_OWNER_KEY, next);
    return "bound";
  }

  if (previous === next) return "same";

  const snapshots: Record<string, string> = {};
  for (const key of ACCOUNT_SCOPED_DATA_KEYS) {
    const raw = storage.getItem(key);
    if (raw != null) snapshots[key] = raw;
  }

  if (Object.keys(snapshots).length) {
    try {
      storage.setItem(
        BIXBO_ACCOUNT_SWITCH_BACKUP_KEY,
        JSON.stringify({
          createdAt: new Date().toISOString(),
          fromUserId: previous,
          toUserId: next,
          snapshots,
        }),
      );
    } catch {
      // A storage quota failure must not make cross-account data contamination possible.
    }
  }

  for (const key of ACCOUNT_SCOPED_DATA_KEYS) storage.removeItem(key);
  for (const key of ACCOUNT_SCOPED_CACHE_KEYS) storage.removeItem(key);

  // A different account must hydrate from its cloud copy rather than treating
  // the just-cleared device state as an existing canonical legacy snapshot.
  storage.setItem(INSTALL_ORIGIN_KEY, "fresh");
  storage.setItem(BIXBO_CLOUD_OWNER_KEY, next);
  return "switched";
}
