const DEVICE_ADMIN_KEY = "bixbo-admin-device";
const ADMIN_USER_ID = "ec7819b0-aed8-4a77-a0d8-3ce2e82fc531";
const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";

function normalizeUserId(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Supabase persists its current auth session in localStorage. This synchronous
 * reader is intentionally small so owner-only UI (including the HAK calendar)
 * can stay hidden before another asynchronous auth request is needed.
 *
 * This is a UI visibility hint, not a server authorization boundary. Any future
 * privileged database/server operation must still authorize the JWT server-side.
 */
export function getCurrentStoredAuthUserId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("sb-") || !key.includes("-auth-token")) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          user?: { id?: unknown };
          currentSession?: { user?: { id?: unknown } };
          session?: { user?: { id?: unknown } };
        };
        const userId = normalizeUserId(
          parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? parsed?.session?.user?.id,
        );
        if (userId) return userId;
      } catch {
        // Ignore unrelated/chunk metadata entries and continue looking.
      }
    }
  } catch {
    // localStorage can be unavailable in restricted/private browser contexts.
  }

  return null;
}

/** Backwards-compatible alias for older imports. */
export function getCurrentStoredAuthEmail(): string | null {
  return null;
}

export function isAdminOwnerAccount(): boolean {
  return getCurrentStoredAuthUserId() === ADMIN_USER_ID;
}

/**
 * The owner-only/admin UI follows the authenticated owner account. The legacy
 * function name is retained because existing Profile components already use it.
 */
export function isDeviceAdminEnabled(): boolean {
  return isAdminOwnerAccount();
}

export function enableDeviceAdmin(): void {
  if (typeof window === "undefined") return;

  if (!isAdminOwnerAccount()) {
    try {
      window.localStorage.removeItem(DEVICE_ADMIN_KEY);
      window.sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
    } catch {
      // Ignore unavailable storage.
    }
    window.location.replace("/profile");
    return;
  }

  try {
    // Retained only for backwards compatibility with older installations.
    // Visibility/access is determined by the authenticated owner user ID above.
    window.localStorage.setItem(DEVICE_ADMIN_KEY, "1");
  } catch {
    // Storage can be unavailable in restricted/private browser contexts.
  }
}

export function disableDeviceAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEVICE_ADMIN_KEY);
    window.sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
