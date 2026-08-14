import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "@/components/icons/BixboExtraIcons";
import { ensureProfile, fetchPartner, linkPartnerByCode, unlinkPartner, useSession, type CloudProfile } from "@/lib/cloudSync";
import { setPartner, useBixbo } from "@/lib/storage";
import { useI18n } from "@/hooks/useI18n";

export function CoupleSettings({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { data } = useBixbo();
  const { session, ready } = useSession();
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [partnerCode, setPartnerCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !session) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    void ensureProfile()
      .then((nextProfile) => { if (!cancelled) setProfile(nextProfile); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { cancelled = true; };
  }, [ready, session]);

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
      setError(cause instanceof Error ? cause.message : String(cause));
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
      setError(cause instanceof Error ? cause.message : String(cause));
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
                  <Input value={partnerCode} onChange={(event) => setPartnerCode(event.target.value.toUpperCase())} placeholder={t("Partner code")} autoCapitalize="characters" autoCorrect="off" className="mt-3 h-11 font-mono uppercase tracking-wider" />
                  <Button type="button" disabled={busy || !partnerCode.trim()} onClick={() => void connect()} className="mt-3 w-full">
                    {busy ? t("Connecting…") : t("Connect")}
                  </Button>
                </>
              )}
            </section>
          </>
        )}

        {message && <p className="rounded-2xl bg-primary/10 px-3 py-2 text-xs text-foreground">{message}</p>}
        {error && <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      </div>
    </AppShell>
  );
}
