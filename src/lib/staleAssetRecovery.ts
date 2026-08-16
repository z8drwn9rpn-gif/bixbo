const RECOVERY_KEY = "bixbo:stale-asset-recovery-v1";
const RECOVERY_WINDOW_MS = 30_000;

let recoveryTriggeredInDocument = false;

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
    "not a valid javascript mime type for module script",
    "chunkloaderror",
    "loading chunk",
    "unable to preload css",
  ].some((pattern) => text.includes(pattern));
}

/** True for build-owned JavaScript/CSS chunks, but not images or user content. */
export function isStaleBuildAssetUrl(value: string): boolean {
  try {
    const parsed = new URL(value, "https://bixbo.invalid/");
    return parsed.pathname.startsWith("/assets/") && /\.(?:css|m?js)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function triggerRecovery(): boolean {
  if (typeof window === "undefined") return false;

  // Multiple CSS/JS tags from the same stale route can fail in the same event
  // turn. Once a reload is already underway, treat the sibling failures as part
  // of the same recovery instead of recording several scary duplicate errors.
  if (recoveryTriggeredInDocument) return true;

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

  recoveryTriggeredInDocument = true;
  window.location.reload();
  return true;
}

/**
 * Reload at most once per location in a short window. A fresh document receives
 * the current hashed route chunks; the guard prevents an actual code bug from
 * turning into a reload loop.
 */
export function recoverFromStaleAssetError(error: unknown): boolean {
  if (typeof window === "undefined" || !isStaleAssetLoadError(error)) return false;
  return triggerRecovery();
}

/** Recover direct <script>/<link> failures where Safari does not provide a useful Error object. */
export function recoverFromStaleAssetUrl(value: string): boolean {
  if (typeof window === "undefined" || !isStaleBuildAssetUrl(value)) return false;

  try {
    const parsed = new URL(value, window.location.href);
    if (parsed.origin !== window.location.origin) return false;
  } catch {
    return false;
  }

  return triggerRecovery();
}

function resourceUrlForTarget(target: EventTarget | null): string | null {
  if (typeof HTMLScriptElement !== "undefined" && target instanceof HTMLScriptElement) {
    return target.src || null;
  }
  if (typeof HTMLLinkElement !== "undefined" && target instanceof HTMLLinkElement) {
    const rel = target.rel.toLowerCase();
    if (rel === "stylesheet" || rel === "modulepreload" || rel === "preload") return target.href || null;
  }
  return null;
}

// Resource-load errors do not bubble and Safari often gives no Error object for
// them. Install this capture listener as early as the module is evaluated so a
// stale route's CSS/JS can recover before the diagnostics recorder logs it as a
// permanent application failure.
if (typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (event) => {
      const url = resourceUrlForTarget(event.target);
      if (!url) return;
      if (!recoverFromStaleAssetUrl(url)) return;
      event.stopImmediatePropagation();
    },
    true,
  );
}

export function clearStaleAssetRecoveryGuard(): void {
  recoveryTriggeredInDocument = false;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Ignore restricted storage contexts.
  }
}
