import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useBixbo } from "@/lib/storage";
import { accountPrivacyPrefs, trackingPrefs, type TrackingPreferences } from "@/lib/preferences";
import { markOnboardingCompleted } from "@/lib/legalConsent";
import { trackProductEvent } from "@/lib/productAnalytics";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "BIXBO — Welcome" }] }),
  component: OnboardingPage,
});

const COPY = {
  en: {
    welcome: "Welcome to BIXBO", intro: "Set up only what you want to track. You can change these choices later in Health settings.",
    language: "Language", next: "Next", back: "Back", tracking: "What do you want to track?",
    trackingHelp: "These switches only control which tracking categories are available. They do not change how BIXBO calculates saved data.",
    privacy: "Privacy choices", analytics: "Anonymous product analytics", analyticsHelp: "Optional and off by default. If enabled, BIXBO sends only a small content-free event name and time — never health values, notes, page paths or user IDs.",
    finish: "Finish setup", done: "Your BIXBO setup is ready.",
    categories: { pain: "Pain", tetany: "Tetany", panic: "Panic", bowel: "Bowel", cycle: "Cycle" },
  },
  sk: {
    welcome: "Vitaj v BIXBO", intro: "Nastav si iba to, čo chceš sledovať. Tieto voľby môžeš neskôr zmeniť v Health nastaveniach.",
    language: "Jazyk", next: "Ďalej", back: "Späť", tracking: "Čo chceš sledovať?",
    trackingHelp: "Tieto prepínače iba určujú dostupné kategórie sledovania. Nemenia spôsob, akým BIXBO počíta uložené údaje.",
    privacy: "Voľby súkromia", analytics: "Anonymná produktová analytika", analyticsHelp: "Dobrovoľná a predvolene vypnutá. Po zapnutí BIXBO posiela iba názov malej obsahovo prázdnej udalosti a čas — nikdy zdravotné hodnoty, poznámky, URL obrazovky ani user ID.",
    finish: "Dokončiť nastavenie", done: "BIXBO je pripravené.",
    categories: { pain: "Bolesť", tetany: "Tetánia", panic: "Panika", bowel: "Stolica", cycle: "Cyklus" },
  },
} as const;

type Category = keyof typeof COPY.en.categories;
const CATEGORIES: Category[] = ["pain", "tetany", "panic", "bowel", "cycle"];

function OnboardingPage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useI18n();
  const { data, hydrated, update } = useBixbo();
  const [step, setStep] = useState(0);
  const [tracking, setTracking] = useState<TrackingPreferences | null>(null);
  const [analytics, setAnalytics] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const analyticsStartTrackedRef = useRef(false);
  const c = COPY[language];

  useEffect(() => {
    if (!hydrated || initialized) return;
    setTracking(trackingPrefs(data));
    setAnalytics(accountPrivacyPrefs(data).analytics);
    setInitialized(true);
  }, [data, hydrated, initialized]);

  const toggle = (category: Category) => {
    setTracking((current) => current ? { ...current, [category]: !current[category] } : current);
  };

  const toggleAnalytics = () => {
    const next = !analytics;
    setAnalytics(next);
    if (next && !analyticsStartTrackedRef.current) {
      analyticsStartTrackedRef.current = true;
      void trackProductEvent("onboarding_started", true);
    }
  };

  const finish = async () => {
    if (!tracking) return;
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        tracking,
        privacy: { ...accountPrivacyPrefs(current), analytics },
      },
    }));
    await markOnboardingCompleted();
    await trackProductEvent("onboarding_completed", analytics);
    void navigate({ to: "/" });
  };

  if (!hydrated || !tracking) return <AppShell title={c.welcome} big><div className="px-5 py-8 text-sm text-muted-foreground">…</div></AppShell>;

  return <AppShell title={c.welcome} big>
    <div className="mx-auto w-full max-w-lg space-y-4 px-5 pb-32 pt-5 lg:px-0 lg:pb-12">
      <div className="flex gap-2" aria-label="Onboarding progress">{[0,1,2].map((value) => <span key={value} className={`h-1.5 flex-1 rounded-full ${value <= step ? "bg-primary" : "bg-border"}`} />)}</div>
      {step === 0 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.language}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.intro}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setLanguage("en")} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${language === "en" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint text-foreground"}`}>English</button>
          <button type="button" onClick={() => setLanguage("sk")} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${language === "sk" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint text-foreground"}`}>Slovenčina</button>
        </div>
      </section> : null}
      {step === 1 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.tracking}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.trackingHelp}</p>
        <div className="mt-4 space-y-2">{CATEGORIES.map((category) => <button key={category} type="button" role="switch" aria-checked={tracking[category]} onClick={() => toggle(category)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-tint px-3 text-left text-sm font-semibold text-foreground"><span>{c.categories[category]}</span><span aria-hidden="true" className={`inline-flex h-6 w-10 items-center rounded-full p-0.5 transition ${tracking[category] ? "justify-end bg-primary" : "justify-start bg-muted"}`}><span className="h-5 w-5 rounded-full bg-background shadow" /></span></button>)}</div>
      </section> : null}
      {step === 2 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.privacy}</h2>
        <button type="button" role="switch" aria-checked={analytics} onClick={toggleAnalytics} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-tint px-3 text-left text-sm font-semibold text-foreground"><span>{c.analytics}</span><span aria-hidden="true" className={`inline-flex h-6 w-10 items-center rounded-full p-0.5 transition ${analytics ? "justify-end bg-primary" : "justify-start bg-muted"}`}><span className="h-5 w-5 rounded-full bg-background shadow" /></span></button>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{c.analyticsHelp}</p>
      </section> : null}
      <div className="flex gap-2">
        {step > 0 ? <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => setStep((value) => value - 1)}>{c.back}</Button> : null}
        {step < 2 ? <Button type="button" className="min-h-11 flex-1" onClick={() => setStep((value) => value + 1)}>{c.next}</Button> : <Button type="button" className="min-h-11 flex-1" onClick={() => void finish()}>{c.finish}</Button>}
      </div>
    </div>
  </AppShell>;
}
