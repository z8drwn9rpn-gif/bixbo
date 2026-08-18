import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Ico } from "@/components/icons/BixboExtraIcons";
import { BixboConnectIcon } from "@/components/icons/BixboIcons";
import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { AppShell } from "@/components/AppShell";
import { monthLabel } from "@/components/MonthCalendar";
import { EditableMonthCalendar } from "@/components/EditableMonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { QuickVitalSheet, type QuickVitalMetric } from "@/components/home/QuickVitalSheet";
import { useI18n } from "@/hooks/useI18n";
import {
  EMPTY,
  fromKey,
  isCycleTrackingHidden,
  toKey,
  todayKey,
  useBixbo,
  type EventEntry,
  type PanicAttack,
  type TetanyEpisode,
} from "@/lib/storage";
import { VitalTile, MedsProgress } from "@/components/home/HomeTiles";
import { BirthControlSummaryCard, BirthControlOverlay } from "@/components/home/BirthControlCard";
import { DayPreview } from "@/components/home/DayOverview";
import { ShareDayButton } from "@/components/home/DayOverviewShareButton";
import { BlueberryDayOverviewFallback } from "@/components/home/BlueberryDayOverviewFallback";
import { NextPeriodHomeCard, PostpartumHomeCard, PregnancyHomeCard } from "@/components/home/HomeModeCards";
import { HomeSummaryOverlay } from "@/components/home/HomeSummaryOverlay";
import { EpisodePainEditSheet, type EpisodeEditTarget } from "@/features/home/EpisodePainEditSheet";

function ProfileCardIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M11 12c0-3 2.2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 24c.8-4.8 3.4-7 7.5-7s6.7 2.2 7.5 7" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
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
  const [quickCat, setQuickCat] = useState<string | undefined>();
  const [quickVital, setQuickVital] = useState<QuickVitalMetric | null>(null);
  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();
  const [editEntry, setEditEntry] = useState<unknown>(undefined);
  const [episodeEdit, setEpisodeEdit] = useState<EpisodeEditTarget | null>(null);
  const monthSummaryTimer = useRef<number | null>(null);
  const monthSummaryPointerStart = useRef<{ x: number; y: number } | null>(null);
  const notificationEventOpenedRef = useRef<string | null>(null);

  const openEdit = (cat: string, entry: unknown) => {
    if (cat === "tetany") {
      setEpisodeEdit({ kind: "tetany", entry: entry as TetanyEpisode });
      return;
    }
    if (cat === "panic") {
      setEpisodeEdit({ kind: "panic", entry: entry as PanicAttack });
      return;
    }
    setEpisodeEdit(null);
    setQuickCat(cat);
    setEditEntry(entry);
    setEditPain(undefined);
    setLogOpen(true);
  };

  const openCalendarEvent = (event: EventEntry) => {
    setSelected(event.startDate);
    setMonthAnchor(fromKey(event.startDate));
    setEpisodeEdit(null);
    setQuickCat("event");
    setEditEntry(event);
    setEditPain(undefined);
    setLogOpen(true);
  };

  const openDateBoundCategory = (cat?: string) => {
    setEpisodeEdit(null);
    setQuickCat(cat);
    setEditPain(undefined);
    setEditEntry(undefined);
    setLogOpen(true);
  };

  const openQuickVital = (metric: QuickVitalMetric) => {
    setQuickVital(metric);
  };

  const pastQuickTagCategory = (key: string): string | undefined => {
    if (key.startsWith("pain-")) return "pain";
    if (key === "tet-episode") return "tetany";
    if (key === "panic") return "panic";
    if (key === "sex") return "sex";
    if (key === "hist-flare") return "food";
    if (key === "period") return "period";
    return undefined;
  };

  const interceptPastQuickLog = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selected === todayKey()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button[data-bixbo-quick-tag]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    openDateBoundCategory(pastQuickTagCategory(button.dataset.bixboQuickTag ?? ""));
  };

  useEffect(() => {
    setMonthAnchor(new Date());
    setSelected(todayKey());
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    const currentUrl = new URL(window.location.href);
    const eventId = currentUrl.searchParams.get("event");
    if (!eventId || notificationEventOpenedRef.current === eventId) return;

    const calendarEvent = (view.events ?? []).find((entry) => String(entry.id) === eventId);
    if (!calendarEvent) return;

    notificationEventOpenedRef.current = eventId;
    setSelected(calendarEvent.startDate);
    setMonthAnchor(fromKey(calendarEvent.startDate));
    setEpisodeEdit(null);
    setQuickCat("event");
    setEditEntry(calendarEvent);
    setEditPain(undefined);
    setLogOpen(true);

    currentUrl.searchParams.delete("event");
    const cleanPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState(window.history.state, "", cleanPath || "/");
  }, [hydrated, view.events]);

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
    title={<div className="flex flex-col leading-tight"><span data-bixbo-display-title className="text-[37px] font-black tracking-[-0.045em] leading-[0.92] sm:text-[41px]" style={{ fontFamily: roundedDisplayFont, WebkitTextStroke: "0", textShadow: roundedDisplayShadow }}>BIXBO</span><Link to="/profile" className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-normal tracking-normal text-muted-foreground transition hover:text-foreground active:opacity-70" aria-label={t("Profile")} title={t("Profile")}><span className="text-[#6E7C45]"><ProfileCardIcon size={13} /></span><span>{t("Hi")}, {view.settings.userName?.trim() || t("there")}</span><Ico e="❤️" size={12} /><ChevronRight className="h-3 w-3 text-[#7E8B59]" /></Link></div>}
    right={<Link to="/report" className="flex min-h-11 items-center gap-1 rounded-2xl bg-primary/10 px-2 text-primary ring-1 ring-primary/20 transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={t("PDF reports")} title={t("PDF reports")}><BixboConnectIcon size={22} /><span className="text-[10px] font-extrabold tracking-[0.12em]">PDF</span></Link>}
  >
    <div className="lg:mx-auto lg:grid lg:w-full lg:max-w-[1480px] lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.95fr)] lg:items-start lg:gap-4 lg:px-0 xl:grid-cols-[minmax(0,1.72fr)_minmax(380px,1fr)] xl:gap-5">
      <div className="flex min-w-0 flex-col">
        <div style={{ order: layoutOrder(view, "home", "calendar", 10) }}>
          <div className="px-5 pt-1 lg:px-1"><div className="flex items-center justify-between"><button type="button" onClick={() => moveCalendarMonth(-1)} aria-label={t("Previous month")} className="rounded-full p-1.5 hover:bg-tint"><ChevronLeft className="h-5 w-5" /></button><h2 data-bixbo-display-title className="select-none text-[29px] font-black tracking-[-0.045em] leading-none text-foreground sm:text-[31px] lg:text-[33px]" style={{ fontFamily: roundedDisplayFont, WebkitTextStroke: "0", textShadow: roundedDisplayShadow, WebkitTouchCallout: "none" }} suppressHydrationWarning onPointerDown={(event) => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = { x: event.clientX, y: event.clientY }; monthSummaryTimer.current = window.setTimeout(openMonthSummary, 520); }} onPointerMove={(event) => { const start = monthSummaryPointerStart.current; if (!start) return; if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; } }} onPointerUp={() => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; }} onPointerLeave={() => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; }} onPointerCancel={() => { clearMonthSummaryTimer(); monthSummaryPointerStart.current = null; }} onContextMenu={(event) => event.preventDefault()}>{hydrated ? monthLabel(monthAnchor) : ""}</h2><button type="button" onClick={() => moveCalendarMonth(1)} aria-label={t("Next month")} className="rounded-full p-1.5 hover:bg-tint"><ChevronRight className="h-5 w-5" /></button></div></div>
          <div className="mt-1 lg:order-1 lg:overflow-hidden lg:rounded-[1.75rem] lg:bg-surface/28 lg:px-1 lg:pb-1 lg:ring-1 lg:ring-border/35" style={{ "--period-medium": "#7467D8" } as CSSProperties}>{hydrated ? <EditableMonthCalendar month={monthAnchor} data={view} selected={selected} onSelect={setSelected} onSwipeMonth={moveCalendarMonth} onEditEvent={openCalendarEvent} /> : <div className="h-[360px]" />}</div>
        </div>

        {!maleMode && isAdminOwnerAccount() && <div style={{ order: layoutOrder(view, "home", "birthControl", 20) }}><BirthControlSummaryCard data={view} dateKey={selected} onOpen={() => { setHakAnchor(fromKey(selected)); setHakOpen(true); }} /></div>}
        <PregnancyHomeCard data={view} />
        <PostpartumHomeCard data={view} />
        {!cycleTrackingHidden && <NextPeriodHomeCard data={view} />}

        <div className="mt-3 grid grid-cols-5 gap-2 px-5 lg:grid-cols-4 lg:px-1" style={{ order: layoutOrder(view, "home", "vitals", 60) }}>
          <div className="col-span-2 lg:col-span-1"><MedsProgress data={view} onClick={() => openDateBoundCategory("meds")} /></div>
          <VitalTile emoji="😴" label="Sleep" value={view.dayLogs[selected]?.sleepHours != null ? String(view.dayLogs[selected]!.sleepHours) : "—"} onClick={() => openQuickVital("sleep")} />
          <VitalTile emoji="🌡️" label="Temp" value={view.dayLogs[selected]?.temperature != null ? String(view.dayLogs[selected]!.temperature) : "—"} onClick={() => openQuickVital("temperature")} />
          <VitalTile emoji="⚖️" label="Weight" value={view.dayLogs[selected]?.weight != null ? String(view.dayLogs[selected]!.weight) : "—"} onClick={() => openQuickVital("weight")} />
        </div>

        <div onPointerUpCapture={interceptPastQuickLog} style={{ order: layoutOrder(view, "home", "quickLog", 70) }} className="px-5 lg:mt-2 lg:px-1 [&_p.text-\[11px\].uppercase]:min-w-0 [&_p.text-\[11px\].uppercase]:flex-1 [&_p.text-\[11px\].uppercase]:truncate [&_p.text-\[11px\].uppercase]:text-[10px] [&_.mt-1.flex.flex-wrap.gap-1]:hidden">
          <QuickTags data={view} update={update} onLongPress={(cat: string) => {
            const map: Record<string, string | undefined> = { pain: "pain", tetany: "tetany", panic: "panic", sex: "sex", food: "food", period: "period", meds: "meds", workout: "workout", bowel: "bowel", thermo: "heat", headache: "pain", hotFlashes: "pain", sleep: "temp" };
            const target = map[cat];
            if (!target) return;
            openDateBoundCategory(target);
          }} />
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-[1.75rem] lg:bg-surface/45 lg:p-4 lg:ring-1 lg:ring-border/55 xl:p-5">
        <div className="mt-4 flex items-center justify-between px-5 lg:mt-0 lg:px-0"><h2 className="font-serif text-xl font-bold">{selected === todayKey() ? t("Today") : fromKey(selected).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</h2><ShareDayButton date={selected} view={view} /></div>
        <div className="[&_.p-4]:!py-3 [&_.space-y-2]:!space-y-1 [&_.mt-2]:!mt-1 [&_.my-2]:!my-1 [&_.pt-3]:!pt-2 [&_.gap-3]:!gap-2">
          <BlueberryDayOverviewFallback date={selected} data={view} onEdit={() => openEdit("period", undefined)} />
          <DayPreview date={selected} data={view} update={update} onEditPain={(pain) => { setEpisodeEdit(null); setEditPain(pain); setEditEntry(undefined); setQuickCat("pain"); setLogOpen(true); }} onEdit={openEdit} />
        </div>
      </aside>
    </div>

    {todayOpen && <HomeSummaryOverlay data={view} initialMode={summaryMode} initialMonth={summaryMonth ?? undefined} onClose={() => setTodayOpen(false)} onOpenCalendar={(dateKey) => { setSelected(dateKey); setMonthAnchor(fromKey(dateKey)); }} />}
    {!maleMode && isAdminOwnerAccount() && hakOpen && hakAnchor && <BirthControlOverlay data={view} anchor={hakAnchor} onAnchorChange={setHakAnchor} onClose={() => setHakOpen(false)} />}
    <EpisodePainEditSheet open={!!episodeEdit} onOpenChange={(open) => { if (!open) setEpisodeEdit(null); }} date={selected} data={view} update={update} target={episodeEdit} />
    {quickVital && <QuickVitalSheet open={true} onOpenChange={(open) => { if (!open) setQuickVital(null); }} metric={quickVital} date={selected} data={view} update={update} />}
    <LogSheet open={logOpen} onOpenChange={(open) => { setLogOpen(open); if (!open) { setQuickCat(undefined); setEditPain(undefined); setEditEntry(undefined); } }} date={selected} data={view} update={update} initial={quickCat as never} initialPain={editPain} editEntry={editEntry} />
  </AppShell>;
}