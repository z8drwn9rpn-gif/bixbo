import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClockIcon, FlameIcon, HeartIcon, Ico, NoteIcon, PillIcon, PoopIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { summarizeMedicationProgress } from "@/lib/domain/meds";
import { avgDayPain, fromKey, isIntercourseKind, toKey, todayKey, type BixboData } from "@/lib/storage";
import { averageNumbers, daysBetweenInclusive } from "./vitalTrends";

export function HomeSummaryOverlay({ data, onClose, onOpenCalendar }: {
  data: BixboData;
  onClose: () => void;
  onOpenCalendar: (dateKey: string) => void;
}) {
  const { t, language } = useI18n();
  const todayDateKey = todayKey();
  const todayLog = data.dayLogs[todayDateKey];
  const todayPain = avgDayPain(todayLog);
  const todayMedicationProgress = summarizeMedicationProgress(data.meds, [todayDateKey], data.medLog, data.medLogItems ?? {}, new Date(), true);
  const [mode, setMode] = useState<"today" | "month">("today");
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => fromKey(todayDateKey));

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const noteValue = data.dayNotes[todayDateKey]?.[0];
  const noteText = typeof noteValue === "string" ? noteValue : noteValue && typeof noteValue === "object" && "text" in noteValue ? String(noteValue.text) : "";
  const todayTetany = todayLog?.tetany?.length ?? 0;
  const todayPanic = todayLog?.panic?.length ?? 0;
  const todayBowelEntries = todayLog?.bowel ?? [];
  const todayRows = [
    { key: "pain", icon: <FlameIcon size={22} />, label: "Pain", value: todayPain != null ? `${todayPain.toFixed(1)} / 10` : t("No pain logged") },
    { key: "meds", icon: <PillIcon size={22} />, label: "Medication", value: `${todayMedicationProgress.taken} ${t("of")} ${todayMedicationProgress.expected} ${t("taken")}` },
    { key: "sleep", icon: <ClockIcon size={22} />, label: "Sleep", value: todayLog?.sleepHours != null ? `${todayLog.sleepHours} h` : t("Not logged") },
    { key: "tetany", icon: <Ico e="⭐️" size={22} />, label: "Tetany episode", value: todayTetany ? `${todayTetany} ${todayTetany === 1 ? t("episode") : t("episodes")}` : t("None") },
    { key: "panic", icon: <Ico e="✨" size={22} />, label: "Panic episode", value: todayPanic ? `${todayPanic}` : t("None") },
    { key: "bowel", icon: <PoopIcon size={22} />, label: "Bowel", value: todayBowelEntries.length ? `${todayBowelEntries.length} ${todayBowelEntries.length === 1 ? t("entry") : t("entries")}` : t("None") },
    { key: "hotFlashes", icon: <Ico e="🥵" size={22} />, label: "Hot flashes", value: (() => { const entries = todayLog?.pain?.filter((entry) => (entry.hotFlashes ?? 0) > 0) ?? []; return entries.length ? `${entries.length} ${entries.length === 1 ? t("entry") : t("entries")}` : t("None"); })() },
    { key: "headache", icon: <Ico e="🤕" size={22} />, label: "Headache", value: (() => { const entries = todayLog?.pain?.filter((entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0) ?? []; return entries.length ? `${entries.length} ${entries.length === 1 ? t("entry") : t("entries")}` : t("None"); })() },
  ];

  const month = useMemo(() => {
    const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    const keys = daysBetweenInclusive(monthStart, monthEnd);
    const logs = keys.map((key) => ({ key, log: data.dayLogs[key] })).filter((item) => !!item.log);
    const painAvg = averageNumbers(logs.map(({ log }) => avgDayPain(log)).filter((value): value is number => value != null && Number.isFinite(value)));
    const tetany = logs.reduce((sum, { log }) => sum + (log?.tetany?.length ?? 0), 0);
    const panic = logs.reduce((sum, { log }) => sum + (log?.panic?.length ?? 0), 0);
    const bowel = logs.reduce((sum, { log }) => sum + (log?.bowel?.length ?? 0), 0);
    const hotFlashDays = logs.filter(({ log }) => (log?.pain ?? []).some((entry) => (entry.hotFlashes ?? 0) > 0)).length;
    const headacheDays = logs.filter(({ log }) => (log?.pain ?? []).some((entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0)).length;
    const periodDays = logs.filter(({ log }) => !!(log?.periodInfo?.level ?? log?.period)).map(({ key, log }) => ({ key, level: log?.periodInfo?.level ?? log?.period }));
    const periodStart = periodDays[0]?.key;
    const periodEnd = periodDays[periodDays.length - 1]?.key;
    const periodText = periodStart && periodEnd ? `${fromKey(periodStart).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}${periodEnd !== periodStart ? ` – ${fromKey(periodEnd).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}` : ""} · ${periodDays.length} day${periodDays.length === 1 ? "" : "s"}` : t("Not logged");
    const sex = logs.reduce((sum, { log }) => sum + (log?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0), 0);
    const sleepAvg = averageNumbers(logs.map(({ log }) => log?.sleepHours ?? log?.pregnancy?.sleepHours ?? log?.postpartum?.sleepHours).filter((value): value is number => value != null && Number.isFinite(value)));
    const meds = summarizeMedicationProgress(data.meds, keys, data.medLog, data.medLogItems ?? {}, new Date());
    return { keys, logs, painAvg, tetany, panic, bowel, hotFlashDays, headacheDays, periodText, sex, sleepAvg, meds };
  }, [data, language, monthAnchor, t]);

  const monthRows = [
    { key: "pain", icon: <FlameIcon size={22} />, label: "Pain", value: month.painAvg != null ? `${month.painAvg.toFixed(1)} / 10 ${t("avg")}` : t("No pain logged") },
    { key: "meds", icon: <PillIcon size={22} />, label: "Medication", value: month.meds.pct != null ? `${month.meds.pct}% ${t("taken")}` : t("No schedule") },
    { key: "sleep", icon: <ClockIcon size={22} />, label: "Sleep", value: month.sleepAvg != null ? `${month.sleepAvg.toFixed(1)} h ${t("avg")}` : t("Not logged") },
    { key: "tetany", icon: <Ico e="⭐️" size={22} />, label: "Tetany", value: `${month.tetany} ${month.tetany === 1 ? t("episode") : t("episodes")}` },
    { key: "panic", icon: <Ico e="✨" size={22} />, label: "Panic", value: `${month.panic} ${month.panic === 1 ? t("episode") : t("episodes")}` },
    { key: "bowel", icon: <PoopIcon size={22} />, label: "Bowel", value: month.bowel ? `${month.bowel} ${month.bowel === 1 ? t("entry") : t("entries")}` : t("None") },
    { key: "sex", icon: <HeartIcon size={22} />, label: "ŠukŠuk", value: `${month.sex}× ${t("this month")}` },
    { key: "hotFlashes", icon: <Ico e="🥵" size={22} />, label: "Hot flashes", value: month.hotFlashDays ? `${month.hotFlashDays} ${month.hotFlashDays === 1 ? t("day") : t("days")}` : t("None") },
    { key: "headache", icon: <Ico e="🤕" size={22} />, label: "Headache", value: month.headacheDays ? `${month.headacheDays} ${month.headacheDays === 1 ? t("day") : t("days")}` : t("None") },
    { key: "period", icon: <Ico e="🩸" size={22} />, label: "Period", value: month.periodText },
  ];
  const rows = mode === "today" ? todayRows : monthRows;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[950] flex items-center justify-center px-7 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" aria-label={t("Close summary")} className="absolute inset-0 bg-black/35" onClick={onClose} />
      <section className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-[1.65rem] bg-background shadow-2xl ring-1 ring-border">
        <div className="border-b border-border/70 px-4 pb-3 pt-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1">
          <div className="inline-flex rounded-xl bg-tint p-0.5 ring-1 ring-border/50"><button type="button" onClick={() => setMode("today")} className={`rounded-[10px] px-3 py-1 text-[10px] font-semibold transition ${mode === "today" ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}>{t("Today")}</button><button type="button" onClick={() => setMode("month")} className={`rounded-[10px] px-3 py-1 text-[10px] font-semibold transition ${mode === "month" ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground"}`}>{t("Month")}</button></div>
          {mode === "today" ? <h2 className="mt-2 font-serif text-lg font-bold text-foreground">{fromKey(todayDateKey).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</h2> : <div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border" aria-label={t("Previous month")}><ChevronLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1 text-center"><h2 className="font-serif text-lg font-bold text-foreground">{monthAnchor.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })}</h2><p className="mt-0.5 text-[10px] text-muted-foreground">{month.logs.length} / {month.keys.length} {t("days logged")}</p></div><button type="button" onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border" aria-label={t("Next month")}><ChevronRight className="h-4 w-4" /></button></div>}
        </div><button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-xs font-bold text-foreground ring-1 ring-border" aria-label={t("Close")}>×</button></div></div>
        <div className="max-h-[48dvh] overflow-y-auto overscroll-contain touch-pan-y p-3"><div className="grid grid-cols-2 gap-2">{rows.map((row) => <div key={row.key} className="min-w-0 rounded-2xl bg-tint px-2.5 py-2.5 ring-1 ring-border/50"><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center">{row.icon}</span><span className="min-w-0"><span className="block truncate text-[10px] font-medium text-muted-foreground">{t(row.label)}</span><span className="mt-0.5 block truncate text-xs font-semibold text-foreground">{row.value}</span></span></div></div>)}</div>
          {mode === "today" && noteText && <div className="mt-2 flex items-start gap-2 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/50"><span className="grid h-8 w-8 shrink-0 place-items-center"><NoteIcon size={20} /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-medium text-muted-foreground">{t("Note")}</span><span className="mt-0.5 line-clamp-1 block text-xs text-foreground">{noteText}</span></span></div>}
        </div>
        <div className="border-t border-border/70 p-3"><button type="button" onClick={() => { const key = mode === "today" ? todayDateKey : toKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)); onOpenCalendar(key); onClose(); }} className="min-h-10 w-full rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">{mode === "today" ? t("Open today on calendar") : t("Open month on calendar")}</button></div>
      </section>
    </div>,
    document.body,
  );
}
