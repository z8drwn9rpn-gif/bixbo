import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClockIcon, FlameIcon, HeartIcon, Ico, NoteIcon, PillIcon, PoopIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { summarizeMedicationProgress } from "@/lib/domain/meds";
import { avgDayPain, fromKey, isIntercourseKind, toKey, todayKey, type BixboData } from "@/lib/storage";
import { averageNumbers, daysBetweenInclusive } from "./vitalTrends";

export function HomeSummaryOverlay({ data, onClose, onOpenCalendar, initialMonth }: {
  data: BixboData;
  onClose: () => void;
  onOpenCalendar: (dateKey: string) => void;
  initialMode?: "today" | "month";
  initialMonth?: Date;
}) {
  const { t, language } = useI18n();
  const [monthAnchor, setMonthAnchor] = useState<Date>(() =>
    initialMonth
      ? new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
      : new Date(fromKey(todayKey()).getFullYear(), fromKey(todayKey()).getMonth(), 1),
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const month = useMemo(() => {
    const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    const allKeys = daysBetweenInclusive(monthStart, monthEnd);
    const currentKey = todayKey();

    // Never let unfinished/future days dilute a monthly summary.
    // Past months use the whole month; the current month stops at today;
    // future months therefore contain no eligible days yet.
    const keys = allKeys.filter((key) => key <= currentKey);
    const logs = keys.map((key) => ({ key, log: data.dayLogs[key] })).filter((item) => !!item.log);

    const painEntries = logs.flatMap(({ log }) => log?.pain ?? []);
    const painAvg = averageNumbers(painEntries.map((entry) => entry.score).filter(Number.isFinite));

    const headacheEntries = painEntries.filter((entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0);
    const headacheAvg = averageNumbers(headacheEntries.map((entry) => entry.headacheIntensity).filter((value): value is number => value != null && Number.isFinite(value)));

    const hotFlashEntries = painEntries.filter((entry) => (entry.hotFlashes ?? 0) > 0);
    const hotFlashAvg = averageNumbers(hotFlashEntries.map((entry) => entry.hotFlashes ?? 0).filter(Number.isFinite));

    const bowelEntries = logs.flatMap(({ log }) => log?.bowel ?? []);
    const bowelMode = (() => {
      const counts = new Map<number, number>();
      for (const entry of bowelEntries) {
        if (typeof entry.bristol !== "number") continue;
        counts.set(entry.bristol, (counts.get(entry.bristol) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
    })();

    const workoutEntries = logs.flatMap(({ log }) => log?.workout ?? []);
    const workoutMinutes = workoutEntries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
    const sleepValues = logs.map(({ log }) => log?.sleepHours ?? log?.pregnancy?.sleepHours ?? log?.postpartum?.sleepHours).filter((value): value is number => value != null && Number.isFinite(value));
    const sleepAvg = averageNumbers(sleepValues);

    const sexEntries = logs.flatMap(({ log }) => log?.sex?.filter((entry) => isIntercourseKind(entry.kind)) ?? []);
    const noteEntries = keys.flatMap((key) => data.dayNotes[key] ?? []);

    // Medication adherence is also limited to elapsed days, so future scheduled
    // tablets in an unfinished month cannot lower the percentage.
    const meds = summarizeMedicationProgress(data.meds, keys, data.medLog, data.medLogItems ?? {}, new Date());

    const periodDays = logs
      .filter(({ log }) => !!(log?.periodInfo?.level ?? log?.period))
      .map(({ key, log }) => ({ key, level: log?.periodInfo?.level ?? log?.period }));
    const periodStart = periodDays[0]?.key;
    const periodEnd = periodDays[periodDays.length - 1]?.key;
    const periodText = periodStart && periodEnd
      ? `${fromKey(periodStart).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}${periodEnd !== periodStart ? ` – ${fromKey(periodEnd).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}` : ""} · ${periodDays.length} ${periodDays.length === 1 ? t("day") : t("days")}`
      : t("Not logged");

    const entryCount = painEntries.length + bowelEntries.length + workoutEntries.length + sexEntries.length + sleepValues.length + noteEntries.length;

    return {
      keys,
      logs,
      painEntries,
      painAvg,
      headacheEntries,
      headacheAvg,
      hotFlashEntries,
      hotFlashAvg,
      bowelEntries,
      bowelMode,
      workoutEntries,
      workoutMinutes,
      sleepValues,
      sleepAvg,
      sexEntries,
      noteEntries,
      meds,
      periodDays,
      periodText,
      entryCount,
    };
  }, [data, language, monthAnchor, t]);

  const rows = [
    {
      key: "pain",
      icon: <FlameIcon size={21} />,
      label: `${t("Pain")} (avg)`,
      meta: `${month.painEntries.length} ${month.painEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.painAvg != null ? `${month.painAvg.toFixed(1)} /10` : "—",
      accent: "#F05A28",
    },
    {
      key: "headache",
      icon: <Ico e="🤕" size={21} />,
      label: `${t("Headache")} (avg)`,
      meta: `${month.headacheEntries.length} ${month.headacheEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.headacheAvg != null ? `${month.headacheAvg.toFixed(1)} /10` : "—",
      accent: "#7467D8",
    },
    {
      key: "hotFlashes",
      icon: <Ico e="🥵" size={21} />,
      label: `${t("Hot flashes")} (avg)`,
      meta: `${month.hotFlashEntries.length} ${month.hotFlashEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.hotFlashAvg != null ? `${month.hotFlashAvg.toFixed(1)} /5` : "—",
      accent: "#E65073",
    },
    {
      key: "bowel",
      icon: <PoopIcon size={21} />,
      label: `${t("Bowel")} (mode)`,
      meta: `${month.bowelEntries.length} ${month.bowelEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.bowelMode != null ? `${t("type")} ${month.bowelMode}` : "—",
      accent: "#A66A4D",
    },
    {
      key: "workout",
      icon: <Ico e="👟" size={21} />,
      label: t("Workout"),
      meta: `${month.workoutEntries.length} ${month.workoutEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.workoutMinutes ? `${month.workoutMinutes} min` : "—",
      accent: "#5F84D6",
    },
    {
      key: "sleep",
      icon: <ClockIcon size={21} />,
      label: `${t("Sleep")} (avg)`,
      meta: `${month.sleepValues.length} ${month.sleepValues.length === 1 ? t("entry") : t("entries")}`,
      value: month.sleepAvg != null ? `${month.sleepAvg.toFixed(1)} h` : "—",
      accent: "#7467D8",
    },
    {
      key: "meds",
      icon: <PillIcon size={21} />,
      label: t("Medication"),
      meta: month.meds.expected ? `${month.meds.taken} ${t("of")} ${month.meds.expected} ${t("taken")}` : t("No schedule"),
      value: month.meds.pct != null ? `${month.meds.pct}%` : "—",
      accent: "#83985A",
    },
    {
      key: "sex",
      icon: <HeartIcon size={21} />,
      label: "ŠukŠuk",
      meta: `${month.sexEntries.length} ${month.sexEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.sexEntries.length ? `${month.sexEntries.length}×` : "—",
      accent: "#6F963B",
    },
    {
      key: "period",
      icon: <Ico e="🫐" size={21} />,
      label: t("Period"),
      meta: `${month.periodDays.length} ${month.periodDays.length === 1 ? t("day") : t("days")}`,
      value: month.periodText,
      accent: "#7467D8",
    },
    {
      key: "notes",
      icon: <NoteIcon size={21} />,
      label: t("Notes"),
      meta: `${month.noteEntries.length} ${month.noteEntries.length === 1 ? t("entry") : t("entries")}`,
      value: month.noteEntries.length ? t("Logged") : "—",
      accent: "#B89A36",
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[950] flex items-center justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" aria-label={t("Close summary")} className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <section className="relative z-10 flex max-h-[82dvh] w-full max-w-[350px] flex-col overflow-hidden rounded-[30px] border border-border/70 bg-background shadow-[0_24px_70px_-30px_rgba(24,31,17,.55),0_6px_20px_-12px_rgba(24,31,17,.35)]">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-muted-foreground">{t("Month summary")}</p>
              <h2 className="mt-1.5 text-[22px] font-black tracking-[-0.035em] text-foreground">
                {monthAnchor.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/70 bg-tint/70 text-lg font-bold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.75)]" aria-label={t("Close")}>×</button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border/60" aria-label={t("Previous month")}><ChevronLeft className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => { onOpenCalendar(toKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1))); onClose(); }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-[19px] border border-border/55 bg-tint/45 px-3 py-2.5 text-left"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/60 bg-background/80 text-base">📅</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-foreground">{month.logs.length} {t("days logged")} · {month.entryCount} {t("entries")} · {rows.length} {t("logs")}</span>
                <span className="mt-0.5 block text-[10.5px] text-muted-foreground">{t("Averages from recorded days only")}</span>
              </span>
              <span aria-hidden className="text-lg text-muted-foreground">›</span>
            </button>
            <button type="button" onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border/60" aria-label={t("Next month")}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 touch-pan-y">
          <div className="overflow-hidden rounded-[22px] border border-border/55 bg-background/75">
            {rows.map((row, index) => (
              <button
                key={row.key}
                type="button"
                onClick={() => { onOpenCalendar(toKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1))); onClose(); }}
                className={`grid w-full grid-cols-[34px_minmax(0,1fr)_auto_14px] items-center gap-2 px-3 py-2.5 text-left transition hover:bg-tint/35 active:bg-tint/55 ${index ? "border-t border-border/45" : ""}`}
              >
                <span className="grid h-8 w-8 place-items-center">{row.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold leading-tight text-foreground">{row.label}</span>
                  <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted-foreground">{row.meta}</span>
                </span>
                <span className="max-w-[118px] truncate text-right text-[12.5px] font-extrabold leading-tight" style={{ color: row.accent }}>{row.value}</span>
                <span aria-hidden className="text-[18px] leading-none text-muted-foreground">›</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
