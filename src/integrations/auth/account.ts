type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google";

export const PRODUCTION_APP_ORIGIN = "https://bixbo.z8drwn9rpn.workers.dev";

export function oauthReturnUrlForLocation(hostname: string, origin: string): string {
  const normalizedHost = hostname.trim().toLowerCase();
  const isLocal = normalizedHost === "localhost" || normalizedHost === "127.0.0.1" || normalizedHost === "[::1]";
  const isLovablePreview = normalizedHost === "bixbo.lovable.app" || normalizedHost.endsWith(".lovable.app");
  if (isLocal || isLovablePreview) return PRODUCTION_APP_ORIGIN;
  return origin || PRODUCTION_APP_ORIGIN;
}

function defaultOAuthOrigin(): string {
  if (typeof window === "undefined") return PRODUCTION_APP_ORIGIN;
  return oauthReturnUrlForLocation(window.location.hostname, window.location.origin);
}

function safeInternalNext(next?: string): string | undefined {
  if (!next) return undefined;
  const value = next.trim();
  const hasControl = [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || hasControl) return undefined;
  try {
    const base = new URL("https://bixbo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return undefined;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return undefined;
  }
}

export function oauthCallbackUrl(next?: string): string {
  const url = new URL("/auth", defaultOAuthOrigin());
  const safeNext = safeInternalNext(next);
  if (safeNext) url.searchParams.set("next", safeNext);
  return url.toString();
}

export function googleIdentityEntryUrl(next?: string, prompt = false): string {
  const url = new URL("/auth", defaultOAuthOrigin());
  const safeNext = safeInternalNext(next);
  if (safeNext) url.searchParams.set("next", safeNext);
  if (prompt) url.searchParams.set("google", "1");
  return url.toString();
}

export function safeOAuthRedirectUrl(candidate?: string): string {
  const fallbackOrigin = defaultOAuthOrigin();
  if (!candidate) return oauthCallbackUrl();

  try {
    const parsed = new URL(candidate, fallbackOrigin);
    const allowedOrigins = new Set([fallbackOrigin, PRODUCTION_APP_ORIGIN]);
    if (!allowedOrigins.has(parsed.origin)) return oauthCallbackUrl();

    const safeOrigin = oauthReturnUrlForLocation(parsed.hostname, parsed.origin);
    const target = new URL(parsed.pathname || "/auth", safeOrigin);
    target.search = parsed.search;
    target.hash = parsed.hash;
    return target.toString();
  } catch {
    return oauthCallbackUrl();
  }
}

function nextFromRedirectUri(candidate?: string): string | undefined {
  if (!candidate) return undefined;
  try {
    const safeRedirect = new URL(safeOAuthRedirectUrl(candidate));
    return safeInternalNext(safeRedirect.searchParams.get("next") ?? undefined);
  } catch {
    return undefined;
  }
}

export const accountAuth = {
  signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
    if (provider !== "google") {
      return { error: new Error(`Unsupported OAuth provider: ${provider}`), redirected: false };
    }

    if (typeof window === "undefined") {
      return { error: new Error("Google sign-in is only available in a browser."), redirected: false };
    }

    // The old Supabase OAuth code-exchange path depends on a Google client secret
    // and is intentionally no longer used. Route every legacy Google entry point
    // through the browser Google Identity / ID-token sign-in page instead.
    const next = nextFromRedirectUri(opts?.redirect_uri);
    const destination = googleIdentityEntryUrl(next, true);
    window.location.assign(destination);
    return { error: null, redirected: true };
  },
};
