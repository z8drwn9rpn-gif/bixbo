const DEVICE_ADMIN_KEY = "bixbo-admin-device";
const ADMIN_EMAIL = "luciapaulovicova2@gmail.com";
const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Supabase persists its current auth session in localStorage. This synchronous
 * reader is intentionally small so Profile can decide whether the Admin row
 * should be rendered during the first client render without another async
 * loading state.
 */
export function getCurrentStoredAuthEmail(): string | null {
  if (typeof window === "undefined") return null;

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("sb-") || !key.includes("-auth-token")) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          user?: { email?: unknown };
          currentSession?: { user?: { email?: unknown } };
          session?: { user?: { email?: unknown } };
        };
        const email = normalizeEmail(
          parsed?.user?.email ?? parsed?.currentSession?.user?.email ?? parsed?.session?.user?.email,
        );
        if (email) return email;
      } catch {
        // Ignore unrelated/chunk metadata entries and continue looking.
      }
    }
  } catch {
    // localStorage can be unavailable in restricted/private browser contexts.
  }

  return null;
}

export function isAdminOwnerAccount(): boolean {
  return getCurrentStoredAuthEmail() === ADMIN_EMAIL;
}

/**
 * Kept under the old function name because Profile already uses it to decide
 * whether to show the Admin row. The source of truth is now the signed-in
 * owner account, not a device flag.
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
    // Visibility/access is now determined by ADMIN_EMAIL above.
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
