import { useEffect } from "react";

let buildFingerprint = "";
let buildLookupStarted = false;

function safePath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

async function loadBuildFingerprint(): Promise<string> {
  if (buildFingerprint || buildLookupStarted || typeof window === "undefined") return buildFingerprint;
  buildLookupStarted = true;
  try {
    const response = await fetch(`/build-info.json?monitor=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return "";
    const value = await response.json() as { commit?: unknown };
    if (typeof value.commit === "string") buildFingerprint = value.commit.slice(0, 40);
  } catch {
    // Monitoring must never affect app behavior.
  }
  return buildFingerprint;
}

export function reportClientError(source: "window-error" | "unhandled-rejection" | "route-error", error: unknown): void {
  if (typeof window === "undefined" || import.meta.env.DEV) return;
  const name = error instanceof Error ? error.name : typeof error === "object" && error !== null
    ? error.constructor?.name || "Error"
    : "Error";

  void loadBuildFingerprint().finally(() => {
    const body = JSON.stringify({ source, name, path: safePath(), build: buildFingerprint });
    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon("/api/public/client-error", new Blob([body], { type: "application/json" }));
        if (sent) return;
      }
      void fetch("/api/public/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => undefined);
    } catch {
      // Reporting errors are intentionally swallowed.
    }
  });
}

export function useClientErrorMonitoring(): void {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    void loadBuildFingerprint();

    const onError = (event: ErrorEvent) => reportClientError("window-error", event.error ?? new Error("WindowError"));
    const onRejection = (event: PromiseRejectionEvent) => reportClientError("unhandled-rejection", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
}
