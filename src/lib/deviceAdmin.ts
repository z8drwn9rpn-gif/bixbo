const DEVICE_ADMIN_KEY = "bixbo-admin-device";
const ADMIN_USER_ID = "ec7819b0-aed8-4a77-a0d8-3ce2e82fc531";
const ADMIN_EMAIL = "lucia.pp2@icloud.com";
const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";

function normalizeUserId(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

type StoredAuthUser = {
  id?: unknown;
  email?: unknown;
};

type StoredAuthSession = {
  user?: StoredAuthUser;
  currentSession?: { user?: StoredAuthUser };
  session?: { user?: StoredAuthUser };
};

function readCurrentStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("sb-") || !key.includes("-auth-token")) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as StoredAuthSession;
        const user = parsed?.user ?? parsed?.currentSession?.user ?? parsed?.session?.user;
        if (user && (normalizeUserId(user.id) || normalizeEmail(user.email))) return user;
      } catch {
        // Ignore unrelated/chunk metadata entries and continue looking.
      }
    }
  } catch {
    // localStorage can be unavailable in restricted/private browser contexts.
  }

  return null;
}

/**
 * Supabase persists its current auth session in localStorage. These synchronous
 * readers are intentionally small so owner-only UI (including the HAK calendar)
 * can stay hidden before another asynchronous auth request is needed.
 *
 * This is a UI visibility hint, not a server authorization boundary. Any future
 * privileged database/server operation must still authorize the JWT server-side.
 */
export function getCurrentStoredAuthUserId(): string | null {
  const user = readCurrentStoredAuthUser();
  const userId = normalizeUserId(user?.id);
  return userId || null;
}

export function getCurrentStoredAuthEmail(): string | null {
  const user = readCurrentStoredAuthUser();
  const email = normalizeEmail(user?.email);
  return email || null;
}

export function isAdminOwnerAccount(): boolean {
  // Keep the hardened UUID check, but also preserve the original account-level
  // requirement: HAK belongs to the owner's signed-in email. This matters when
  // the same owner account is represented by a different auth identity/provider
  // in another browser (for example Samsung Internet vs Chrome).
  return (
    getCurrentStoredAuthUserId() === ADMIN_USER_ID ||
    getCurrentStoredAuthEmail() === ADMIN_EMAIL
  );
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
    // Visibility/access is determined by the authenticated owner account above.
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
