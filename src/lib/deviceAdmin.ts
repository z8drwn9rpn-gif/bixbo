import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_ADMIN_KEY = "bixbo-admin-device";
const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";
const OWNER_CACHE_KEY = "bixbo-owner-account";

function normalizeUserId(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

type StoredAuthUser = {
  id?: unknown;
  app_metadata?: { bixbo_owner?: unknown };
};

function getCurrentStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("sb-") || !key.includes("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          user?: StoredAuthUser;
          currentSession?: { user?: StoredAuthUser };
          session?: { user?: StoredAuthUser };
        };
        const user = parsed?.user ?? parsed?.currentSession?.user ?? parsed?.session?.user;
        if (user && normalizeUserId(user.id)) return user;
      } catch {
        // Ignore unrelated/chunk metadata entries and continue looking.
      }
    }
  } catch {
    // localStorage can be unavailable in restricted/private browser contexts.
  }

  return null;
}

export function getCurrentStoredAuthUserId(): string | null {
  return normalizeUserId(getCurrentStoredAuthUser()?.id) || null;
}

/** Backwards-compatible alias for older imports. */
export function getCurrentStoredAuthEmail(): string | null {
  return null;
}

function cachedOwnerAccess(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OWNER_CACHE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isAdminOwnerAccount(): boolean {
  const metadataOwner = getCurrentStoredAuthUser()?.app_metadata?.bixbo_owner === true;
  return metadataOwner || cachedOwnerAccess();
}

/**
 * Refresh the owner claim from Supabase Auth. `app_metadata` is issued by the
 * auth server and cannot be changed through normal client profile updates.
 * No personal email/user UUID is embedded in the frontend bundle anymore.
 */
async function refreshOwnerAccess(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const nextOwner = data.user?.app_metadata?.bixbo_owner === true;
    const previousOwner = cachedOwnerAccess();
    window.localStorage.setItem(OWNER_CACHE_KEY, nextOwner ? "1" : "0");

    // Existing owner-only components read the flag synchronously. One reload on
    // a newly issued owner claim makes the transition immediate and deterministic.
    if (nextOwner && !previousOwner) window.location.reload();
  } catch {
    // A network failure must not grant access; retain only a currently signed
    // token's server-issued metadata claim.
    if (getCurrentStoredAuthUser()?.app_metadata?.bixbo_owner !== true) {
      try { window.localStorage.removeItem(OWNER_CACHE_KEY); } catch { /* unavailable storage */ }
    }
  }
}

export function useOwnerAccessSync(): void {
  useEffect(() => {
    void refreshOwnerAccess();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try {
          window.localStorage.removeItem(OWNER_CACHE_KEY);
          window.localStorage.removeItem(DEVICE_ADMIN_KEY);
          window.sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
        } catch {
          // Ignore unavailable storage.
        }
        return;
      }
      void refreshOwnerAccess();
    });
    return () => data.subscription.unsubscribe();
  }, []);
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
    // Visibility/access is determined by the signed owner claim above.
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
