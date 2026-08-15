import { useEffect, useRef, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";

import {
  authenticateBiometric,
  biometricSupported,
  useDevicePrivacy,
  verifyPin,
} from "@/lib/devicePrivacy";

export function AppPrivacyGuard({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { prefs } = useDevicePrivacy();
  const [covered, setCovered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const bypass = typeof window !== "undefined" && window.location.pathname.startsWith("/auth");
  const lockEnabled = !bypass && (prefs.biometricLock || prefs.pinLock);
  const interactionBlocked = covered || locked;

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    if (interactionBlocked) node.setAttribute("inert", "");
    else node.removeAttribute("inert");
    return () => node.removeAttribute("inert");
  }, [interactionBlocked]);

  useEffect(() => {
    if (!lockEnabled) {
      setLocked(false);
      return;
    }
    setLocked(true);
  }, [lockEnabled]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (prefs.privacyScreen) setCovered(true);
        if (lockEnabled) setLocked(true);
      } else {
        setCovered(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lockEnabled, prefs.privacyScreen]);

  const unlockBiometric = async () => {
    setError("");
    if (!biometricSupported()) {
      setError(t("Biometric/passkey verification is not available on this device."));
      return;
    }
    if (await authenticateBiometric()) {
      setLocked(false);
      setPin("");
    } else {
      setError(t("Verification was cancelled or failed."));
    }
  };

  const unlockPin = async () => {
    setError("");
    if (await verifyPin(pin)) {
      setLocked(false);
      setPin("");
      return;
    }
    setError(t("Incorrect PIN."));
  };

  return (
    <>
      <div ref={contentRef} className="contents" aria-hidden={interactionBlocked ? true : undefined}>
        {children}
      </div>

      {covered && (
        <div className="fixed inset-0 z-[9998] grid place-items-center bg-background text-foreground">
          <div className="text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-serif text-xl font-semibold">BIXBO</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("Private health data hidden")}</p>
          </div>
        </div>
      )}

      {locked && !covered && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-background px-6 text-foreground">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5 shadow-xl ring-1 ring-border">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-3 text-center font-serif text-2xl font-semibold">{t("Unlock BIXBO")}</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">{t("Device protection is enabled.")}</p>

            <div className="mt-5 space-y-3">
              {prefs.biometricLock && (
                <button
                  type="button"
                  onClick={() => void unlockBiometric()}
                  className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  {t("Use Face ID / biometrics")}
                </button>
              )}

              {prefs.pinLock && (
                <div className="space-y-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void unlockPin();
                    }}
                    placeholder={t("PIN")}
                    aria-label={t("BIXBO PIN")}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-center text-lg tracking-[0.25em]"
                  />
                  <button
                    type="button"
                    onClick={() => void unlockPin()}
                    disabled={pin.length < 4}
                    className="min-h-11 w-full rounded-xl border border-input px-4 text-sm font-semibold disabled:opacity-50"
                  >
                    {t("Unlock with PIN")}
                  </button>
                </div>
              )}

              {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
