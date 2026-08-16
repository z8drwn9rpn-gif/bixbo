const RECOVERY_KEY = "bixbo:stale-asset-recovery-v1";
const RECOVERY_WINDOW_MS = 30_000;

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = "cause" in error ? error.cause : undefined;
    return [error.name, error.message, error.stack, cause ? errorText(cause) : ""].filter(Boolean).join(" ").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}

/** Errors produced when a long-running PWA tries to load chunks from an older deployment. */
export function isStaleAssetLoadError(error: unknown): boolean {
  const text = errorText(error);
  return [
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed",
    "failed to load module script",
    "chunkloaderror",
    "loading chunk",
    "unable to preload css",
  ].some((pattern) => text.includes(pattern));
}

/**
 * Reload at most once per location in a short window. A fresh document receives
 * the current hashed route chunks; the guard prevents an actual code bug from
 * turning into a reload loop.
 */
export function recoverFromStaleAssetError(error: unknown): boolean {
  if (typeof window === "undefined" || !isStaleAssetLoadError(error)) return false;

  const locationKey = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const now = Date.now();

  try {
    const raw = window.sessionStorage.getItem(RECOVERY_KEY);
    if (raw) {
      const previous = JSON.parse(raw) as { location?: unknown; at?: unknown };
      if (
        previous.location === locationKey &&
        typeof previous.at === "number" &&
        now - previous.at < RECOVERY_WINDOW_MS
      ) {
        return false;
      }
    }
    window.sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ location: locationKey, at: now }));
  } catch {
    // Restricted storage must not block recovery.
  }

  window.location.reload();
  return true;
}

export function clearStaleAssetRecoveryGuard(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Ignore restricted storage contexts.
  }
}
