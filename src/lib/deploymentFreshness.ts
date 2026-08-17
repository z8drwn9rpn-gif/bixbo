import { useEffect } from "react";

const DEPLOYMENT_RELOAD_GUARD_KEY = "bixbo:deployment-reload-guard:v2";
const DEPLOYMENT_RELOAD_GUARD_MS = 5 * 60_000;
const DEPLOYMENT_CHECK_COOLDOWN_MS = 15_000;
const DEPLOYMENT_REFRESH_PARAM = "__bixbo_deploy_refresh";
const DEPLOYMENT_CHECK_PARAM = "__bixbo_deploy_check";

let inDocumentReloadTarget = "";
let lastDeploymentCheckAt = 0;

function normalizeAssetUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function assetFingerprint(root: ParentNode): string {
  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>("script[src]"))
    .map((node) => node.getAttribute("src") || node.src || "")
    .filter((src) => /\/assets\/.+\.js(?:\?|$)/.test(src));
  const styles = Array.from(root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))
    .map((node) => node.getAttribute("href") || node.href || "")
    .filter((href) => /\/assets\/.+\.css(?:\?|$)/.test(href));
  return [...scripts, ...styles].map(normalizeAssetUrl).sort().join("|");
}

function clearReloadGuard(): void {
  inDocumentReloadTarget = "";
  try {
    window.sessionStorage.removeItem(DEPLOYMENT_RELOAD_GUARD_KEY);
  } catch {
    // Restricted storage must not make freshness checks fail.
  }
}

function mayReloadForTarget(target: string): boolean {
  if (!target || inDocumentReloadTarget === target) return false;
  const now = Date.now();

  try {
    const raw = window.sessionStorage.getItem(DEPLOYMENT_RELOAD_GUARD_KEY);
    if (raw) {
      const previous = JSON.parse(raw) as { target?: unknown; at?: unknown };
      if (
        previous.target === target &&
        typeof previous.at === "number" &&
        now - previous.at < DEPLOYMENT_RELOAD_GUARD_MS
      ) {
        return false;
      }
    }
    window.sessionStorage.setItem(DEPLOYMENT_RELOAD_GUARD_KEY, JSON.stringify({ target, at: now }));
  } catch {
    // The in-document guard still prevents duplicate reloads when storage is restricted.
  }

  inDocumentReloadTarget = target;
  return true;
}

function currentRouteCheckUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(DEPLOYMENT_REFRESH_PARAM);
  url.searchParams.delete("__bixbo_update");
  url.searchParams.set(DEPLOYMENT_CHECK_PARAM, Date.now().toString());
  return url.toString();
}

function currentUrlWithDeploymentBust(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(DEPLOYMENT_CHECK_PARAM);
  url.searchParams.set(DEPLOYMENT_REFRESH_PARAM, Date.now().toString());
  return url.toString();
}

function cleanupDeploymentRefreshParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(DEPLOYMENT_REFRESH_PARAM)) return;
  url.searchParams.delete(DEPLOYMENT_REFRESH_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

async function deploymentTarget(): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const current = assetFingerprint(document);
  if (!current) return null;

  // Compare the current route with the same route from the server. Comparing
  // /couple with / (Home) produces different route chunks even on the same
  // deployment and can manufacture an infinite "new deployment" signal.
  const response = await fetch(currentRouteCheckUrl(), {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) return null;
  const html = await response.text();
  const remoteDocument = new DOMParser().parseFromString(html, "text/html");
  const remote = assetFingerprint(remoteDocument);
  if (!remote || remote === current) {
    clearReloadGuard();
    return null;
  }
  return remote;
}

/**
 * Keep a long-running iOS/PWA session on the newest frontend build without a
 * background polling loop. Freshness is checked only when the user returns to
 * or focuses BIXBO, and repeated lifecycle events are collapsed by cooldown.
 */
export function useDeploymentFreshness() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    let checking = false;

    cleanupDeploymentRefreshParam();

    const check = async () => {
      const now = Date.now();
      if (
        cancelled ||
        checking ||
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        now - lastDeploymentCheckAt < DEPLOYMENT_CHECK_COOLDOWN_MS
      ) return;

      checking = true;
      lastDeploymentCheckAt = now;
      try {
        const target = await deploymentTarget();
        if (!target || !mayReloadForTarget(target)) return;

        // A cache-busted navigation gives iOS WebKit a new document URL. The
        // persisted target guard prevents the same stale document from
        // reloading again if WebKit still serves the previous frontend build.
        window.location.replace(currentUrlWithDeploymentBust());
      } catch (error) {
        console.debug("BIXBO deployment freshness check skipped", error);
      } finally {
        checking = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => void check();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
