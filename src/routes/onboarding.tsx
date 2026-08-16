import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import {
  EMPTY,
  hasAnyLog,
  todayKey,
  useBixbo,
  type BixboData,
} from "@/lib/storage";
import {
  accountPrivacyPrefs,
  trackingPrefs,
  unitPrefs,
  type TrackingPreferences,
  type UnitPreferences,
} from "@/lib/preferences";
import { notifPrefs } from "@/lib/notifications";
import { markOnboardingCompleted, onboardingCompleted } from "@/lib/legalConsent";
import { trackProductEvent } from "@/lib/productAnalytics";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "BIXBO — Welcome" }] }),
  component: OnboardingPage,
});

const COPY = {
  en: {
    welcome: "Welcome to BIXBO",
    intro: "Build BIXBO around what you want to track. Every choice can be changed later in Health settings.",
    language: "Language",
    next: "Next",
    back: "Back",
    tracking: "What do you want to track?",
    trackingHelp: "A new diary starts with no tracking categories selected. Turn on only the areas you want available.",
    units: "Units & time",
    unitsHelp: "BIXBO stores canonical health values and converts only how they are displayed.",
    reproductive: "Optional reproductive setup",
    reproductiveHelp: "Skip this if it is not relevant. You can start or end pregnancy/postpartum modes later without losing older records.",
    none: "Not now",
    trying: "Trying to conceive",
    pregnant: "Pregnant",
    postpartum: "Postpartum",
    cycleLength: "Typical cycle length",
    periodLength: "Typical bleeding length",
    days: "days",
    reminders: "Reminder preferences",
    remindersHelp: "Choose what BIXBO may remind you about. Device notification permission is requested separately, only when you explicitly enable notifications.",
    meds: "Medication reminders",
    daily: "Daily check-in",
    period: "Cycle reminders",
    privacy: "Privacy choices",
    analytics: "Privacy-preserving product analytics",
    analyticsHelp: "Optional and off by default. If enabled, BIXBO sends only an allow-listed content-free event name and time — never health values, notes, page paths, user IDs or free-form payloads.",
    finish: "Finish setup",
    categories: { pain: "Pain", tetany: "Tetany", panic: "Panic", bowel: "Bowel", cycle: "Cycle" },
    weight: "Weight",
    temperature: "Temperature",
    volume: "Volume",
    clock: "Clock",
  },
  sk: {
    welcome: "Vitaj v BIXBO",
    intro: "Poskladaj si BIXBO podľa toho, čo chceš sledovať. Všetky voľby môžeš neskôr zmeniť v Health nastaveniach.",
    language: "Jazyk",
    next: "Ďalej",
    back: "Späť",
    tracking: "Čo chceš sledovať?",
    trackingHelp: "Nový denník začína bez vybraných kategórií. Zapni iba oblasti, ktoré chceš mať dostupné.",
    units: "Jednotky a čas",
    unitsHelp: "BIXBO ukladá kanonické zdravotné hodnoty a mení iba spôsob ich zobrazenia.",
    reproductive: "Voliteľné reprodukčné nastavenie",
    reproductiveHelp: "Ak sa ťa netýka, preskoč ho. Tehotenstvo alebo postpartum režim môžeš neskôr zapnúť či ukončiť bez straty starších záznamov.",
    none: "Teraz nie",
    trying: "Snažíme sa o bábätko",
    pregnant: "Tehotenstvo",
    postpartum: "Postpartum",
    cycleLength: "Typická dĺžka cyklu",
    periodLength: "Typická dĺžka krvácania",
    days: "dní",
    reminders: "Nastavenie pripomienok",
    remindersHelp: "Vyber, na čo ťa môže BIXBO upozorňovať. Povolenie notifikácií v zariadení sa žiada samostatne až po tvojom výslovnom zapnutí.",
    meds: "Pripomienky liekov",
    daily: "Denný check-in",
    period: "Pripomienky cyklu",
    privacy: "Voľby súkromia",
    analytics: "Analytika šetrná k súkromiu",
    analyticsHelp: "Dobrovoľná a predvolene vypnutá. Po zapnutí BIXBO posiela iba povolený názov obsahovo prázdnej udalosti a čas — nikdy zdravotné hodnoty, poznámky, URL obrazovky, user ID ani voľný payload.",
    finish: "Dokončiť nastavenie",
    categories: { pain: "Bolesť", tetany: "Tetánia", panic: "Panika", bowel: "Stolica", cycle: "Cyklus" },
    weight: "Hmotnosť",
    temperature: "Teplota",
    volume: "Objem",
    clock: "Čas",
  },
} as const;

type Category = keyof typeof COPY.en.categories;
type ReproductiveMode = "none" | "trying" | "pregnant" | "postpartum";
const CATEGORIES: Category[] = ["pain", "tetany", "panic", "bowel", "cycle"];
const STEPS = 6;

function hasMeaningfulProfile(data: BixboData): boolean {
  return Object.entries(data.profile ?? {}).some(([key, value]) => {
    // Storage migration materializes these neutral compatibility fields even
    // for a brand-new diary. They must not turn a fresh install into an
    // "existing diary" and silently preserve legacy opt-in tracking defaults.
    if (key === "pregnancyStatus" && value === "none") return false;
    if (key === "postpartum" && value === undefined) return false;
    if (value == null || value === "" || value === false) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
}

function hasMeaningfulData(data: BixboData): boolean {
  return (
    Object.values(data.dayLogs ?? {}).some((log) => hasAnyLog(log)) ||
    data.meds.length > 0 ||
    data.notebook.length > 0 ||
    data.tasks.length > 0 ||
    data.events.length > 0 ||
    hasMeaningfulProfile(data) ||
    Boolean(data.pregnancy?.active) ||
    Boolean(data.postpartum?.active)
  );
}

function newDiaryTracking(existing: TrackingPreferences): TrackingPreferences {
  return {
    ...existing,
    pain: false,
    tetany: false,
    panic: false,
    bowel: false,
    cycle: false,
  };
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useI18n();
  const { data, hydrated, update } = useBixbo();
  const [step, setStep] = useState(0);
  const [tracking, setTracking] = useState<TrackingPreferences | null>(null);
  const [units, setUnits] = useState<UnitPreferences | null>(null);
  const [reproductiveMode, setReproductiveMode] = useState<ReproductiveMode>("none");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [medReminders, setMedReminders] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [periodReminder, setPeriodReminder] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const analyticsStartTrackedRef = useRef(false);
  const c = COPY[language];

  useEffect(() => {
    if (!hydrated || initialized) return;
    const existingTracking = trackingPrefs(data);
    const isFreshDiary = !onboardingCompleted() && !hasMeaningfulData(data);
    setTracking(isFreshDiary ? newDiaryTracking(existingTracking) : existingTracking);
    setUnits(unitPrefs(data));
    setAnalytics(accountPrivacyPrefs(data).analytics);
    const notifications = notifPrefs(data);
    setMedReminders(notifications.meds);
    setDailyReminder(notifications.dailyLog);
    setPeriodReminder(notifications.period);
    setCycleLength(Math.min(60, Math.max(15, data.cycle?.cycleLength ?? 28)));
    setPeriodLength(Math.min(14, Math.max(1, data.cycle?.periodLength ?? 5)));
    setReproductiveMode(
      data.postpartum?.active
        ? "postpartum"
        : data.pregnancy?.active
          ? "pregnant"
          : data.profile?.tryingToConceive || data.profile?.pregnancyStatus === "trying"
            ? "trying"
            : "none",
    );
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
    if (!tracking || !units) return;
    const nextPregnant = reproductiveMode === "pregnant";
    const nextPostpartum = reproductiveMode === "postpartum";
    const nextTrying = reproductiveMode === "trying";
    const today = todayKey();

    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        tracking,
        units,
        privacy: { ...accountPrivacyPrefs(current), analytics },
        notif: {
          ...(current.settings.notif ?? {}),
          meds: medReminders,
          dailyLog: dailyReminder,
          period: periodReminder,
        },
      },
      cycle: {
        ...current.cycle,
        cycleLength,
        periodLength,
      },
      pregnancy: {
        ...(current.pregnancy ?? EMPTY.pregnancy!),
        active: nextPregnant,
        endedAt: nextPregnant ? undefined : current.pregnancy?.active ? today : current.pregnancy?.endedAt,
      },
      postpartum: {
        ...(current.postpartum ?? EMPTY.postpartum!),
        active: nextPostpartum,
        endedAt: nextPostpartum ? undefined : current.postpartum?.active ? today : current.postpartum?.endedAt,
      },
      profile: {
        ...(current.profile ?? {}),
        tryingToConceive: nextTrying,
        pregnancyStatus: nextTrying ? "trying" : "none",
      },
    }));

    await markOnboardingCompleted();
    await trackProductEvent("onboarding_completed", analytics);
    void navigate({ to: "/" });
  };

  if (!hydrated || !tracking || !units) {
    return <AppShell title={c.welcome} big><div className="px-5 py-8 text-sm text-muted-foreground">…</div></AppShell>;
  }

  const switchRow = (label: string, checked: boolean, onClick: () => void) => (
    <button type="button" role="switch" aria-checked={checked} onClick={onClick} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-tint px-3 text-left text-sm font-semibold text-foreground">
      <span>{label}</span>
      <span aria-hidden="true" className={`inline-flex h-6 w-10 items-center rounded-full p-0.5 transition ${checked ? "justify-end bg-primary" : "justify-start bg-muted"}`}><span className="h-5 w-5 rounded-full bg-background shadow" /></span>
    </button>
  );

  const optionButton = (active: boolean, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-tint text-foreground"}`}>{label}</button>
  );

  return <AppShell title={c.welcome} big>
    <div className="mx-auto w-full max-w-lg space-y-4 px-5 pb-32 pt-5 lg:px-0 lg:pb-12">
      <div className="flex gap-2" aria-label="Onboarding progress">{Array.from({ length: STEPS }, (_, value) => <span key={value} className={`h-1.5 flex-1 rounded-full ${value <= step ? "bg-primary" : "bg-border"}`} />)}</div>

      {step === 0 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.language}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.intro}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {optionButton(language === "en", "English", () => setLanguage("en"))}
          {optionButton(language === "sk", "Slovenčina", () => setLanguage("sk"))}
        </div>
      </section> : null}

      {step === 1 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.tracking}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.trackingHelp}</p>
        <div className="mt-4 space-y-2">{CATEGORIES.map((category) => <div key={category}>{switchRow(c.categories[category], tracking[category], () => toggle(category))}</div>)}</div>
      </section> : null}

      {step === 2 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.units}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.unitsHelp}</p>
        <div className="mt-4 space-y-4">
          <div><p className="mb-2 text-xs font-semibold text-muted-foreground">{c.weight}</p><div className="grid grid-cols-2 gap-2">{optionButton(units.weight === "kg", "kg", () => setUnits({ ...units, weight: "kg" }))}{optionButton(units.weight === "lb", "lb", () => setUnits({ ...units, weight: "lb" }))}</div></div>
          <div><p className="mb-2 text-xs font-semibold text-muted-foreground">{c.temperature}</p><div className="grid grid-cols-2 gap-2">{optionButton(units.temperature === "c", "°C", () => setUnits({ ...units, temperature: "c" }))}{optionButton(units.temperature === "f", "°F", () => setUnits({ ...units, temperature: "f" }))}</div></div>
          <div><p className="mb-2 text-xs font-semibold text-muted-foreground">{c.volume}</p><div className="grid grid-cols-2 gap-2">{optionButton(units.volume === "ml", "ml", () => setUnits({ ...units, volume: "ml" }))}{optionButton(units.volume === "oz", "fl oz", () => setUnits({ ...units, volume: "oz" }))}</div></div>
          <div><p className="mb-2 text-xs font-semibold text-muted-foreground">{c.clock}</p><div className="grid grid-cols-2 gap-2">{optionButton(units.time === "24h", "24 h", () => setUnits({ ...units, time: "24h" }))}{optionButton(units.time === "12h", "12 h", () => setUnits({ ...units, time: "12h" }))}</div></div>
        </div>
      </section> : null}

      {step === 3 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.reproductive}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.reproductiveHelp}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {optionButton(reproductiveMode === "none", c.none, () => setReproductiveMode("none"))}
          {optionButton(reproductiveMode === "trying", c.trying, () => setReproductiveMode("trying"))}
          {optionButton(reproductiveMode === "pregnant", c.pregnant, () => setReproductiveMode("pregnant"))}
          {optionButton(reproductiveMode === "postpartum", c.postpartum, () => setReproductiveMode("postpartum"))}
        </div>
        {tracking.cycle && reproductiveMode !== "pregnant" && reproductiveMode !== "postpartum" ? <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-muted-foreground">{c.cycleLength}<select aria-label={c.cycleLength} value={cycleLength} onChange={(event) => setCycleLength(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground">{Array.from({ length: 46 }, (_, i) => i + 15).map((value) => <option key={value} value={value}>{value} {c.days}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted-foreground">{c.periodLength}<select aria-label={c.periodLength} value={periodLength} onChange={(event) => setPeriodLength(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground">{Array.from({ length: 14 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value} {c.days}</option>)}</select></label>
        </div> : null}
      </section> : null}

      {step === 4 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.reminders}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.remindersHelp}</p>
        <div className="mt-4 space-y-2">
          {switchRow(c.meds, medReminders, () => setMedReminders((value) => !value))}
          {switchRow(c.daily, dailyReminder, () => setDailyReminder((value) => !value))}
          {tracking.cycle ? switchRow(c.period, periodReminder, () => setPeriodReminder((value) => !value)) : null}
        </div>
      </section> : null}

      {step === 5 ? <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
        <h2 className="text-base font-semibold text-foreground">{c.privacy}</h2>
        <div className="mt-4">{switchRow(c.analytics, analytics, toggleAnalytics)}</div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{c.analyticsHelp}</p>
      </section> : null}

      <div className="flex gap-2">
        {step > 0 ? <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => setStep((value) => value - 1)}>{c.back}</Button> : null}
        {step < STEPS - 1 ? <Button type="button" className="min-h-11 flex-1" onClick={() => setStep((value) => value + 1)}>{c.next}</Button> : <Button type="button" className="min-h-11 flex-1" onClick={() => void finish()}>{c.finish}</Button>}
      </div>
    </div>
  </AppShell>;
}
