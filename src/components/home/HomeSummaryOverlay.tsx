import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClockIcon, FlameIcon, HeartIcon, Ico, NoteIcon, PillIcon, PoopIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { summarizeMedicationProgress } from "@/lib/domain/meds";
import { fromKey, toKey, todayKey, type BixboData } from "@/lib/storage";
import { averageNumbers, daysBetweenInclusive } from "./vitalTrends";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function customLogEntryLabel(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;

  // Older BIXBO custom logs stored their visible value directly as `text`.
  if (typeof record.text === "string" && record.text.trim()) return record.text.trim();
  if (typeof record.note === "string" && record.note.trim()) return record.note.trim();

  // Current custom logs store named values. Prefer a readable text value when
  // one exists so Month Summary tells the user what the saved entry actually is.
  if (record.values && typeof record.values === "object") {
    const values = Object.values(record.values as Record<string, unknown>);
    const textValue = values.find((value) => typeof value === "string" && value.trim());
    if (typeof textValue === "string") return textValue.trim();
  }

  return null;
}

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
    const keys = allKeys.filter((key) => key <= currentKey);
    const logs = keys.map((key) => ({ key, log: data.dayLogs[key] })).filter((item) => !!item.log);

    const painEntries = logs.flatMap(({ log }) => log?.pain ?? []);
    const painAvg = averageNumbers(painEntries.map((entry) => entry.score).filter(finite));

    const tetanyEntries = logs.flatMap(({ log }) => log?.tetany ?? []);
    const tetanyAvg = averageNumbers(tetanyEntries.map((entry) => entry.intensity).filter(finite));
    const panicEntries = logs.flatMap(({ log }) => log?.panic ?? []);
    const panicAvg = averageNumbers(panicEntries.map((entry) => entry.intensity).filter(finite));

    const headacheEntries = painEntries.filter((entry) => entry.headache === true || entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0);
    const headacheAvg = averageNumbers(headacheEntries.map((entry) => entry.headacheIntensity).filter(finite));
    const pressureEntries = painEntries.filter((entry) => entry.pressureIntensity != null || (entry.pressureTypes?.length ?? 0) > 0);
    const pressureAvg = averageNumbers(pressureEntries.map((entry) => entry.pressureIntensity).filter(finite));
    const hotFlashEntries = painEntries.filter((entry) => entry.hotFlashesOn === true || (entry.hotFlashes ?? 0) > 0);
    const hotFlashAvg = averageNumbers(hotFlashEntries.map((entry) => entry.hotFlashes).filter(finite));
    const nauseaEntries = painEntries.filter((entry) => entry.nausea === true || entry.nauseaSeverity != null || (entry.nauseaTypes?.length ?? 0) > 0);
    const nauseaAvg = averageNumbers(nauseaEntries.map((entry) => entry.nauseaSeverity).filter(finite));
    const pcosEntries = painEntries.filter((entry) => (entry.pcosSymptoms?.length ?? 0) > 0);

    const bowelEntries = logs.flatMap(({ log }) => log?.bowel ?? []);
    const bowelMode = (() => {
      const counts = new Map<number, number>();
      for (const entry of bowelEntries) {
        if (entry.urinaryOnly || !finite(entry.bristol)) continue;
        counts.set(entry.bristol, (counts.get(entry.bristol) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
    })();

    const thermoEntries = logs.flatMap(({ log }) => log?.heat ?? []);
    const workoutEntries = logs.flatMap(({ log }) => log?.workout ?? []);
    const workoutMinutes = workoutEntries.reduce((sum, entry) => sum + (finite(entry.minutes) ? entry.minutes : 0), 0);
    const sleepValues = logs.map(({ log }) => log?.sleepHours ?? log?.pregnancy?.sleepHours ?? log?.postpartum?.sleepHours).filter(finite);
    const sleepAvg = averageNumbers(sleepValues);

    const temperatureValues = logs.flatMap(({ log }) => (log?.temperatureEntries?.length ? log.temperatureEntries.map((entry) => entry.value).filter(finite) : finite(log?.temperature) ? [log.temperature] : []));
    const weightValues = logs.flatMap(({ log }) => (log?.weightEntries?.length ? log.weightEntries.map((entry) => entry.value).filter(finite) : finite(log?.weight) ? [log.weight] : []));
    const temperatureAvg = averageNumbers(temperatureValues);
    const weightAvg = averageNumbers(weightValues);

    const moodEntries = logs.flatMap(({ log }) => log?.mood ?? []);
    const energyEntries = logs.flatMap(({ log }) => log?.energy ?? []);
    const sexEntries = logs.flatMap(({ log }) => log?.sex ?? []);
    const foodEntries = logs.flatMap(({ log }) => log?.food ?? []);
    const histamineEntries = logs.flatMap(({ log }) => log?.histamine ?? []);
    const histamineFlareCount = histamineEntries.filter((entry) => entry.flare).length + foodEntries.filter((entry) => entry.histamineFlare === true).length;
    const extraMedEntries = logs.flatMap(({ log }) => log?.extraMeds ?? []);
    const customLogEntries = logs.flatMap(({ log }) => Object.values(log?.customLogs ?? {}).flat());
    const customLogCount = customLogEntries.length;
    const customLogLabels = [...new Set(customLogEntries.map(customLogEntryLabel).filter((label): label is string => Boolean(label)))];
    const additionalFieldCount = logs.reduce((sum, { log }) => sum + Object.values(log?.adminFields ?? {}).reduce((inner, entries) => inner + entries.length, 0), 0);
    const pregnancyLogDays = logs.filter(({ log }) => log?.pregnancy && Object.keys(log.pregnancy).length > 0).length;
    const postpartumLogDays = logs.filter(({ log }) => log?.postpartum && Object.keys(log.postpartum).length > 0).length;

    const noteEntryCount = keys.reduce((sum, key) => sum + (data.dayNotes[key]?.length ?? 0), 0);
    const meds = summarizeMedicationProgress(data.meds, keys, data.medLog, data.medLogItems ?? {}, new Date());

    const periodDays = logs
      .filter(({ log }) => !!(log?.periodInfo?.level ?? log?.period))
      .map(({ key, log }) => ({ key, level: log?.periodInfo?.level ?? log?.period }));
    const periodStart = periodDays[0]?.key;
    const periodEnd = periodDays[periodDays.length - 1]?.key;
    const periodText = periodStart && periodEnd
      ? `${fromKey(periodStart).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}${periodEnd !== periodStart ? ` – ${fromKey(periodEnd).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}` : ""} · ${periodDays.length} ${periodDays.length === 1 ? t("day") : t("days")}`
      : "";

    const entryCount = painEntries.length + tetanyEntries.length + panicEntries.length + bowelEntries.length + thermoEntries.length + workoutEntries.length + sleepValues.length + temperatureValues.length + weightValues.length + moodEntries.length + energyEntries.length + sexEntries.length + foodEntries.length + histamineEntries.length + extraMedEntries.length + customLogCount + additionalFieldCount + pregnancyLogDays + postpartumLogDays + noteEntryCount + periodDays.length + (meds.taken || 0);

    return {
      logs,
      painEntries, painAvg,
      tetanyEntries, tetanyAvg,
      panicEntries, panicAvg,
      headacheEntries, headacheAvg,
      pressureEntries, pressureAvg,
      hotFlashEntries, hotFlashAvg,
      nauseaEntries, nauseaAvg,
      pcosEntries,
      bowelEntries, bowelMode,
      thermoEntries,
      workoutEntries, workoutMinutes,
      sleepValues, sleepAvg,
      temperatureValues, temperatureAvg,
      weightValues, weightAvg,
      moodEntries, energyEntries,
      sexEntries, foodEntries,
      histamineFlareCount,
      extraMedEntries,
      customLogCount,
      customLogLabels,
      additionalFieldCount,
      pregnancyLogDays,
      postpartumLogDays,
      noteEntryCount,
      meds,
      periodDays, periodText,
      entryCount,
    };
  }, [data, language, monthAnchor, t]);

  const meta = (count: number) => `${count} ${count === 1 ? t("entry") : t("entries")}`;
  const avg = (value: number | null | undefined, suffix: string) => value != null ? `${value.toFixed(1)} ${suffix}` : t("Logged");

  const rows = [
    month.painEntries.length ? { key: "pain", icon: <FlameIcon size={21} />, label: `${t("Pain")} (avg)`, meta: meta(month.painEntries.length), value: avg(month.painAvg, "/10"), accent: "#F05A28" } : null,
    month.tetanyEntries.length ? { key: "tetany", icon: <Ico e="⚡️" size={21} />, label: t("Tetany episodes"), meta: meta(month.tetanyEntries.length), value: avg(month.tetanyAvg, "/5"), accent: "#3F83E8" } : null,
    month.panicEntries.length ? { key: "panic", icon: <Ico e="✨" size={21} />, label: t("Panic attacks"), meta: meta(month.panicEntries.length), value: avg(month.panicAvg, "/10"), accent: "#8D58E8" } : null,
    month.headacheEntries.length ? { key: "headache", icon: <Ico e="🧠" size={21} />, label: `${t("Headache")} (avg)`, meta: meta(month.headacheEntries.length), value: avg(month.headacheAvg, "/10"), accent: "#7467D8" } : null,
    month.pressureEntries.length ? { key: "pressure", icon: <Ico e="💢" size={21} />, label: `${t("Pressure")} (avg)`, meta: meta(month.pressureEntries.length), value: avg(month.pressureAvg, "/10"), accent: "#E8439B" } : null,
    month.hotFlashEntries.length ? { key: "hotFlashes", icon: <Ico e="🌡️" size={21} />, label: `${t("Hot flashes")} (avg)`, meta: meta(month.hotFlashEntries.length), value: avg(month.hotFlashAvg, "/5"), accent: "#E65073" } : null,
    month.nauseaEntries.length ? { key: "nausea", icon: <Ico e="🤢" size={21} />, label: `${t("Nausea")} (avg)`, meta: meta(month.nauseaEntries.length), value: avg(month.nauseaAvg, "/5"), accent: "#6E9A4C" } : null,
    month.pcosEntries.length ? { key: "pcos", icon: <Ico e="🌻" size={21} />, label: t("PCOS symptoms"), meta: meta(month.pcosEntries.length), value: t("Logged"), accent: "#C49A35" } : null,
    month.histamineFlareCount ? { key: "histamine", icon: <Ico e="🌶️" size={21} />, label: t("Histamine flares"), meta: meta(month.histamineFlareCount), value: `${month.histamineFlareCount}×`, accent: "#D8613E" } : null,
    month.bowelEntries.length ? { key: "bowel", icon: <PoopIcon size={21} />, label: `${t("Bowel")} (mode)`, meta: meta(month.bowelEntries.length), value: month.bowelMode != null ? `${t("type")} ${month.bowelMode}` : t("Logged"), accent: "#A66A4D" } : null,
    month.temperatureValues.length ? { key: "temperature", icon: <Ico e="🌡️" size={21} />, label: `${t("Body temperature")} (avg)`, meta: meta(month.temperatureValues.length), value: avg(month.temperatureAvg, "°C"), accent: "#E65073" } : null,
    month.weightValues.length ? { key: "weight", icon: <Ico e="⚖️" size={21} />, label: `${t("Weight")} (avg)`, meta: meta(month.weightValues.length), value: avg(month.weightAvg, "kg"), accent: "#657891" } : null,
    month.sleepValues.length ? { key: "sleep", icon: <ClockIcon size={21} />, label: `${t("Sleep")} (avg)`, meta: meta(month.sleepValues.length), value: avg(month.sleepAvg, "h"), accent: "#7467D8" } : null,
    month.moodEntries.length ? { key: "mood", icon: <Ico e="🙂" size={21} />, label: t("Mood"), meta: meta(month.moodEntries.length), value: t("Logged"), accent: "#B88748" } : null,
    month.energyEntries.length ? { key: "energy", icon: <Ico e="⚡️" size={21} />, label: t("Energy"), meta: meta(month.energyEntries.length), value: t("Logged"), accent: "#D6A53E" } : null,
    month.workoutEntries.length ? { key: "workout", icon: <Ico e="👟" size={21} />, label: t("Workout"), meta: meta(month.workoutEntries.length), value: month.workoutMinutes ? `${month.workoutMinutes} min` : t("Logged"), accent: "#5F84D6" } : null,
    month.thermoEntries.length ? { key: "thermo", icon: <Ico e="♨️" size={21} />, label: t("Therapy sessions"), meta: meta(month.thermoEntries.length), value: `${month.thermoEntries.length}×`, accent: "#D7814A" } : null,
    month.meds.taken > 0 ? { key: "meds", icon: <PillIcon size={21} />, label: t("Medication"), meta: `${month.meds.taken} ${t("taken")}`, value: month.meds.pct != null ? `${month.meds.pct}%` : t("Logged"), accent: "#83985A" } : null,
    month.extraMedEntries.length ? { key: "extraMeds", icon: <PillIcon size={21} />, label: t("Extra medication"), meta: meta(month.extraMedEntries.length), value: `${month.extraMedEntries.length}×`, accent: "#9A7358" } : null,
    month.sexEntries.length ? { key: "sex", icon: <HeartIcon size={21} />, label: t("Sex"), meta: meta(month.sexEntries.length), value: `${month.sexEntries.length}×`, accent: "#6F963B" } : null,
    month.foodEntries.length ? { key: "food", icon: <Ico e="🍽️" size={21} />, label: t("Food"), meta: meta(month.foodEntries.length), value: `${month.foodEntries.length}`, accent: "#B88748" } : null,
    month.periodDays.length ? { key: "period", icon: <Ico e="🫐" size={21} />, label: t("Blueberry"), meta: `${month.periodDays.length} ${month.periodDays.length === 1 ? t("day") : t("days")}`, value: month.periodText, accent: "#7467D8" } : null,
    month.pregnancyLogDays ? { key: "pregnancy", icon: <Ico e="🤰" size={21} />, label: t("Pregnancy log"), meta: `${month.pregnancyLogDays} ${t("days logged")}`, value: t("Logged"), accent: "#B8768B" } : null,
    month.postpartumLogDays ? { key: "postpartum", icon: <Ico e="🫶" size={21} />, label: t("Postpartum log"), meta: `${month.postpartumLogDays} ${t("days logged")}`, value: t("Logged"), accent: "#A8798F" } : null,
    month.customLogCount ? { key: "customLogs", icon: <Ico e="➕" size={21} />, label: month.customLogLabels.length === 1 ? month.customLogLabels[0] : t("Saved entries"), meta: meta(month.customLogCount), value: month.customLogLabels.length > 1 ? month.customLogLabels.slice(0, 2).join(" · ") : t("Logged"), accent: "#6F7F52" } : null,
    month.additionalFieldCount ? { key: "additionalFields", icon: <Ico e="🧩" size={21} />, label: t("Additional fields"), meta: meta(month.additionalFieldCount), value: `${month.additionalFieldCount}`, accent: "#7D719A" } : null,
    month.noteEntryCount ? { key: "notes", icon: <NoteIcon size={21} />, label: t("Notes"), meta: meta(month.noteEntryCount), value: t("Logged"), accent: "#B89A36" } : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[950] flex items-center justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" aria-label={t("Close summary")} data-bixbo-overlay-backdrop="month-summary" className="absolute inset-0 bg-black/40" onClick={onClose} />
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
            <button type="button" onClick={() => { onOpenCalendar(toKey(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1))); onClose(); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-[19px] border border-border/55 bg-tint/45 px-3 py-2.5 text-left">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/60 bg-background/80"><Ico e="📅" size={18} /></span>
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
          {rows.length === 0 ? (
            <div className="rounded-[22px] border border-border/55 bg-tint/30 px-4 py-6 text-center text-sm text-muted-foreground">{t("Nothing logged this month.")}</div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-border/55 bg-background/75">
              {rows.map((row, index) => (
                <div key={row.key} className={`grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-left ${index ? "border-t border-border/45" : ""}`}>
                  <span className="grid h-8 w-8 place-items-center">{row.icon}</span>
                  <span className="min-w-0"><span className="block truncate text-[12.5px] font-bold leading-tight text-foreground">{row.label}</span><span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted-foreground">{row.meta}</span></span>
                  <span className="max-w-[118px] truncate text-right text-[12.5px] font-extrabold leading-tight" style={{ color: row.accent }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}