// BIXBO account OAuth adapter.
// App sign-in must create the same Supabase session used by cloud sync,
// Couple sharing and remote push notifications.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google" | "apple" | "lovable";

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
      if (provider === "lovable") {
        return { error: new Error("Lovable OAuth is not used for BIXBO account sign-in."), redirected: false };
      }

      const queryParams: Record<string, string> = { ...(opts?.extraParams ?? {}) };
      if (provider === "google" && !queryParams.prompt) queryParams.prompt = "select_account";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          queryParams,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error, redirected: false };
      if (!data.url) return { error: new Error("OAuth provider did not return a sign-in URL."), redirected: false };

      window.location.assign(data.url);
      return { error: null, redirected: true };
    },
  },
};
