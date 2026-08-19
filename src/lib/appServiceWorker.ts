const APP_SERVICE_WORKER_URL = "/bixbo-push-sw.js";

let appServiceWorkerPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function appServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Register the BIXBO service worker for app-shell/offline resilience regardless
 * of notification permission. Push permission and PushSubscription creation
 * remain separate and are still controlled by the notifications runtime.
 */
export function ensureAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!appServiceWorkerSupported()) return Promise.resolve(null);
  if (appServiceWorkerPromise) return appServiceWorkerPromise;

  appServiceWorkerPromise = (async () => {
    try {
      const registration = await navigator.serviceWorker.register(APP_SERVICE_WORKER_URL, {
        scope: "/",
        updateViaCache: "none",
      });

      await registration.update().catch(() => undefined);
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.warn("BIXBO app service worker:", error);
      return null;
    }
  })();

  return appServiceWorkerPromise;
}
