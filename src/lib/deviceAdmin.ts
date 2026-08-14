import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_ADMIN_KEY = "bixbo-admin-device";
const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";

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

export function isAdminOwnerAccount(): boolean {
  return getCurrentStoredAuthUser()?.app_metadata?.bixbo_owner === true;
}

let ownerRefreshInFlight: Promise<void> | null = null;

/**
 * Refresh the JWT once so server-owned `app_metadata` changes are reflected in
 * Supabase's persisted session. No personal owner UUID/email and no editable
 * local "owner=true" cache is embedded in the frontend.
 */
async function refreshOwnerClaim(): Promise<void> {
  if (typeof window === "undefined") return;
  if (ownerRefreshInFlight) return ownerRefreshInFlight;

  const wasOwner = isAdminOwnerAccount();
  ownerRefreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      const nextOwner = data.session?.user?.app_metadata?.bixbo_owner === true;

      // Existing owner-only components read the persisted session synchronously.
      // Reload only for the one-time transition from an old token to the newly
      // issued signed owner claim.
      if (nextOwner && !wasOwner) window.location.reload();
    } catch {
      // A refresh/network failure must never grant owner access.
    } finally {
      ownerRefreshInFlight = null;
    }
  })();

  return ownerRefreshInFlight;
}

export function useOwnerAccessSync(): void {
  useEffect(() => {
    void refreshOwnerClaim();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        try {
          window.localStorage.removeItem(DEVICE_ADMIN_KEY);
          window.sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
        } catch {
          // Ignore unavailable storage.
        }
        return;
      }

      // SIGNED_IN can occur with a token minted before a server-side owner claim
      // was added. Do not recurse on TOKEN_REFRESHED.
      if (event === "SIGNED_IN") void refreshOwnerClaim();
    });

    return () => data.subscription.unsubscribe();
  }, []);
}

/**
 * The owner-only/admin UI follows the authenticated server-issued owner claim.
 * The legacy function name is retained because existing Profile components use it.
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
    // Kept only for backwards compatibility with older installations. It is not
    // used as an authorization or owner-visibility signal.
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
