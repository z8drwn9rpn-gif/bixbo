import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { BoltIcon, ChevronLeft, ChevronRight, HeartIcon, LeafIcon, PanicIcon, PillIcon, ProfileIcon, SparkleIcon } from "@/components/icons/BixboExtraIcons";
import { layoutOrder } from "@/lib/layoutRegistry";
import { EMPTY, getBixbo, setPartner, todayKey, useBixbo, type ExtraMed, type Med, type PainEntry, type PanicAttack, type TetanyEpisode } from "@/lib/storage";
import { fetchPartner } from "@/lib/cloudSync";
import { useI18n } from "@/hooks/useI18n";
import { calculateCoupleSimilarity } from "@/lib/coupleSimilarity";
import { BlueberrySection } from "./BlueberrySection";
import { CouplePainChart } from "./CouplePainChart";
import { ComparisonBarCard, CurrentAndHistory, MedsList, PainList, PanicList, SectionCard, SimilarityCard, StatCard, TetanyList } from "./CoupleCards";
import { average, countTakenScheduledDoses, coupleRangeFor, hasSymptoms, isSameMonth, startOfMonth, type ComparableDayLog, type CouplePeriod } from "./coupleUtils";

type CoupleTab = "overview" | "compare" | "health";

export function CouplePage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t, language } = useI18n();
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;
  const period: CouplePeriod = "M";
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<CoupleTab>("overview");

  useEffect(() => {
    let cancelled = false;
    let refreshInFlight = false;
    const refreshPartnerView = async () => {
      if (cancelled || refreshInFlight) return;
      refreshInFlight = true;
      try {
        const partnerData = await fetchPartner();
        if (cancelled) return;
        const nextPartner = partnerData ?? undefined;
        const currentPartner = getBixbo().partner;
        if (JSON.stringify(currentPartner ?? null) !== JSON.stringify(nextPartner ?? null)) setPartner(nextPartner);
      } catch (error) {
        console.error("Couple fetchPartner", error);
      } finally {
        refreshInFlight = false;
      }
    };
    void refreshPartnerView();
    const intervalId = window.setInterval(() => { if (document.visibilityState === "visible") void refreshPartnerView(); }, 4000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshPartnerView(); };
    const refreshOnFocus = () => void refreshPartnerView();
    const refreshWhenOnline = () => void refreshPartnerView();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("online", refreshWhenOnline);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("online", refreshWhenOnline);
    };
  }, []);

  const range = useMemo(() => coupleRangeFor(period, anchor), [anchor, period]);
  const periodDays = range.days;
  const selectedMonth = useMemo(() => startOfMonth(anchor), [anchor]);
  const periodDisplayLabel = selectedMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", { month: "long", year: "numeric" });
  const selectedMonthLabel = periodDisplayLabel;
  const painMonthRange = useMemo(() => coupleRangeFor("M", anchor), [anchor]);
  const painMonthDays = painMonthRange.days;
  const painMonthLabel = periodDisplayLabel;
  const currentMonth = startOfMonth(new Date());
  const isCurrentMonth = isSameMonth(selectedMonth, currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canGoNext = range.end.getTime() < today.getTime();
  const goPrev = () => setAnchor((current) => { const next = new Date(current); next.setDate(1); next.setMonth(next.getMonth() - 1); return next; });
  const goNext = () => setAnchor((current) => { const next = new Date(current); next.setDate(1); next.setMonth(next.getMonth() + 1); return next > today ? current : next; });

  const collectPain = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PainEntry & { dateKey: string })[] = [];
    for (const day of periodDays) for (const pain of dayLogs[day]?.pain ?? []) output.push({ ...pain, dateKey: day });
    return output.sort((a, b) => b.dateKey === a.dateKey ? b.time.localeCompare(a.time) : b.dateKey.localeCompare(a.dateKey)).slice(0, 30);
  };
  const collectTetany = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (TetanyEpisode & { dateKey: string })[] = [];
    for (const day of periodDays) for (const episode of dayLogs[day]?.tetany ?? []) output.push({ ...episode, dateKey: day });
    return output.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };
  const collectPanic = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PanicAttack & { dateKey: string })[] = [];
    for (const day of periodDays) for (const attack of dayLogs[day]?.panic ?? []) output.push({ ...attack, dateKey: day });
    return output.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };
  const collectMedDays = (meds: Med[], medLog: Record<string, Record<string, boolean>>, dayLogs: Record<string, ComparableDayLog>) => periodDays.slice().reverse().map((day) => ({ dateKey: day, meds, medLog: medLog[day] ?? {}, extra: dayLogs[day]?.extraMeds ?? [] }));

  const myPain = collectPain(view.dayLogs);
  const myTetany = collectTetany(view.dayLogs);
  const myPanic = collectPanic(view.dayLogs);
  const myMeds = collectMedDays(view.meds, view.medLog, view.dayLogs);
  const partnerPain = partner ? collectPain(partner.dayLogs) : [];
  const partnerTetany = partner ? collectTetany(partner.dayLogs) : [];
  const partnerPanic = partner ? collectPanic(partner.dayLogs) : [];
  const partnerMeds = partner ? collectMedDays(partner.meds ?? [], partner.medLog ?? {}, partner.dayLogs) : [];

  const visibleHealthDay = periodDays.includes(todayKey()) ? todayKey() : (periodDays[periodDays.length - 1] ?? todayKey());
  const visibleHealthDayLabel = visibleHealthDay === todayKey() ? t("Today") : visibleHealthDay;
  const splitEntries = <T extends { dateKey: string }>(entries: T[]) => ({ current: entries.filter((entry) => entry.dateKey === visibleHealthDay), history: entries.filter((entry) => entry.dateKey !== visibleHealthDay) });
  const splitMedDays = (days: { dateKey: string; meds: Med[]; medLog: Record<string, boolean>; extra: ExtraMed[] }[]) => ({ current: days.filter((day) => day.dateKey === visibleHealthDay), history: days.filter((day) => day.dateKey !== visibleHealthDay) });
  const partnerPainSplit = splitEntries(partnerPain); const partnerTetanySplit = splitEntries(partnerTetany); const partnerPanicSplit = splitEntries(partnerPanic); const partnerMedsSplit = splitMedDays(partnerMeds);
  const myPainSplit = splitEntries(myPain); const myTetanySplit = splitEntries(myTetany); const myPanicSplit = splitEntries(myPanic); const myMedsSplit = splitMedDays(myMeds);

  const myFirstComparisonDay = Object.keys(view.dayLogs).filter((day) => hasSymptoms(view.dayLogs[day])).sort()[0] ?? null;
  const partnerFirstComparisonDay = partner ? Object.keys(partner.dayLogs).filter((day) => hasSymptoms(partner.dayLogs[day])).sort()[0] ?? null : null;
  const comparisonStartDay = myFirstComparisonDay && partnerFirstComparisonDay ? (myFirstComparisonDay > partnerFirstComparisonDay ? myFirstComparisonDay : partnerFirstComparisonDay) : null;
  const comparisonPeriodDays = comparisonStartDay ? periodDays.filter((day) => day >= comparisonStartDay) : [];
  const hasPartnerComparisonData = partner ? comparisonPeriodDays.some((day) => hasSymptoms(partner.dayLogs[day])) : false;
  const myPainAverage = average(comparisonPeriodDays.flatMap((day) => view.dayLogs[day]?.pain ?? []).map((pain) => pain.score));
  const partnerPainAverage = partner ? average(comparisonPeriodDays.flatMap((day) => partner.dayLogs[day]?.pain ?? []).map((pain) => pain.score)) : null;
  const myPainDays = comparisonPeriodDays.filter((day) => (view.dayLogs[day]?.pain?.length ?? 0) > 0).length;
  const partnerPainDays = partner ? comparisonPeriodDays.filter((day) => (partner.dayLogs[day]?.pain?.length ?? 0) > 0).length : 0;
  const sharedSymptomDays = partner ? comparisonPeriodDays.filter((day) => hasSymptoms(view.dayLogs[day]) && hasSymptoms(partner.dayLogs[day])).length : 0;
  const mySymptomDays = comparisonPeriodDays.filter((day) => hasSymptoms(view.dayLogs[day])).length;
  const partnerSymptomDays = partner ? comparisonPeriodDays.filter((day) => hasSymptoms(partner.dayLogs[day])).length : 0;
  const myPanicCount = comparisonPeriodDays.reduce((sum, day) => sum + (view.dayLogs[day]?.panic?.length ?? 0), 0);
  const partnerPanicCount = partner ? comparisonPeriodDays.reduce((sum, day) => sum + (partner.dayLogs[day]?.panic?.length ?? 0), 0) : 0;
  const myTetanyCount = comparisonPeriodDays.reduce((sum, day) => sum + (view.dayLogs[day]?.tetany?.length ?? 0), 0);
  const partnerTetanyCount = partner ? comparisonPeriodDays.reduce((sum, day) => sum + (partner.dayLogs[day]?.tetany?.length ?? 0), 0) : 0;
  const myTakenDoses = countTakenScheduledDoses(periodDays, view.meds, view.medLog);
  const partnerTakenDoses = partner ? countTakenScheduledDoses(periodDays, partner.meds ?? [], partner.medLog ?? {}) : 0;
  const loggedComparisonDays = partner && hasPartnerComparisonData ? comparisonPeriodDays.filter((day) => hasSymptoms(view.dayLogs[day]) || hasSymptoms(partner.dayLogs[day])).length : 0;
  const similarityScore = partner && hasPartnerComparisonData ? calculateCoupleSimilarity({ mySymptomDays, partnerSymptomDays, loggedComparisonDays, myPainAverage, partnerPainAverage, myPanicCount, partnerPanicCount, myTetanyCount, partnerTetanyCount }) : null;
  const myCoupleName = view.settings.userName?.trim() || view.profile?.nickname?.trim() || view.profile?.name?.trim() || t("You");
  const partnerName = partner?.name || "Partner";
  const tabs: { id: CoupleTab; label: string; icon: ReactNode }[] = [{ id: "overview", label: "Overview", icon: <HeartIcon size={24} /> }, { id: "compare", label: "Compare", icon: <SparkleIcon size={24} /> }, { id: "health", label: "Health", icon: <LeafIcon size={24} /> }];

  return <AppShell title={t("Bixbo Couple")} stickyHeader={false} right={<button type="button" onClick={onOpenSettings} aria-label={t("Couple settings")} className="inline-flex min-h-9 items-center justify-center rounded-full border border-border/80 bg-background/90 px-3 text-xs font-semibold text-foreground shadow-sm">{t("Settings")}</button>}>
    <div className="flex flex-col gap-3 px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 lg:px-0 lg:pb-12 [&>*:first-child]:lg:col-span-2">
      <div style={{ order: -30 }} className="mx-auto grid w-full max-w-[340px] grid-cols-1 gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 lg:max-w-sm" aria-label={t("Couple period: Month")}><div className="min-w-0 rounded-[10px] bg-primary px-2 py-1.5 text-center text-[11px] font-semibold text-primary-foreground shadow-md">{t("Month")}</div></div>
      {partner ? <nav style={{ order: -20 }} aria-label={t("Couple sections")} className="mx-auto grid w-full max-w-[340px] grid-cols-3 gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 lg:max-w-sm">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id} className={`min-w-0 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-md" : "text-foreground/80 hover:bg-surface/45 hover:text-foreground"}`}>{t(tab.label)}</button>)}</nav> : null}
      <div style={{ order: -10 }} className="flex items-center justify-between"><button type="button" onClick={goPrev} aria-label={t("Previous period")} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint"><ChevronLeft className="h-3 w-3" /></button><span className="text-[11px] font-medium leading-none">{periodDisplayLabel}</span><button type="button" onClick={goNext} disabled={!canGoNext} aria-label={t("Next period")} className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint disabled:opacity-30"><ChevronRight className="h-3 w-3" /></button></div>
      {!partner ? <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border"><p className="text-sm font-medium">{t("No partner linked yet.")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("In Settings → Couple sharing, exchange pairing codes with your partner to compare selected health logs.")}</p><button type="button" onClick={onOpenSettings} className="mt-3 inline-block text-sm text-primary underline">{t("Open Couple sharing")}</button></div> : <>
        {activeTab === "overview" && <div style={{ order: layoutOrder(view, "couple.overview", "similarity", 10) }}><SimilarityCard score={similarityScore} myName={myCoupleName} partnerName={partnerName} /></div>}
        {activeTab === "overview" && hasPartnerComparisonData && <div style={{ order: layoutOrder(view, "couple.overview", "stats", 20) }} className="grid grid-cols-2 gap-2"><StatCard icon={<ProfileIcon size={18} />} label="Shared symptom days" value={`${sharedSymptomDays}`} detail="Days when both of you logged pain, panic or tetany." tone="purple" /><StatCard icon={<HeartIcon size={18} />} label="Your symptom days" value={`${mySymptomDays}`} detail={`${t(partnerName)}: ${partnerSymptomDays} ${t("days")}`} tone="rose" /><StatCard icon={<PanicIcon size={18} />} label="Panic attacks" value={`${myPanicCount + partnerPanicCount}`} detail={`${t("You")} ${myPanicCount} · ${t(partnerName)} ${partnerPanicCount}`} tone="purple" /><StatCard icon={<BoltIcon size={18} />} label="Tetany episodes" value={`${myTetanyCount + partnerTetanyCount}`} detail={`${t("You")} ${myTetanyCount} · ${t(partnerName)} ${partnerTetanyCount}`} tone="blue" /></div>}
        {activeTab === "overview" && partner.gender !== "male" && <div style={{ order: layoutOrder(view, "couple.overview", "blueberry", 30) }}><BlueberrySection partner={partner} selectedMonth={selectedMonth} selectedMonthLabel={selectedMonthLabel} isCurrentMonth={isCurrentMonth} /></div>}
        {activeTab === "compare" && <><div style={{ order: layoutOrder(view, "couple.compare", "painChart", 10) }}><CouplePainChart days={painMonthDays} mine={view.dayLogs} theirs={partner.dayLogs} partnerName={t(partnerName)} periodLabel={painMonthLabel} period="M" /></div><div style={{ order: layoutOrder(view, "couple.compare", "healthComparison", 20) }}><SectionCard title="Health comparison" description="Solid bars are yours. Striped bars belong to your partner."><div className="mt-3 space-y-2.5"><ComparisonBarCard title="Average pain" subtitle="Average intensity of logged pain entries" mine={myPainAverage} theirs={partnerPainAverage} max={10} decimals={1} unit="/10" mineLabel={t("You")} partnerLabel={t(partnerName)} tone="rose" icon={<HeartIcon size={22} />} /><ComparisonBarCard title="Pain days" subtitle="Days with at least one pain entry" mine={myPainDays} theirs={partnerPainDays} decimals={0} mineLabel={t("You")} partnerLabel={t(partnerName)} tone="green" icon={<SparkleIcon size={22} />} /><ComparisonBarCard title="Panic attacks" subtitle="Number logged in the selected month" mine={myPanic.length} theirs={partnerPanic.length} decimals={0} mineLabel={t("You")} partnerLabel={t(partnerName)} tone="purple" icon={<PanicIcon size={22} />} /><ComparisonBarCard title="Tetany episodes" subtitle="Number logged in the selected month" mine={myTetany.length} theirs={partnerTetany.length} decimals={0} mineLabel={t("You")} partnerLabel={t(partnerName)} tone="blue" icon={<BoltIcon size={22} />} /><ComparisonBarCard title="Medication doses" subtitle="Scheduled doses marked as taken" mine={myTakenDoses} theirs={partnerTakenDoses} decimals={0} mineLabel={t("You")} partnerLabel={t(partnerName)} tone="emerald" icon={<PillIcon size={22} />} /></div></SectionCard></div></>}
        {activeTab === "health" && <><div style={{ order: layoutOrder(view, "couple.health", "partnerDetails", 10) }}><SectionCard title={`${t(partnerName)} — ${t("shared details")}`} description="Only the explicitly shared categories for the selected month."><div className="mt-3 space-y-2.5"><CurrentAndHistory title={`${t("Pain")} (${partnerPain.length})`} currentLabel={visibleHealthDayLabel} currentContent={<PainList title={visibleHealthDayLabel} entries={partnerPainSplit.current} />} historyCount={partnerPainSplit.history.length} historyContent={<PainList title="Earlier pain" entries={partnerPainSplit.history} />} /><CurrentAndHistory title={`${t("Tetany")} (${partnerTetany.length})`} currentLabel={visibleHealthDayLabel} currentContent={<TetanyList title={visibleHealthDayLabel} entries={partnerTetanySplit.current} />} historyCount={partnerTetanySplit.history.length} historyContent={<TetanyList title="Earlier tetany" entries={partnerTetanySplit.history} />} /><CurrentAndHistory title={`${t("Panic attacks")} (${partnerPanic.length})`} currentLabel={visibleHealthDayLabel} currentContent={<PanicList title={visibleHealthDayLabel} entries={partnerPanicSplit.current} />} historyCount={partnerPanicSplit.history.length} historyContent={<PanicList title="Earlier panic attacks" entries={partnerPanicSplit.history} />} /><CurrentAndHistory title="Medication" currentLabel={visibleHealthDayLabel} currentContent={<MedsList title={visibleHealthDayLabel} days={partnerMedsSplit.current} />} historyCount={partnerMedsSplit.history.length} historyContent={<MedsList title="Earlier medication" days={partnerMedsSplit.history} />} /></div></SectionCard></div><div style={{ order: layoutOrder(view, "couple.health", "myDetails", 20) }}><SectionCard title="My shared details" description="The same categories that your partner is allowed to receive."><div className="mt-3 space-y-2.5"><CurrentAndHistory title={`${t("Pain")} (${myPain.length})`} currentLabel={visibleHealthDayLabel} currentContent={<PainList title={visibleHealthDayLabel} entries={myPainSplit.current} />} historyCount={myPainSplit.history.length} historyContent={<PainList title="Earlier pain" entries={myPainSplit.history} />} /><CurrentAndHistory title={`${t("Tetany")} (${myTetany.length})`} currentLabel={visibleHealthDayLabel} currentContent={<TetanyList title={visibleHealthDayLabel} entries={myTetanySplit.current} />} historyCount={myTetanySplit.history.length} historyContent={<TetanyList title="Earlier tetany" entries={myTetanySplit.history} />} /><CurrentAndHistory title={`${t("Panic attacks")} (${myPanic.length})`} currentLabel={visibleHealthDayLabel} currentContent={<PanicList title={visibleHealthDayLabel} entries={myPanicSplit.current} />} historyCount={myPanicSplit.history.length} historyContent={<PanicList title="Earlier panic attacks" entries={myPanicSplit.history} />} /><CurrentAndHistory title="Medication" currentLabel={visibleHealthDayLabel} currentContent={<MedsList title={visibleHealthDayLabel} days={myMedsSplit.current} />} historyCount={myMedsSplit.history.length} historyContent={<MedsList title="Earlier medication" days={myMedsSplit.history} />} /></div></SectionCard></div></>}
      </>}
    </div>
  </AppShell>;
}
