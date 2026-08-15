import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Ico } from "@/components/icons/BixboExtraIcons";
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
import { NextPeriodHomeCard, PostpartumHomeCard, PregnancyHomeCard } from "@/components/home/HomeModeCards";
import { HomeSummaryOverlay } from "@/components/home/HomeSummaryOverlay";

function ProfileCardIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M11 12c0-3 2.2-5 5-5s5 2 5 5"
        stroke="#6E7C45"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 24c.8-4.8 3.4-7 7.5-7s6.7 2.2 7.5 7"
        stroke="#6E7C45"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [summaryMode, setSummaryMode] = useState<"today" | "month">("today");
  const [summaryMonth, setSummaryMonth] = useState<Date | null>(null);
  const [vitalTrendOpen, setVitalTrendOpen] = useState<VitalTrendMetric | null>(null);
  const [quickCat, setQuickCat] = useState<string | undefined>();
  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();
  const [editEntry, setEditEntry] = useState<unknown>(undefined);
  const monthSummaryTimer = useRef<number | null>(null);
  const monthSummaryPointerStart = useRef<{ x: number; y: number } | null>(null);

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
    const toggleLog = () => {
      setLogOpen((current) => {
        setQuickCat(undefined);
        setEditPain(undefined);
        setEditEntry(undefined);
        return !current;
      });
    };
    window.addEventListener("bixbo:toggle-log", toggleLog);
    return () => window.removeEventListener("bixbo:toggle-log", toggleLog);
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

  const clearMonthSummaryTimer = () => {
    if (monthSummaryTimer.current !== null) {
      window.clearTimeout(monthSummaryTimer.current);
      monthSummaryTimer.current = null;
    }
  };

  const openMonthSummary = () => {
    setSummaryMode("month");
    setSummaryMonth(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
    setTodayOpen(true);
    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch { /* noop */ }
    }
  };

  const cycleTrackingHidden = isCycleTrackingHidden(view);
  const roundedDisplayFont = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  const roundedDisplayShadow = "0 1px 0 rgba(255,255,255,.92), 0 2px 1px rgba(57,72,34,.22), 0 4px 5px rgba(49,61,31,.16)";

  return <AppShell
    big
    title={<div className="flex flex-col leading-tight"><span data-bixbo-display-title className="text-[37px] font-black tracking-[-0.045em] leading-[0.92] sm:text-[41px]" style={{ fontFamily: roundedDisplayFont, WebkitTextStroke: "0", textShadow: roundedDisplayShadow }}>BIXBO</span><span className="mt-1 inline-flex items-center gap-1 text-xs font-normal tracking-normal text-muted-foreground">{t("Hi")}, {view.settings.userName?.trim() || t("there")} <Ico e="❤️" size={12} /></span></div>}
    right={<Link to="/profile" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#E1E3D2] bg-[#FBF9F1]/75 shadow-[0_2px_4px_rgba(57,72,34,0.10),inset_0_1px_0_rgba(255,255,255,0.96)] transition active:scale-95" aria-label={t("Profile")} title={t("Profile")}><ProfileCardIcon size={24} /></Link>}
  >
    <div className="lg:mx-auto lg:grid lg:w-full lg:max-w-[1480px] lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.95fr)] lg:items-start lg:gap-4 lg:px-0 xl:grid-cols-[minmax(0,1.72fr)_minmax(380px,1fr)] xl:gap-5">
      <div className="flex min-w-0 flex-col">
        <div style={{ order: layoutOrder(view, "home", "calendar", 10) }}>
          <div className="px-5 pt-1 lg:px-1"><div className="flex items-center justify-between"><button type="button" onClick={() => moveCalendarMonth(-1)} aria-label={t("Previous month")} className="rounded-full p-1.5 hover:bg-tint"><ChevronLeft className="h-5 w-5" /></button><h2 data-bixbo-display-title className="select-none text-[29px] font-black tracking-[-0.045em] leading-none text-foreground sm:text-[31px] lg:text-[33px]" style={{ fontFamily: roundedDisplayFont, WebkitTextStroke: "0", textShadow: roundedDisplayShadow, WebkitTouchCallout: "none" }} suppressHydrationWarning onPointerDown={(event) => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = { x: event.clientX, y: event.clientY }; monthSummaryTimer.current = window.setTimeout(openMonthSummary, 520); }} onPointerMove={(event) => { const start = monthSummaryPointerStart.current; if (!start) return; if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; } }} onPointerUp={() => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; }} onPointerLeave={() => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; }} onPointerCancel={() => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; }} onContextMenu={(event) => event.preventDefault()}>{hydrated ? monthLabel(monthAnchor) : ""}</h2><button type="button" onClick={() => moveCalendarMonth(1)} aria-label={t("Next month")} className="rounded-full p-1.5 hover:bg-tint"><ChevronRight className="h-5 w-5" /></button></div></div>
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

    {vitalTrendOpen && typeof document !== "undefined" ? createPortal(<VitalTrendPopup metric={vitalTrendOpen} data={view} anchorKey={selected} onClose={() => setVitalTrendOpen(null)} />, document.body) : null}
    {todayOpen && <HomeSummaryOverlay data={view} initialMode={summaryMode} initialMonth={summaryMonth ?? undefined} onClose={() => setTodayOpen(false)} onOpenCalendar={(dateKey) => { setSelected(dateKey); setMonthAnchor(fromKey(dateKey)); }} />}
    {!maleMode && isAdminOwnerAccount() && hakOpen && hakAnchor && <BirthControlOverlay data={view} anchor={hakAnchor} onAnchorChange={setHakAnchor} onClose={() => setHakOpen(false)} />}
    <LogSheet open={logOpen} onOpenChange={(open) => { setLogOpen(open); if (!open) { setQuickCat(undefined); setEditPain(undefined); setEditEntry(undefined); } }} date={selected} data={view} update={update} initial={quickCat as never} initialPain={editPain} editEntry={editEntry} />
  </AppShell>;
}
