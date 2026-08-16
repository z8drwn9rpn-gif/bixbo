import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google";

export const PRODUCTION_APP_ORIGIN = "https://bixbo.z8drwn9rpn.workers.dev";

export function oauthReturnUrlForLocation(hostname: string, origin: string): string {
  const normalizedHost = hostname.trim().toLowerCase();
  const isLocal = normalizedHost === "localhost" || normalizedHost === "127.0.0.1" || normalizedHost === "[::1]";
  if (isLocal) return PRODUCTION_APP_ORIGIN;
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

export const accountAuth = {
  signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
    const queryParams: Record<string, string> = { ...(opts?.extraParams ?? {}) };
    if (!queryParams.prompt) queryParams.prompt = "select_account";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: safeOAuthRedirectUrl(opts?.redirect_uri ?? oauthCallbackUrl()),
        queryParams,
      },
    });

    return { error, redirected: !error };
  },
};
