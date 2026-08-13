import { useEffect } from "react";

declare const __BIXBO_BUILD_ID__: string;

type BuildVersionPayload = { id?: string };

function currentUrlWithUpdateBust() {
  const url = new URL(window.location.href);
  url.searchParams.set("__bixbo_update", Date.now().toString());
  return url.toString();
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
        if (!remote.id || remote.id === __BIXBO_BUILD_ID__) return;

        // Store the target build before navigating so a freshly loaded copy cannot loop.
        sessionStorage.setItem("bixbo:last-update-target", remote.id);
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
