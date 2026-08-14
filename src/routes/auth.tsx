import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/useI18n";
import { oauthReturnUrlForLocation } from "@/integrations/auth/account";
import { supabase } from "@/integrations/supabase/client";

function safeInternalNext(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: safeInternalNext(search.next),
  }),
  head: () => ({ meta: [
    { title: "BIXBO — Sign in" },
    { name: "description", content: "Sign in to sync your BIXBO diary across devices and share with your partner." },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const finishAuth = useCallback(() => {
    if (next) {
      window.location.replace(next);
      return;
    }
    void navigate({ to: "/settings" });
  }, [navigate, next]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (!cancelled && data.session) finishAuth();
    }).catch((error) => { if (!cancelled) setMsg(error instanceof Error ? error.message : String(error)); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) finishAuth();
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [finishAuth]);

  const authReturnUrl = () => {
    const returnOrigin = oauthReturnUrlForLocation(window.location.hostname, window.location.origin);
    const url = new URL("/auth", returnOrigin);
    if (next) url.searchParams.set("next", next);
    return url.toString();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authReturnUrl(),
            data: { display_name: name || undefined },
          },
        });
        if (error) throw error;
        if (data.session) {
          finishAuth();
        } else {
          setMsg(t("Account created. If email confirmation is on, check your inbox — otherwise you're signed in."));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        finishAuth();
      }
    } catch (err) { setMsg(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };

  const startOAuth = async (provider: "google" | "apple") => {
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authReturnUrl(),
          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
      });
      if (error) throw error;
    } catch (err) { setMsg(err instanceof Error ? err.message : String(err)); setBusy(false); }
  };

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
        <Input aria-label={t("Password (min 6 chars)")} className="h-11" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} placeholder={t("Password (min 6 chars)")} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" disabled={busy} className="min-h-11 w-full">{mode === "up" ? t("Create account") : t("Sign in")}</Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>{t("or")}</span><span className="h-px flex-1 bg-border" /></div>
      <div className="space-y-2">
        <Button variant="outline" className="min-h-11 w-full" onClick={() => void startOAuth("google")} disabled={busy}>{t("Continue with Google")}</Button>
        <Button variant="outline" className="min-h-11 w-full" onClick={() => void startOAuth("apple")} disabled={busy}>{t("Continue with Apple / iCloud")}</Button>
      </div>
      {msg && <p role="status" aria-live="polite" className="rounded-2xl border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed text-destructive">{msg}</p>}
      <div className="text-center"><Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">{t("Back to app")}</Link></div>
    </div>
  </AppShell>;
}