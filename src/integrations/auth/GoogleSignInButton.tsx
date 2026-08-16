import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/client";

export const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
export const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  "545023380659-ovg56o3vo09oari9g02qodvdbtt42hep.apps.googleusercontent.com";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleMomentNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
};

type GoogleIdentityApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void | Promise<void>;
    nonce: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "rectangular";
      logo_alignment: "left";
      width: number;
    },
  ) => void;
  prompt: (callback?: (notification: GoogleMomentNotification) => void) => void;
};

type GoogleIdentityGlobal = {
  accounts: {
    id: GoogleIdentityApi;
  };
};

type GoogleWindow = Window & {
  google?: GoogleIdentityGlobal;
};

let googleIdentityScriptPromise: Promise<GoogleIdentityGlobal> | null = null;

function currentGoogle(): GoogleIdentityGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as GoogleWindow).google;
}

export function loadGoogleIdentity(): Promise<GoogleIdentityGlobal> {
  const ready = currentGoogle();
  if (ready?.accounts?.id) return Promise.resolve(ready);
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise<GoogleIdentityGlobal>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Google sign-in is only available in a browser."));
      return;
    }

    const finish = () => {
      const google = currentGoogle();
      if (google?.accounts?.id) resolve(google);
      else reject(new Error("Google sign-in could not be loaded."));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google sign-in could not be loaded.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.dataset.bixboGoogleIdentity = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google sign-in could not be loaded.")),
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error) => {
    googleIdentityScriptPromise = null;
    throw error;
  });

  return googleIdentityScriptPromise;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createGoogleNonce(): Promise<{ raw: string; hashed: string }> {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
    throw new Error("Secure Google sign-in is not supported by this browser.");
  }

  const raw = base64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

function googleErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Google sign-in could not be completed. Please try again.";
}

export function GoogleSignInButton({
  disabled = false,
  promptOnLoad = false,
  onBusyChange,
  onSuccess,
  onError,
}: {
  disabled?: boolean;
  promptOnLoad?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onBusyChangeRef = useRef(onBusyChange);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onBusyChange, onError, onSuccess]);

  const reportError = useCallback((error: unknown) => {
    onBusyChangeRef.current?.(false);
    onErrorRef.current?.(googleErrorMessage(error));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      setLoading(true);
      try {
        const [google, nonce] = await Promise.all([loadGoogleIdentity(), createGoogleNonce()]);
        if (cancelled || !hostRef.current) return;

        google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          nonce: nonce.hashed,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            if (!response.credential) {
              reportError(new Error("Google did not return a sign-in credential."));
              return;
            }

            onBusyChangeRef.current?.(true);
            try {
              const { error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
                nonce: nonce.raw,
              });
              if (error) throw error;
              onBusyChangeRef.current?.(false);
              onSuccessRef.current?.();
            } catch (error) {
              reportError(error);
            }
          },
        });

        const host = hostRef.current;
        host.replaceChildren();
        const measuredWidth = Math.round(host.getBoundingClientRect().width || 360);
        google.accounts.id.renderButton(host, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.max(240, Math.min(400, measuredWidth)),
        });
        setLoading(false);

        if (promptOnLoad) {
          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed?.()) {
              const reason = notification.getNotDisplayedReason?.();
              if (reason) console.info(`[Google Identity] prompt not displayed: ${reason}`);
            } else if (notification.isSkippedMoment?.()) {
              const reason = notification.getSkippedReason?.();
              if (reason) console.info(`[Google Identity] prompt skipped: ${reason}`);
            }
          });
        }
      } catch (error) {
        if (cancelled) return;
        setLoading(false);
        reportError(error);
      }
    };

    void mount();
    return () => {
      cancelled = true;
    };
  }, [promptOnLoad, reportError]);

  return (
    <div
      className={`relative min-h-11 w-full overflow-hidden rounded-xl ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-busy={loading || undefined}
      data-bixbo-google-id-token="true"
    >
      <div ref={hostRef} className="flex min-h-11 w-full items-center justify-center" />
      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-semibold text-muted-foreground">
          Loading Google…
        </div>
      ) : null}
    </div>
  );
}
