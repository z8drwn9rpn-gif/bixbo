import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "@/components/icons/BixboExtraIcons";
import { ensureProfile, fetchPartner, linkPartnerByCode, unlinkPartner, updateProfile, useSession, type CloudProfile } from "@/lib/cloudSync";
import { setPartner, useBixbo } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

function readableError(cause: unknown, fallback: string): { code: string; message: string } {
  if (cause instanceof Error && cause.message.trim()) {
    return { code: "", message: cause.message.trim() };
  }

  if (cause && typeof cause === "object") {
    const raw = cause as ErrorLike;
    const code = typeof raw.code === "string" ? raw.code.trim() : "";
    for (const candidate of [raw.message, raw.details, raw.hint]) {
      if (typeof candidate === "string" && candidate.trim()) {
        return { code, message: candidate.trim() };
      }
    }
    return { code, message: fallback };
  }

  if (typeof cause === "string" && cause.trim()) {
    return { code: "", message: cause.trim() };
  }

  return { code: "", message: fallback };
}

function coupleErrorMessage(cause: unknown, t: (value: string) => string): string {
  const parsed = readableError(cause, t("Couple request failed. Please try again."));
  const normalized = parsed.message.toLowerCase();

  if (parsed.code === "P0002" || normalized.includes("partner is not available for pairing")) {
    return t("Partner sharing is unavailable right now. Make sure both accounts have accepted the current health-data consent. If you were already linked, your connection is still saved and will resume when consent is current on both accounts.");
  }

  if (parsed.code === "42501" || normalized.includes("current health-data consent is required")) {
    return t("Accept the current health-data consent in this BIXBO account before using Couple.");
  }

  if (normalized.includes("cannot link to yourself")) {
    return t("You cannot connect your account to its own pairing code.");
  }

  if (normalized.includes("code required")) {
    return t("Enter your partner's BIXBO pairing code.");
  }

  return parsed.message;
}

export function CoupleSettings({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { data, update } = useBixbo();
  const { session, ready } = useSession();
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [coupleName, setCoupleName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !session) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const preferredName = data.settings.userName?.trim() || data.profile?.nickname?.trim() || data.profile?.name?.trim() || undefined;
    void ensureProfile(preferredName)
      .then((nextProfile) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setCoupleName(nextProfile?.display_name?.trim() || preferredName || "");
      })
      .catch((cause) => { if (!cancelled) setError(coupleErrorMessage(cause, t)); });
    return () => { cancelled = true; };
  }, [data.profile?.name, data.profile?.nickname, data.settings.userName, ready, session, t]);

  const saveCoupleName = async () => {
    const nextName = coupleName.trim();
    if (!nextName) {
      setError(t("Enter a name for Couple."));
      return;
    }
    setSavingName(true);
    setMessage(null);
    setError(null);
    try {
      await updateProfile({ display_name: nextName });
      update((current) => ({ ...current, settings: { ...current.settings, userName: nextName } }));
      setProfile((current) => current ? { ...current, display_name: nextName } : current);
      setCoupleName(nextName);
      setMessage(t("Couple name saved."));
    } catch (cause) {
      setError(coupleErrorMessage(cause, t));
    } finally {
      setSavingName(false);
    }
  };

  const connect = async () => {
    const code = partnerCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const linked = await linkPartnerByCode(code);
      const partner = await fetchPartner();
      setPartner(partner ?? undefined);
      setPartnerCode("");
      setMessage(`${t("Connected to")} ${linked.display_name || t("Partner")}.`);
    } catch (cause) {
      setError(coupleErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await unlinkPartner();
      setPartner(undefined);
      setMessage(t("Partner disconnected."));
    } catch (cause) {
      setError(coupleErrorMessage(cause, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t("Couple Settings")}>
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-28 pt-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> {t("Back to Couple")}
        </button>

        {!ready ? (
          <section className="rounded-3xl bg-surface p-4 ring-1 ring-border">
            <p className="text-sm text-muted-foreground">{t("Checking your account…")}</p>
          </section>
        ) : !session ? (
          <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
            <p className="text-sm font-semibold">{t("Sign in to use Couple")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("Couple pairing uses your BIXBO account.")}</p>
            <Link to="/auth" search={{ next: "/couple" }} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              {t("Sign in")}
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
              <p className="text-sm font-semibold">{t("Your Couple name")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("This name is shown to your partner and in Health Similarity.")}</p>
              <Input value={coupleName} onChange={(event) => setCoupleName(event.target.value)} placeholder={t("Your name")} aria-label={t("Your Couple name")} autoComplete="name" className="mt-3 h-11" />
              <Button type="button" disabled={savingName || !coupleName.trim()} onClick={() => void saveCoupleName()} className="mt-3 w-full">
                {savingName ? t("Saving…") : t("Save name")}
              </Button>
            </section>

            <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
              <p className="text-sm font-semibold">{t("Your pairing code")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("Give this code only to the person you want to connect with.")}</p>
              <div className="mt-3 rounded-2xl bg-tint px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.18em] text-primary">
                {profile?.pairing_code ?? "••••••"}
              </div>
            </section>

            <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
              <p className="text-sm font-semibold">{data.partner ? t("Connected partner") : t("Connect partner")}</p>
              {data.partner ? (
                <>
                  <div className="mt-3 rounded-2xl bg-tint px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{data.partner.name || t("Partner")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("Couple sharing is active.")}</p>
                  </div>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void disconnect()} className="mt-3 w-full">
                    {busy ? t("Working…") : t("Disconnect partner")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">{t("Enter your partner's BIXBO pairing code.")}</p>
                  <Input
                    value={partnerCode}
                    onChange={(event) => {
                      setPartnerCode(event.target.value.toUpperCase());
                      if (error) setError(null);
                    }}
                    placeholder={t("Partner code")}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    maxLength={6}
                    className="mt-3 h-11 font-mono uppercase tracking-wider"
                  />
                  <Button type="button" disabled={busy || !partnerCode.trim()} onClick={() => void connect()} className="mt-3 w-full">
                    {busy ? t("Connecting…") : t("Connect")}
                  </Button>
                </>
              )}
            </section>
          </>
        )}

        {message && <p className="rounded-2xl bg-primary/10 px-3 py-2 text-xs text-foreground">{message}</p>}
        {error && <p role="alert" aria-live="polite" className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">{error}</p>}
      </div>
    </AppShell>
  );
}
