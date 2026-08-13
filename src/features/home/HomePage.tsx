import { Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, HeartIcon, Ico } from "@/components/icons/BixboIcons";
import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { AppShell } from "@/components/AppShell";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import { EMPTY, fromKey, isCycleTrackingHidden, toKey, todayKey, useBixbo } from "@/lib/storage";
import { VitalTrendPopup, type VitalTrendMetric } from "@/components/home/vitalTrends";
import { VitalTile, MedsProgress } from "@/components/home/HomeTiles";
import { BirthControlSummaryCard, BirthControlOverlay } from "@/components/home/BirthControlCard";
import { DayPreview, ShareDayButton } from "@/components/home/DayOverview";
import { TodayHeaderSummary } from "@/components/home/TodayHeaderSummary";
import { NextPeriodHomeCard, PostpartumHomeCard, PregnancyHomeCard } from "@/components/home/HomeModeCards";
import { HomeSummaryOverlay } from "@/components/home/HomeSummaryOverlay";

const HOME_MASCOT_DATA_URI = "data:image/png;base64,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";

export function HomePage() {
  const { t, language } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const maleMode = String(view.settings.gender ?? "").trim().toLowerCase() === "male";
  const [monthAnchor, setMonthAnchor] = useState<Date | null>(null);
  const [selected, setSelected] = useState("");
  const [hakOpen, setHakOpen] = useState(false);
  const [hakAnchor, setHakAnchor] = useState<Date | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [vitalTrendOpen, setVitalTrendOpen] = useState<VitalTrendMetric | null>(null);
  const [quickCat, setQuickCat] = useState<string | undefined>();
  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();
  const [editEntry, setEditEntry] = useState<unknown>(undefined);

  const openEdit = (cat: string, entry: unknown) => {
    setQuickCat(cat);
    setEditEntry(entry);
    setEditPain(undefined);
    setLogOpen(true);
  };

  useEffect(() => {
    setMonthAnchor(new Date());
    setSelected(todayKey());
  }, []);

  useEffect(() => {
    if (maleMode) {
      setHakOpen(false);
      setHakAnchor(null);
    }
  }, [maleMode]);

  useEffect(() => {
    const openLog = () => {
      setQuickCat(undefined);
      setEditPain(undefined);
      setEditEntry(undefined);
      setLogOpen(true);
    };
    window.addEventListener("bixbo:open-log", openLog);
    return () => window.removeEventListener("bixbo:open-log", openLog);
  }, []);

  if (!monthAnchor || !selected) return <div className="h-[360px]" />;

  const moveCalendarMonth = (delta: number) => {
    const currentSelected = fromKey(selected);
    const targetMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + delta, 1);
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    const nextSelected = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(currentSelected.getDate(), lastDay));
    setMonthAnchor(targetMonth);
    setSelected(toKey(nextSelected));
  };

  const cycleTrackingHidden = isCycleTrackingHidden(view);

  return <AppShell
    big
    showMascot={false}
    title={
      <div className="flex items-center gap-3 leading-tight">
        <img
          src={HOME_MASCOT_DATA_URI}
          alt="BIXBO penguin"
          draggable={false}
          className="h-[52px] w-[52px] shrink-0 object-contain"
          style={{ display: "block", opacity: 1, visibility: "visible", filter: "none", mixBlendMode: "normal" }}
        />
        <div className="flex flex-col">
          <span>BIXBO</span>
          <span className="text-xs font-normal text-muted-foreground">{t("Hi")}, {view.settings.userName?.trim() || t("there")} <Ico e="❤️" size={12} /></span>
        </div>
      </div>
    }
    right={<div className="flex items-center gap-1"><TodayHeaderSummary data={view} onOpen={() => setTodayOpen(true)} /><Link to="/profile" className="flex min-w-[52px] flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-primary transition hover:bg-tint" aria-label={t("Health")} title={t("Health")}><HeartIcon size={24} /><span className="mt-0.5 text-[10px] font-semibold leading-none">{t("Health")}</span></Link></div>}
  >
    <div className="lg:mx-auto lg:grid lg:w-full lg:max-w-[1480px] lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.95fr)] lg:items-start lg:gap-4 lg:px-0 xl:grid-cols-[minmax(0,1.72fr)_minmax(380px,1fr)] xl:gap-5">
      <div className="flex min-w-0 flex-col">
        <div style={{ order: layoutOrder(view, "home", "calendar", 10) }}>
          <div className="px-5 pt-0.5 lg:px-1"><div className="flex items-center justify-between"><button type="button" onClick={() => moveCalendarMonth(-1)} aria-label={t("Previous month")} className="rounded-full p-1.5 hover:bg-tint"><ChevronLeft className="h-5 w-5" /></button><h2 className="font-serif text-xl font-bold lg:text-[22px]" suppressHydrationWarning>{hydrated ? monthLabel(monthAnchor) : ""}</h2><button type="button" onClick={() => moveCalendarMonth(1)} aria-label={t("Next month")} className="rounded-full p-1.5 hover:bg-tint"><ChevronRight className="h-5 w-5" /></button></div></div>
          <div className="mt-1 lg:order-1 lg:overflow-hidden lg:rounded-[1.75rem] lg:bg-surface/28 lg:px-1 lg:pb-1 lg:ring-1 lg:ring-border/35" style={{ "--period-medium": "#7467D8" } as CSSProperties}>{hydrated ? <MonthCalendar month={monthAnchor} data={view} selected={selected} onSelect={setSelected} onSwipeMonth={moveCalendarMonth} /> : <div className="h-[360px]" />}</div>
        </div>

        {!maleMode && isAdminOwnerAccount() && <div style={{ order: layoutOrder(view, "home", "birthControl", 20) }}><BirthControlSummaryCard data={view} dateKey={selected} onOpen={() => { setHakAnchor(fromKey(selected)); setHakOpen(true); }} /></div>}
        <PregnancyHomeCard data={view} />
        <PostpartumHomeCard data={view} />
        {!cycleTrackingHidden && <NextPeriodHomeCard data={view} />}

        <div className="mt-3 grid grid-cols-5 gap-2 px-5 lg:grid-cols-4 lg:px-1" style={{ order: layoutOrder(view, "home", "vitals", 60) }}>
          <div className="col-span-2 lg:col-span-1"><MedsProgress data={view} onClick={() => { setQuickCat("meds"); setEditPain(undefined); setEditEntry(undefined); setLogOpen(true); }} /></div>
          <VitalTile emoji="😴" label="Sleep" value={view.dayLogs[selected]?.sleepHours != null ? String(view.dayLogs[selected]!.sleepHours) : "—"} onClick={() => setVitalTrendOpen("sleep")} />
          <VitalTile emoji="🌡️" label="Temp" value={view.dayLogs[selected]?.temperature != null ? String(view.dayLogs[selected]!.temperature) : "—"} onClick={() => setVitalTrendOpen("temperature")} />
          <VitalTile emoji="⚖️" label="Weight" value={view.dayLogs[selected]?.weight != null ? String(view.dayLogs[selected]!.weight) : "—"} onClick={() => setVitalTrendOpen("weight")} />
        </div>

        <div style={{ order: layoutOrder(view, "home", "quickLog", 70) }} className="px-5 lg:mt-2 lg:px-1 [&_p.text-\[11px\].uppercase]:min-w-0 [&_p.text-\[11px\].uppercase]:flex-1 [&_p.text-\[11px\].uppercase]:truncate [&_p.text-\[11px\].uppercase]:text-[10px] [&_.mt-1.flex.flex-wrap.gap-1]:hidden">
          <QuickTags data={view} update={update} onLongPress={(cat: string) => {
            const map: Record<string, string | undefined> = { pain: "pain", tetany: "tetany", panic: "panic", sex: "sex", food: "food", period: "period", meds: "meds", workout: "workout", bowel: "bowel", thermo: "heat", headache: "pain", hotFlashes: "pain", sleep: "temp" };
            const target = map[cat];
            if (!target) return;
            setQuickCat(target); setEditPain(undefined); setEditEntry(undefined); setLogOpen(true);
          }} />
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-[1.75rem] lg:bg-surface/45 lg:p-4 lg:ring-1 lg:ring-border/55 xl:p-5">
        <div className="mt-4 flex items-center justify-between px-5 lg:mt-0 lg:px-0"><h2 className="font-serif text-xl font-bold">{selected === todayKey() ? t("Today") : fromKey(selected).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</h2><ShareDayButton date={selected} view={view} /></div>
        <div className="[&_.p-4]:!py-3 [&_.space-y-2]:!space-y-1 [&_.mt-2]:!mt-1 [&_.my-2]:!my-1 [&_.pt-3]:!pt-2 [&_.gap-3]:!gap-2">
          <DayPreview date={selected} data={view} update={update} onEditPain={(pain) => { setEditPain(pain); setEditEntry(undefined); setQuickCat("pain"); setLogOpen(true); }} onEdit={openEdit} />
        </div>
      </aside>
    </div>

    {vitalTrendOpen && <VitalTrendPopup metric={vitalTrendOpen} data={view} anchorKey={selected} onClose={() => setVitalTrendOpen(null)} />}
    {todayOpen && <HomeSummaryOverlay data={view} onClose={() => setTodayOpen(false)} onOpenCalendar={(dateKey) => { setSelected(dateKey); setMonthAnchor(fromKey(dateKey)); }} />}
    {!maleMode && isAdminOwnerAccount() && hakOpen && hakAnchor && <BirthControlOverlay data={view} anchor={hakAnchor} onAnchorChange={setHakAnchor} onClose={() => setHakOpen(false)} />}
    <LogSheet open={logOpen} onOpenChange={(open) => { setLogOpen(open); if (!open) { setQuickCat(undefined); setEditPain(undefined); setEditEntry(undefined); } }} date={selected} data={view} update={update} initial={quickCat as never} initialPain={editPain} editEntry={editEntry} />
  </AppShell>;
}
