import { useEffect } from "react";

declare const __BIXBO_BUILD_ID__: string;

type BuildVersionPayload = { id?: string };

const UPDATE_TARGET_KEY = "bixbo:last-update-target";
const UPDATE_ATTEMPT_KEY = "bixbo:last-update-at";
const UPDATE_RELOAD_GUARD_MS = 5 * 60_000;

function currentUrlWithUpdateBust() {
  const url = new URL(window.location.href);
  url.searchParams.set("__bixbo_update", Date.now().toString());
  return url.toString();
}

function clearUpdateGuard(): void {
  try {
    sessionStorage.removeItem(UPDATE_TARGET_KEY);
    sessionStorage.removeItem(UPDATE_ATTEMPT_KEY);
  } catch {
    // Restricted storage must not break update checks.
  }
}

function mayReloadForTarget(target: string): boolean {
  const now = Date.now();
  try {
    const previousTarget = sessionStorage.getItem(UPDATE_TARGET_KEY);
    const previousAt = Number(sessionStorage.getItem(UPDATE_ATTEMPT_KEY) ?? 0);
    if (previousTarget === target && Number.isFinite(previousAt) && now - previousAt < UPDATE_RELOAD_GUARD_MS) {
      return false;
    }
    sessionStorage.setItem(UPDATE_TARGET_KEY, target);
    sessionStorage.setItem(UPDATE_ATTEMPT_KEY, String(now));
  } catch {
    // If storage is restricted, the current document's `checking` guard still
    // prevents concurrent update attempts.
  }
  return true;
}

export function useAppAutoUpdate() {
  useEffect(() => {
    let cancelled = false;
    let checking = false;

    const checkForUpdate = async () => {
      if (cancelled || checking || !navigator.onLine) return;
      checking = true;
      try {
        const response = await fetch(`/bixbo-build.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        });
        if (!response.ok) return;
        const remote = (await response.json()) as BuildVersionPayload;
        if (!remote.id) return;
        if (remote.id === __BIXBO_BUILD_ID__) {
          clearUpdateGuard();
          return;
        }
        if (!mayReloadForTarget(remote.id)) return;

        window.location.replace(currentUrlWithUpdateBust());
      } catch {
        // Offline / transient network failure: keep the current app running.
      } finally {
        checking = false;
      }
    };

    const cleanupUpdateParam = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("__bixbo_update")) return;
      url.searchParams.delete("__bixbo_update");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    };

    cleanupUpdateParam();
    void checkForUpdate();

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    const onFocus = () => void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), 5 * 60 * 1000);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
