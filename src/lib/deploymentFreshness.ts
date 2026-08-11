import { useEffect } from "react";

function assetFingerprint(root: ParentNode): string {
  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>("script[src]"))
    .map((node) => node.src || node.getAttribute("src") || "")
    .filter((src) => /\/assets\/.+\.js(?:\?|$)/.test(src));
  const styles = Array.from(root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))
    .map((node) => node.href || node.getAttribute("href") || "")
    .filter((href) => /\/assets\/.+\.css(?:\?|$)/.test(href));
  return [...scripts, ...styles]
    .map((value) => value.replace(window.location.origin, ""))
    .sort()
    .join("|");
}

async function hasNewDeployment(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const current = assetFingerprint(document);
  if (!current) return false;

  const response = await fetch(`${window.location.origin}/?__bixbo_deploy_check=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) return false;
  const html = await response.text();
  const remoteDocument = new DOMParser().parseFromString(html, "text/html");
  const remote = assetFingerprint(remoteDocument);
  return Boolean(remote && remote !== current);
}

/** Keep long-running iOS/PWA sessions on the same frontend build across devices. */
export function useDeploymentFreshness() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    let checking = false;

    const check = async () => {
      if (cancelled || checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        if (await hasNewDeployment()) {
          window.location.reload();
        }
      } catch (error) {
        console.debug("BIXBO deployment freshness check skipped", error);
      } finally {
        checking = false;
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
