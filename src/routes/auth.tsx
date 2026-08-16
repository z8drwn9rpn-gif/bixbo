import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/useI18n";
import { oauthReturnUrlForLocation } from "@/integrations/auth/account";
import { oauthCallbackErrorMessage, safeOAuthSearchText } from "@/integrations/auth/oauthCallback";
import { supabase } from "@/integrations/supabase/client";
import {
  clearLocalCloudHealthConsentWithdrawn,
  clearPendingLegalConsent,
  cloudHealthConsentState,
  finalizePendingLegalConsent,
  stagePendingLegalConsent,
} from "@/lib/legalConsent";

export function safeInternalNext(value: unknown): string {
  if (typeof value !== "string") return "";
  const hasControl = [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || hasControl) return "";
  try {
    const base = new URL("https://bixbo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return "";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}

type AuthSearch = {
  next: string;
  oauthError?: string;
  oauthErrorCode?: string;
  oauthErrorDescription?: string;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: safeInternalNext(search.next),
    oauthError: safeOAuthSearchText(search.error) || undefined,
    oauthErrorCode: safeOAuthSearchText(search.error_code) || undefined,
    oauthErrorDescription: safeOAuthSearchText(search.error_description) || undefined,
  }),
  head: () => ({ meta: [
    { title: "BIXBO — Sign in" },
    { name: "description", content: "Sign in to sync your BIXBO diary across devices and share with your partner." },
  ] }),
  component: AuthPage,
});

const SIGNUP_COPY = {
  en: {
    terms: "I accept the Terms of Service.",
    privacy: "I have read the Privacy Policy.",
    health: "I explicitly consent to BIXBO processing the health and other special-category data I choose to store in my cloud account so the requested diary, sync, backup and sharing features can work.",
    required: "Accept the Terms, read the Privacy Policy and give separate explicit health-data consent to create a cloud account.",
  },
  sk: {
    terms: "Súhlasím s Podmienkami používania.",
    privacy: "Prečítala/prečítal som si Ochranu súkromia.",
    health: "Výslovne súhlasím so spracúvaním zdravotných a ďalších údajov osobitnej kategórie, ktoré sa rozhodnem uložiť do svojho BIXBO cloudového účtu, aby mohli fungovať požadované funkcie denníka, synchronizácie, záloh a zdieľania.",
    required: "Pre vytvorenie cloudového účtu prijmi Podmienky, prečítaj si Ochranu súkromia a udeľ samostatný výslovný súhlas so zdravotnými údajmi.",
  },
} as const;

function AuthPage() {
  const navigate = useNavigate();
  const { next, oauthError, oauthErrorCode, oauthErrorDescription } = Route.useSearch();
  const { t, language } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const finishingRef = useRef(false);
  const signupCopy = SIGNUP_COPY[language];
  const legalReady = termsAccepted && privacyAcknowledged && healthConsent;

  const callbackErrorMessage = useMemo(
    () => oauthCallbackErrorMessage({ oauthError, oauthErrorCode, oauthErrorDescription }, t),
    [oauthError, oauthErrorCode, oauthErrorDescription, t],
  );
  const [msg, setMsg] = useState<string | null>(callbackErrorMessage);

  useEffect(() => {
    if (callbackErrorMessage) setMsg(callbackErrorMessage);
  }, [callbackErrorMessage]);

  const finishAuth = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      const shouldOnboard = await finalizePendingLegalConsent();
      const consentState = await cloudHealthConsentState();

      if (consentState !== "active") {
        void navigate({ to: "/privacy" as never });
        return;
      }
      clearLocalCloudHealthConsentWithdrawn();

      if (next) {
        window.location.replace(next);
        return;
      }
      void navigate({ to: shouldOnboard ? "/onboarding" as never : "/settings" });
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
      finishingRef.current = false;
    }
  }, [navigate, next]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!cancelled && data.session) void finishAuth();
    }).catch((error) => { if (!cancelled) setMsg(error instanceof Error ? error.message : String(error)); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) void finishAuth();
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [finishAuth]);

  const authReturnUrl = () => {
    const returnOrigin = oauthReturnUrlForLocation(window.location.hostname, window.location.origin);
    const url = new URL("/auth", returnOrigin);
    if (next) url.searchParams.set("next", next);
    return url.toString();
  };

  const requireSignupConsent = () => {
    if (mode !== "up" || legalReady) return true;
    setMsg(signupCopy.required);
    return false;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireSignupConsent()) return;
    setBusy(true); setMsg(null);
    let staged = false;
    try {
      if (mode === "up") {
        const legalConsent = stagePendingLegalConsent(); staged = true;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authReturnUrl(),
            data: { display_name: name || undefined, bixbo_legal_consent: legalConsent },
          },
        });
        if (error) throw error;
        if (data.session) {
          await finishAuth();
        } else {
          setMsg(t("Account created. If email confirmation is on, check your inbox — otherwise you're signed in."));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finishAuth();
      }
    } catch (err) {
      if (staged) clearPendingLegalConsent();
      setMsg(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  const startOAuth = async (provider: "google") => {
    if (!requireSignupConsent()) return;
    setBusy(true); setMsg(null);
    let staged = false;
    try {
      if (mode === "up") { stagePendingLegalConsent(); staged = true; }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authReturnUrl(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err) {
      if (staged) clearPendingLegalConsent();
      setMsg(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const passwordLabel = mode === "up" ? t("Password (min 8 chars)") : t("Password");

  return <AppShell title={t("Sign in")} big>
    <div className="mx-auto w-full max-w-md space-y-4 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:pt-7 lg:px-0 lg:pb-12">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("Sign in to keep your BIXBO diary safely in the cloud and share with your partner using a code.")}</p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-tint p-1 ring-1 ring-border/70" role="group" aria-label={t("Account mode")}>
        <button type="button" aria-pressed={mode === "in"} onClick={() => setMode("in")} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "in" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface/70 hover:text-foreground"}`}>{t("Sign in")}</button>
        <button type="button" aria-pressed={mode === "up"} onClick={() => setMode("up")} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "up" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface/70 hover:text-foreground"}`}>{t("Create account")}</button>
      </div>
      <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border/70 bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:p-5">
        {mode === "up" && <Input aria-label={t("Your name (optional)")} className="h-11" placeholder={t("Your name (optional)")} value={name} onChange={(e) => setName(e.target.value)} />}
        <Input aria-label={t("Email")} className="h-11" type="email" autoComplete="email" placeholder={t("Email")} required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input aria-label={passwordLabel} className="h-11" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} placeholder={passwordLabel} required minLength={mode === "up" ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "up" ? <div className="space-y-3 rounded-2xl border border-border/70 bg-tint/60 p-3 text-xs leading-5 text-foreground">
          <label className="flex gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} /><span>{signupCopy.terms} <Link to={"/terms" as never} className="font-semibold text-primary underline underline-offset-4">{language === "sk" ? "Podmienky" : "Terms"}</Link></span></label>
          <label className="flex gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={privacyAcknowledged} onChange={(e) => setPrivacyAcknowledged(e.target.checked)} /><span>{signupCopy.privacy} <Link to={"/privacy" as never} className="font-semibold text-primary underline underline-offset-4">{language === "sk" ? "Súkromie" : "Privacy"}</Link></span></label>
          <label className="flex gap-2.5"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={healthConsent} onChange={(e) => setHealthConsent(e.target.checked)} /><span>{signupCopy.health}</span></label>
        </div> : null}
        <Button type="submit" disabled={busy || (mode === "up" && !legalReady)} className="min-h-11 w-full">{mode === "up" ? t("Create account") : t("Sign in")}</Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>{t("or")}</span><span className="h-px flex-1 bg-border" /></div>
      <div className="space-y-2"><Button variant="outline" className="min-h-11 w-full" onClick={() => void startOAuth("google")} disabled={busy || (mode === "up" && !legalReady)}>{t("Continue with Google")}</Button></div>
      {msg && <p role="status" aria-live="polite" className="rounded-2xl border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed text-destructive">{msg}</p>}
      <div className="flex items-center justify-center gap-3 text-center text-xs text-muted-foreground"><Link to={"/privacy" as never} className="underline underline-offset-4">{language === "sk" ? "Súkromie" : "Privacy"}</Link><span aria-hidden="true">·</span><Link to={"/terms" as never} className="underline underline-offset-4">{language === "sk" ? "Podmienky" : "Terms"}</Link></div>
      <div className="text-center"><Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">{t("Back to app")}</Link></div>
    </div>
  </AppShell>;
}
