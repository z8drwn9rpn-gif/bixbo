// BIXBO account OAuth adapter backed directly by the owned Supabase project.
// App sign-in must create the same Supabase session used by cloud sync,
// Couple sharing and remote push notifications.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google" | "apple";

const PRODUCTION_APP_ORIGIN = "https://bixbo.z8drwn9rpn.workers.dev";

function defaultOAuthReturnUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_APP_ORIGIN;

  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const isLovablePreview = hostname === "bixbo.lovable.app" || hostname.endsWith(".lovable.app");

  // Production auth must never fall back to localhost or an editor/preview host.
  if (isLocal || isLovablePreview) return PRODUCTION_APP_ORIGIN;
  return origin || PRODUCTION_APP_ORIGIN;
}

export const accountAuth = {
  signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
    const queryParams: Record<string, string> = { ...(opts?.extraParams ?? {}) };
    if (provider === "google" && !queryParams.prompt) queryParams.prompt = "select_account";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: opts?.redirect_uri ?? defaultOAuthReturnUrl(),
        queryParams,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error, redirected: false };
    if (!data.url) return { error: new Error("OAuth provider did not return a sign-in URL."), redirected: false };

    window.location.assign(data.url);
    return { error: null, redirected: true };
  },
};
