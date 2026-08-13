import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboIcons";

import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";
import {
  BlueberryIcon,
  ClockIcon,
  FlameIcon,
  HeartIcon,
  Ico,
  IcoText,
  NoteIcon,
  PanicIcon,
  PillIcon,
  PoopIcon,
  StarIcon,
} from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  avgDayPain,
  latestDayWeight,
  averageDayTemperature,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  isIntercourseKind,
  type BixboData,
  type BowelEntry,
  type SexEntry,
} from "@/lib/storage";
import { ScheduledDosePopup, type ScheduledDoseTarget } from "@/components/home/ScheduledDosePopup";
import { getTakenScheduledItems, isScheduledDoseTaken, scheduledDoseKey } from "@/lib/medicationAdherence";

export function DayPreview({
  date,
  data,
  update,
  onEditPain,
  onEdit,
}: {
  date: string;
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onEditPain?: (p: import("@/lib/storage").PainEntry) => void;
  onEdit?: (cat: string, entry: unknown) => void;
}) {
  const { t } = useI18n();
  const [scheduledDoseTarget, setScheduledDoseTarget] = useState<ScheduledDoseTarget | null>(null);
  const log = data.dayLogs[date];
  const rawNotes = data.dayNotes[date] ?? [];
  const notes: { text: string; time?: string }[] = (rawNotes as (string | { text: string; time?: string })[]).map(
    (n) => (typeof n === "string" ? { text: n } : n),
  );
  const todos = data.todos[date] ?? [];
  const events = data.events.filter((e) => date >= e.startDate && date <= e.endDate);
  const tasks = data.tasks.filter((t) => date >= t.startDate && date <= t.endDate);

  const k = todayKey();
  const isToday = date === k;
  const nowHHMM = new Date().toTimeString().slice(0, 5);
  const meds = data.meds;
  const scheduled = data.meds
    .filter((m) => !m.asNeeded)
    .flatMap((m) =>
      m.times.map((t) => ({
        key: scheduledDoseKey(m, t),
        med: m,
        time: t,
        taken: isScheduledDoseTaken(m, date, t, data.medLog, data.medLogItems ?? {}),
      })),
    );
  const takenList = scheduled.filter((x) => x.taken);
  const missedList = scheduled.filter((x) => !x.taken && (date < k || (date === k && x.time < nowHHMM)));
  const extraMeds = log?.extraMeds ?? [];
  const customLogsForDay = customLogDefinitions(data)
    .map((definition) => ({ definition, entries: log?.customLogs?.[definition.id] ?? [] }))
    .filter((item) => item.entries.length > 0);
  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const flowLabel = (level?: string | null): string => {
    switch (level) {
      case "spotting":
        return t("Spotting");
      case "light":
        return t("Light");
      case "medium":
        return t("Medium");
      case "heavy":
        return t("Heavy");
      case "very-heavy":
        return t("Very heavy");
      default:
        return "";
    }
  };

  const anything =
    !!(
      log &&
      (log.pain?.length ||
        log.tetany?.length ||
        log.panic?.length ||
        log.period ||
        log.periodInfo?.level ||
        log.food?.length ||
        log.bowel?.length ||
        log.sex?.length ||
        log.heat?.length ||
        log.workout?.length ||
        log.temperature != null ||
        log.weight != null ||
        log.sleepHours != null ||
        extraMeds.length)
    ) ||
    notes.length ||
    todos.length ||
    events.length ||
    tasks.length ||
    customLogsForDay.length ||
    takenList.length ||
    missedList.length;

  if (!anything)
    return (
      <div className="mx-5 mt-4 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
        <p className="text-sm text-muted-foreground">{isToday ? t("Nothing logged today yet.") : t("Nothing logged this day yet.")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Tap the")} <span className="font-bold">+ {t("Log")}</span> {t("button below.")}
        </p>
      </div>
    );

  const formatCustomValue = (field: RegistryFieldDefinition, value: unknown): string => {
    if (value == null || value === "") return "";
    if (Array.isArray(value)) return value.map((item) => field.optionLabels?.[String(item)] ?? String(item)).join(", ");
    if (typeof value === "boolean") return value ? t("Yes") : t("No");
    return String(value);
  };



  return (
    <div className="space-y-3 px-5 pt-3 pb-32">
      {(takenList.length > 0 || extraMeds.length > 0 || missedList.length > 0) && (
        <Card title="Meds" icon="💊">
          <ul className="space-y-1 text-sm">
            {takenList.map((x) => {
              const actual = data.medLogTimes?.[date]?.[x.key];
              const shifted = actual && actual !== x.time;
              return (
                <li key={x.key}>
                  <button
                    onClick={() => setScheduledDoseTarget({ key: x.key, med: x.med, time: x.time })}
                    className="text-left text-green-700 hover:underline"
                    title={t("Tap to edit meds")}
                  >
                    {(() => {
                      const all = medScheduleItems(x.med);
                      const selected = getTakenScheduledItems(x.med, date, x.time, data.medLog, data.medLogItems ?? {});
                      const omitted = all.filter((item) => !selected.includes(item));
                      return <>
                        {t("Taken")} · {actual ?? x.time} — {selected.join(", ")}
                        {x.med.dose ? ` (${x.med.dose})` : ""}
                        {shifted && <span className="text-[10px] text-muted-foreground"> · {t("scheduled")} {x.time}</span>}
                        {omitted.length ? <span className="block text-[10px] text-destructive">{t("Not taken")}: {omitted.join(", ")}</span> : null}
                        {data.medLogNotes?.[date]?.[x.key] ? <span className="block text-[10px] text-muted-foreground">{t("Note")}: {data.medLogNotes?.[date]?.[x.key]}</span> : null}
                        <span className="text-[10px] text-primary"> · {t("Tap to edit")}</span>
                      </>;
                    })()}
                  </button>
                </li>
              );
            })}
            {missedList.map((x) => (
              <li key={x.key} className="flex items-start gap-2">
                <button
                  onClick={() => setScheduledDoseTarget({ key: x.key, med: x.med, time: x.time })}
                  className="flex-1 text-left text-destructive/90"
                  title={t("Tap to edit meds")}
                >
                  {t("Missed")} · {x.time} — {x.med.name}
                  {x.med.dose ? ` (${x.med.dose})` : ""}{" "}
                  <span className="text-[10px] text-primary">· {t("Tap to edit")}</span>
                  {data.medLogNotes?.[date]?.[x.key] ? (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {data.medLogNotes[date][x.key]}</span>
                  ) : null}
                </button>
              </li>
            ))}
            {extraMeds.map((e, index) => (
              <li key={e.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("meds", e)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">{e.time}</p>
                  <div className="my-2 border-t border-border/60" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Medication")}:</span>{" "}
                    {e.name}{e.dose ? ` (${e.dose})` : ""}
                  </p>
                  {e.note ? (
                    <p className="mt-2 whitespace-pre-line text-sm">
                      <span className="font-semibold">{t("Note")}:</span> {e.note}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <button
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((x) => x.id !== e.id),
                        },
                      },
                    }))
                  }
                  aria-label={t("Delete")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(log?.pain?.some((entry) => entry.entryKind !== "symptom-update") && (
        <Card title="Pain" icon="🔥">
          <ul className="space-y-2">
            {log.pain.filter((p) => p.entryKind !== "symptom-update").map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-3">
                <button
                  onClick={() => onEditPain?.(p)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: painColor(p.score) }}
                  aria-label={t("Edit pain entry")}
                >
                  {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
                </button>
                <button onClick={() => onEditPain?.(p)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {p.time} · {t(PAIN_DESCRIPTIONS[Math.round(p.score)])}
                  </p>
                  {p.parts.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Body")}:</span>{" "}
                      {p.parts.map(t).join(", ")}
                    </p>
                  )}
                  <div className="my-2 border-t border-border/60" />
                  {p.quality.length > 0 && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Symptoms")}:</span>{" "}
                      {p.quality.map(t).join(", ")}
                    </p>
                  )}
                  {p.symptoms.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Other")}:</span>{" "}
                      {p.symptoms.map(t).join(", ")}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}
                  {p.pressureTypes?.length || p.pressureIntensity != null ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Pressure")}:</span>{" "}{p.pressureTypes?.map(t).join(", ")}
                      {p.pressureIntensity != null
                        ? `${p.pressureTypes?.length ? " " : ""}${p.pressureIntensity}/10`
                        : ""}
                    </p>
                  ) : null}
                  {p.nausea || p.nauseaTypes?.length || p.nauseaSeverity != null ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Nausea")}:</span>{" "}{p.nauseaTypes?.map(t).join(", ")}
                      {p.nauseaSeverity != null ? `${p.nauseaTypes?.length ? " " : ""}${p.nauseaSeverity}/10` : ""}
                      {p.nauseaOngoing ? ` · ${t("ongoing")}` : p.nauseaMinutes != null ? ` · ${p.nauseaMinutes} min` : ""}
                      {p.nauseaTriggers?.length ? ` · ${t("triggers")}: ${p.nauseaTriggers.map(t).join(", ")}` : ""}
                    </p>
                  ) : null}
                  {p.nauseaSymptoms?.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Nausea")} {t("symptoms")}:</span> {p.nauseaSymptoms.map(t).join(", ")}
                    </p>
                  ) : null}
                  {p.nauseaHelped?.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Relieved by")}:</span> {p.nauseaHelped.map(t).join(", ")}
                    </p>
                  ) : null}
                  {p.hotFlashes != null && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Hot flashes")}:</span>{" "}{p.hotFlashes}/5
                    </p>
                  )}
                  {p.headacheTypes?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Headache")}:</span>{" "}{p.headacheTypes.map(t).join(", ")}
                      {p.headacheIntensity != null ? ` ${p.headacheIntensity}/10` : ""}
                    </p>
                  ) : p.headacheIntensity != null ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Headache")}:</span>{" "}{p.headacheIntensity}/10
                    </p>
                  ) : null}
                  {p.headacheMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> {t("Headache med")}: {p.headacheMed}
                      {p.headacheMedTime ? ` ${t("at")} ${p.headacheMedTime}` : ""}
                    </p>
                  ) : null}
                  {p.pcosSymptoms?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">PCOS:</span> {p.pcosSymptoms.map(t).join(", ")}</p>
                  ) : null}
                  {p.mood?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Mood")}:</span> <IcoText text={p.mood.map(t).join(", ")} size={13} />
                    </p>
                  ) : null}
                  {p.stress != null && <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Stress")}:</span> {p.stress}/10</p>}
                  {p.bodyBattery != null && <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{t("Battery")}:</span> {p.bodyBattery}/5</p>}
                  {p.note && <p className="mt-2 text-sm whitespace-pre-line"><span className="font-semibold">{t("Note")}:</span> {p.note}</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          pain: (d.dayLogs[date]?.pain ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
                {(log.pain ?? []).some((entry) => entry.entryKind === "symptom-update" && entry.sourcePainId === p.id) ? (
                  <div className="basis-full pl-12 pr-7">
                    <div className="mt-1 space-y-2 border-l-2 border-primary/25 pl-3">
                      {(log.pain ?? [])
                        .filter((entry) => entry.entryKind === "symptom-update" && entry.sourcePainId === p.id)
                        .map((entry) => (
                          <div key={entry.id} className="flex items-start gap-2 rounded-xl bg-primary/5 px-2.5 py-2 ring-1 ring-primary/15">
                            <button onClick={() => onEditPain?.(entry)} className="min-w-0 flex-1 text-left">
                              <p className="text-[11px] font-semibold text-primary">{entry.time} · {t("Add symptoms")}</p>
                              {entry.symptoms.length > 0 ? <p className="mt-0.5 text-sm">{entry.symptoms.map(t).join(", ")}</p> : null}
                              {entry.nausea || entry.nauseaSeverity != null || entry.nauseaTypes?.length ? (
                                <p className="text-sm">{t("Nausea")}{entry.nauseaSeverity != null ? ` ${entry.nauseaSeverity}/10` : ""}{entry.nauseaTypes?.length ? ` · ${entry.nauseaTypes.map(t).join(", ")}` : ""}</p>
                              ) : null}
                              {entry.headache || entry.headacheIntensity != null || entry.headacheTypes?.length ? (
                                <p className="text-sm">{t("Headache")}{entry.headacheIntensity != null ? ` ${entry.headacheIntensity}/10` : ""}{entry.headacheTypes?.length ? ` · ${entry.headacheTypes.map(t).join(", ")}` : ""}</p>
                              ) : null}
                              {entry.hotFlashesOn || entry.hotFlashes != null ? <p className="text-sm">{t("Hot flashes")}{entry.hotFlashes != null ? ` ${entry.hotFlashes}/5` : ""}</p> : null}
                              {entry.pcosSymptoms?.length ? <p className="text-sm">PCOS: {entry.pcosSymptoms.map(t).join(", ")}</p> : null}
                              {entry.fluNote ? <p className="text-sm">Flu: {entry.fluNote}</p> : null}
                              {entry.note ? <p className="mt-1 whitespace-pre-line text-sm"><span className="font-semibold">{t("Note")}:</span> {entry.note}</p> : null}
                              <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                            </button>
                            <DeleteBtn
                              onClick={() =>
                                update((d) => ({
                                  ...d,
                                  dayLogs: {
                                    ...d.dayLogs,
                                    [date]: {
                                      ...d.dayLogs[date],
                                      pain: (d.dayLogs[date]?.pain ?? []).filter((item) => item.id !== entry.id),
                                    },
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )) ||
        null}

      {log?.pain?.some((entry) => entry.entryKind === "symptom-update" && !entry.sourcePainId) ? (
        <Card title="Add symptoms" icon="➕">
          <ul className="space-y-2">
            {log.pain
              .filter((entry) => entry.entryKind === "symptom-update" && !entry.sourcePainId)
              .map((entry) => (
                <li key={entry.id} className="flex items-start gap-2">
                  <button onClick={() => onEditPain?.(entry)} className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-semibold text-muted-foreground">{entry.time} · {t("Add symptoms")}</p>
                    {entry.symptoms.length > 0 ? <p className="text-sm">{entry.symptoms.map(t).join(", ")}</p> : null}
                    {entry.nausea || entry.nauseaSeverity != null || entry.nauseaTypes?.length ? (
                      <p className="text-sm">{t("Nausea")}{entry.nauseaSeverity != null ? ` ${entry.nauseaSeverity}/10` : ""}{entry.nauseaTypes?.length ? ` · ${entry.nauseaTypes.map(t).join(", ")}` : ""}</p>
                    ) : null}
                    {entry.headache || entry.headacheIntensity != null || entry.headacheTypes?.length ? (
                      <p className="text-sm">{t("Headache")}{entry.headacheIntensity != null ? ` ${entry.headacheIntensity}/10` : ""}{entry.headacheTypes?.length ? ` · ${entry.headacheTypes.map(t).join(", ")}` : ""}</p>
                    ) : null}
                    {entry.hotFlashesOn || entry.hotFlashes != null ? <p className="text-sm">{t("Hot flashes")}{entry.hotFlashes != null ? ` ${entry.hotFlashes}/5` : ""}</p> : null}
                    {entry.pcosSymptoms?.length ? <p className="text-sm">PCOS: {entry.pcosSymptoms.map(t).join(", ")}</p> : null}
                    {entry.fluNote ? <p className="text-sm">Flu: {entry.fluNote}</p> : null}
                    {entry.note ? <p className="mt-1 whitespace-pre-line text-sm"><span className="font-semibold">{t("Note")}:</span> {entry.note}</p> : null}
                    <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                  </button>
                  <DeleteBtn
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        dayLogs: {
                          ...d.dayLogs,
                          [date]: {
                            ...d.dayLogs[date],
                            pain: (d.dayLogs[date]?.pain ?? []).filter((item) => item.id !== entry.id),
                          },
                        },
                      }))
                    }
                  />
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {log?.panic?.length ? (
        <Card title="Panic episode" icon="🫯">
          <ul className="space-y-3">
            {log.panic.map((p, index) => (
              <li key={p.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("panic", p)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {p.time} · {t("intensity")} {p.intensity}/10 · {p.minutes == null ? t("ongoing") : `${p.minutes} min`}
                  </p>
                  <div className="my-2 border-t border-border/60" />
                  {p.trigger && (
                    <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Trigger")}:</span> {p.trigger}</p>
                  )}
                  {p.physical.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Physical")}:</span> {p.physical.map(t).join(", ")}</p>
                  )}
                  {p.cognitive.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Cognitive")}:</span> {p.cognitive.map(t).join(", ")}</p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Hyperventilation")}:</span> {t(p.hyperventilation)}
                    {p.tetanyPresent ? ` · ${t("tetany present")}` : ""}
                  </p>
                  {p.helped.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Helped")}:</span> {p.helped.map(t).join(", ")}</p>
                  )}
                  {p.rescueMed ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Rescue")}:</span> {p.rescueMed}</p>
                  ) : null}
                  {p.note && <p className="mt-2 text-sm whitespace-pre-line"><span className="font-semibold">{t("Note")}:</span> {p.note}</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.tetany?.length ? (
        <Card title="Tetany episode" icon="⚡">
          <ul className="space-y-3">
            {log.tetany.map((tetanyEntry, index) => (
              <li key={tetanyEntry.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("tetany", tetanyEntry)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {tetanyEntry.time} · {tetanyEntry.types.length ? tetanyEntry.types.map(t).join(", ") : t("Tetany")} · {tetanyEntry.intensity}/5 ·{" "}
                    {tetanyEntry.minutes == null ? t("ongoing") : `${tetanyEntry.minutes} min`}
                  </p>
                  <div className="my-2 border-t border-border/60" />
                  {tetanyEntry.triggers.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Triggers")}:</span> {tetanyEntry.triggers.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.location?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Location")}:</span> {tetanyEntry.location.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.helped?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Helped")}:</span> {tetanyEntry.helped.map(t).join(", ")}</p>
                  ) : null}
                  {tetanyEntry.rescueMed ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Rescue")}:</span> {tetanyEntry.rescueMed}</p>
                  ) : null}
                  {tetanyEntry.note && <p className="mt-2 text-sm whitespace-pre-line"><span className="font-semibold">{t("Note")}:</span> {tetanyEntry.note}</p>}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== tetanyEntry.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!cycleTrackingHidden &&
        !!(
          log?.period ||
          log?.periodInfo?.level ||
          log?.periodInfo?.discharge ||
          log?.periodInfo?.dischargeNote ||
          log?.periodInfo?.cramps != null ||
          log?.periodInfo?.note
        ) && (
          <Card title="Blueberry" icon="🫐">
            <button onClick={() => onEdit?.("period", undefined)} className="w-full text-left">
              <div className="my-2 border-t border-border/60" />
              {(log?.periodInfo?.level || log?.period) && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Flow")}:</span>{" "}
                  {flowLabel(log?.periodInfo?.level ?? log?.period)}
                </p>
              )}
              {log?.periodInfo?.cramps != null && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Cramp pain")}:</span>{" "}
                  <span style={{ color: painColor(log.periodInfo.cramps) }}>
                    {Number.isInteger(log.periodInfo.cramps) ? log.periodInfo.cramps : log.periodInfo.cramps.toFixed(1)}/10
                    {" — "}{t(PAIN_DESCRIPTIONS[Math.round(log.periodInfo.cramps)])}
                  </span>
                </p>
              )}
              {log?.periodInfo?.discharge && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Discharge")}:</span>{" "}
                  {t(log.periodInfo.discharge)}
                  {log.periodInfo.dischargeNote ? ` — ${log.periodInfo.dischargeNote}` : ""}
                </p>
              )}
              {log?.periodInfo?.note && (
                <p className="mt-2 text-sm whitespace-pre-line">
                  <span className="font-semibold">{t("Note")}:</span> {log.periodInfo.note}
                </p>
              )}
              <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
            </button>
          </Card>
        )}

      {log?.sex?.length ? (
        <Card title="ŠukŠuk!" icon="❤️" compact>
          <ul className="space-y-1">
            {log.sex.map((s: SexEntry, index) => (
              <li key={s.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-1.5" : ""}`}>
                <button onClick={() => onEdit?.("sex", s)} className="min-w-0 flex-1 text-left">
                  <p className="text-[11px] leading-none text-muted-foreground">{s.time}</p>
                  <div className="my-1 border-t border-border/60" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}
                    {t(String(s.kind).replace(/_/g, " "))}
                  </p>
                  {asArr(s.feelingAfter).length ? (
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Feeling after")}:</span>{" "}
                      <IcoText text={asArr(s.feelingAfter).join(", ")} size={13} />
                    </p>
                  ) : null}
                  {s.painful && s.painful !== "no" ? (
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Painful")}:</span> {t(s.painful)}
                    </p>
                  ) : null}
                  {s.note ? (
                    <p className="mt-1 whitespace-pre-line text-xs leading-snug">
                      <span className="font-semibold">{t("Note")}:</span> {s.note}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[9px] leading-tight text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== s.id) },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.heat?.length ? (
        <Card title="Heat / Cold / TENS" icon="♨️">
          <ul className="space-y-3">
            {log.heat.map((h, index) => (
              <li key={h.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("heat", h)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">{h.start}</p>
                  <div className="my-2 border-t border-border/60" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}
                    <Ico e={h.kind === "heat" ? "♨️" : h.kind === "cold" ? "🧊" : "⭐"} size={13} /> {t(h.kind === "heat" ? "Heat" : h.kind === "cold" ? "Cold" : "TENS")}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Duration")}:</span>{" "}
                    {h.ongoing ? t("ongoing") : `${h.minutes ?? 0} min`}
                  </p>
                  {h.note ? (
                    <p className="mt-2 whitespace-pre-line text-sm">
                      <span className="font-semibold">{t("Note")}:</span> {h.note}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          heat: (d.dayLogs[date]?.heat ?? []).filter((x) => x.id !== h.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.food?.length ? (
        <Card title="Food" icon="🍽️" compact>
          <ul className="space-y-0.5">
            {log.food.map((f, index) => (
              <li key={f.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-0.5" : ""}`}>
                <button onClick={() => onEdit?.("food", f)} className="min-w-0 flex-1 text-left">
                  <p className="text-[11px] leading-none text-muted-foreground">{f.time}</p>
                  <div className="my-0.5 border-t border-border/60" />
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Food")}:</span>{" "}
                    <IcoText text={f.what || (f.histamineFlare ? t("(histamine flare)") : "—")} size={13} />
                  </p>
                  {f.highHistamine ? (
                    <p className="mt-px text-[11px] leading-tight text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Histamine")}:</span> {t("high histamine")}
                    </p>
                  ) : null}
                  {f.hydrationMl != null ? (
                    <p className="mt-px text-[11px] leading-tight text-muted-foreground"><span className="font-semibold text-foreground">{t("Hydration")}:</span> {f.hydrationMl} ml</p>
                  ) : null}
                  {f.caffeineMg != null ? (
                    <p className="mt-px text-[11px] leading-tight text-muted-foreground"><span className="font-semibold text-foreground">{t("Caffeine")}:</span> {f.caffeineMg} mg</p>
                  ) : null}
                  {f.alcoholDrinks != null ? (
                    <p className="mt-px text-[11px] leading-tight text-muted-foreground"><span className="font-semibold text-foreground">{t("Drinks")}:</span> {f.alcoholDrinks}</p>
                  ) : null}
                  {f.feelings.length ? (
                    <p className="mt-px text-[11px] leading-tight text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Feel")}:</span>{" "}
                      <IcoText text={f.feelings.map(t).join(", ")} size={13} />
                    </p>
                  ) : null}
                  {f.symptomsAfter?.length ? (
                    <p className="mt-px text-[11px] leading-tight text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("After")}:</span>{" "}
                      <IcoText text={f.symptomsAfter.map(t).join(", ")} size={13} />
                    </p>
                  ) : null}
                  {f.histamineFlare ? (
                    <p className="mt-px text-[11px] leading-tight text-destructive">
                      <span className="font-semibold"><Ico e="🔥" size={13} /> {t("Histamine flare")}:</span>{" "}
                      {f.histamineSymptoms?.length ? f.histamineSymptoms.join(", ") : t("Yes")}
                    </p>
                  ) : null}
                  {f.after ? (
                    <p className="mt-px whitespace-pre-line text-[11px] leading-tight">
                      <span className="font-semibold">{t("Note")}:</span> {f.after}
                    </p>
                  ) : null}
                  <p className="mt-0 text-[9px] leading-tight text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          food: (d.dayLogs[date]?.food ?? []).filter((x) => x.id !== f.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.bowel?.length ? (
        <Card title="Bowel" icon="💩" compact>
          <ul className="space-y-1">
            {log.bowel.map((b: BowelEntry, index) => {
              const bristol = b.bristol >= 0 ? BRISTOL.find((x) => x.n === b.bristol) : null;
              const typeLabel = bristol
                ? `Type ${bristol.n}`
                : b.bristol === 0
                  ? t("Type 0")
                  : t("No bowel movement");
              const typeDescription = bristol?.sub ?? (b.bristol === 0 ? t("Mystery") : "");
              return (
                <li key={b.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-1.5" : ""}`}>
                  <button onClick={() => onEdit?.("bowel", b)} className="min-w-0 flex-1 text-left">
                    <p className="text-[11px] leading-none text-muted-foreground">{b.time}</p>
                    <div className="my-1 border-t border-border/60" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}
                      <IcoText text={`${typeLabel}${typeDescription ? ` — ${typeDescription}` : ""}`} size={13} />
                    </p>
                    {b.feelings?.length ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Feelings")}:</span>{" "}
                        <IcoText text={b.feelings.join(", ")} size={13} />
                      </p>
                    ) : null}
                    {b.symptoms?.length ? (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("Symptoms")}:</span>{" "}
                        <IcoText text={b.symptoms.join(", ")} size={13} />
                      </p>
                    ) : null}
                    {b.note ? (
                      <p className="mt-1 text-xs leading-snug whitespace-pre-line">
                        <span className="font-semibold">{t("Note")}:</span> {b.note}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[9px] leading-tight text-primary">{t("Tap to edit")}</p>
                  </button>
                  <DeleteBtn
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        dayLogs: {
                          ...d.dayLogs,
                          [date]: {
                            ...d.dayLogs[date],
                            bowel: (d.dayLogs[date]?.bowel ?? []).filter((x) => x.id !== b.id),
                          },
                        },
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {log?.workout?.length ? (
        <Card title="Workout" icon="👟">
          <ul className="space-y-3">
            {log.workout.map((w, index) => (
              <li key={w.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button onClick={() => onEdit?.("workout", w)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">{w.time}</p>
                  <div className="my-2 border-t border-border/60" />
                  <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Type")}:</span> <IcoText text={w.kind} size={13} /></p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Duration")}:</span> {w.minutes} min</p>
                  {w.distanceKm != null ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Distance")}:</span> {w.distanceKm} km</p> : null}
                  {w.elevationM != null ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Elevation")}:</span> {w.elevationM} m</p> : null}
                  {w.rpe != null ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">RPE:</span> {w.rpe}/10</p> : null}
                  {w.magnesiumBefore ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Magnesium")}:</span> {t("before workout")}</p> : null}
                  {w.exercises?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Exercises")}:</span>{" "}
                      {w.exercises.map((ex) => `${ex.name || t("Exercise")}${ex.sets ? ` ${ex.sets}×${ex.reps ?? "?"}` : ""}${ex.weightKg ? ` @ ${ex.weightKg} kg` : ""}`).join(" · ")}
                    </p>
                  ) : null}
                  {w.weightKg != null ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Weight after")}:</span> {w.weightKg} kg</p> : null}
                  {w.triggeredSymptom ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Triggered")}:</span> {t(w.triggeredSymptom.label ?? w.triggeredSymptom.type)}</p> : null}
                  {asArr(w.feeling).length ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Feeling")}:</span> <IcoText text={asArr(w.feeling).join(", ")} size={13} /></p> : null}
                  {w.note ? <p className="mt-2 whitespace-pre-line text-sm"><span className="font-semibold">{t("Note")}:</span> {w.note}</p> : null}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: { ...d.dayLogs, [date]: { ...d.dayLogs[date], workout: (d.dayLogs[date]?.workout ?? []).filter((x) => x.id !== w.id) } },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (
        <Card title="Temp / Sleep / Weight" icon="🌡️">
          <button onClick={() => onEdit?.("temp", undefined)} className="w-full text-left">
            <div className="mb-1 border-t border-border/60" />
            {log?.temperature != null && (
              <p className="text-[11px] leading-tight text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Temperature")}:</span> {log.temperature}°C
              </p>
            )}
            {log?.weight != null && (
              <p className={`${log?.temperature != null ? "mt-0.5 " : ""}text-[11px] leading-tight text-muted-foreground`}>
                <span className="font-semibold text-foreground">{t("Weight")}:</span> {log.weight} kg
              </p>
            )}
            {log?.sleepHours != null && (
              <p className={`${log?.temperature != null || log?.weight != null ? "mt-0.5 " : ""}text-[11px] leading-tight text-muted-foreground`}>
                <span className="font-semibold text-foreground">{t("Sleep")}:</span> {log.sleepHours} h
                {asArr(log.sleepQuality).length ? <> · <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={12} /></> : null}
              </p>
            )}
            {asArr(log?.sleepQuality).length > 0 && log?.sleepHours == null && (
              <p className={`${log?.temperature != null || log?.weight != null ? "mt-0.5 " : ""}text-[11px] leading-tight text-muted-foreground`}>
                <span className="font-semibold text-foreground">{t("Sleep quality")}:</span>{" "}
                <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={12} />
              </p>
            )}
            <p className="mt-0 text-[9px] leading-tight text-primary">{t("Tap to edit")}</p>
          </button>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card title="Tasks" icon="✅">
          <ul className="space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))
                  }
                />
                <button
                  onClick={() => onEdit?.("task", t)}
                  className={`flex-1 text-left ${t.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {t.title}
                  {t.time ? ` · ${t.time}${t.timeEnd ? `–${t.timeEnd}` : ""}` : ""}
                  {t.note ? ` — ${t.note}` : ""}
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {events.length > 0 && (
        <Card title="Events" icon="📅">
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                <button onClick={() => onEdit?.("event", e)} className="flex-1 text-left">
                  {e.title}
                  {e.time ? ` · ${e.time}${e.timeEnd ? `–${e.timeEnd}` : ""}` : ""}
                  {e.startDate !== e.endDate ? ` (${e.startDate}→${e.endDate})` : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, events: d.events.filter((x) => x.id !== e.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {customLogsForDay.map(({ definition, entries }) => (
        <Card key={definition.id} title={definition.label} icon={definition.icon}>
          <ul className="space-y-2 text-sm">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.(`custom:${definition.id}`, entry)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold text-muted-foreground">{entry.time || t("Entry")}</p>
                  {definition.fields
                    .filter((field) => field.enabled !== false)
                    .sort((a, b) => a.order - b.order)
                    .map((field) => {
                      const text = formatCustomValue(field, entry.values?.[field.id]);
                      return text ? <p key={field.id} className="text-xs"><span className="font-semibold">{field.label}:</span> {text}</p> : null;
                    })}
                  {entry.note ? <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{entry.note}</p> : null}
                  <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => {
                      const day = d.dayLogs[date] ?? {};
                      const customLogs = { ...(day.customLogs ?? {}) };
                      const remaining = (customLogs[definition.id] ?? []).filter((item) => item.id !== entry.id);
                      if (remaining.length) customLogs[definition.id] = remaining;
                      else delete customLogs[definition.id];
                      return { ...d, dayLogs: { ...d.dayLogs, [date]: { ...day, customLogs } } };
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {notes.length > 0 && (
        <Card title="Notes" icon="📝">
          <ul className="space-y-1 text-sm">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-1">
                  {n.time ? `${n.time} · ` : ""}
                  {n.text}
                </span>
                <button
                  onClick={() =>
                    update((d) => {
                      const list = (d.dayNotes[date] ?? []) as (string | { text: string; time?: string })[];
                      const next = list.filter((_, j) => j !== i);
                      return { ...d, dayNotes: { ...d.dayNotes, [date]: next as { text: string; time?: string }[] } };
                    })
                  }
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t("Delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {scheduledDoseTarget ? (
        <ScheduledDosePopup
          key={`${date}:${scheduledDoseTarget.key}`}
          date={date}
          target={scheduledDoseTarget}
          data={data}
          update={update}
          onClose={() => setScheduledDoseTarget(null)}
        />
      ) : null}
    </div>
  );
}

export function DeleteBtn({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-destructive" aria-label={t("Delete")}>
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

export function Card({
  title,
  icon,
  children,
  compact = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`rounded-3xl bg-surface ring-1 ring-border ${compact ? "px-4 py-3" : "p-4"}`}>
      <div className={`${compact ? "mb-1" : "mb-2"} flex items-center gap-2`}>
        <Ico e={icon} size={compact ? 20 : 22} />
        <h3 className={`font-serif font-semibold ${compact ? "text-[17px]" : "text-lg"}`}>{t(title)}</h3>
      </div>
      {children}
    </div>
  );
}

export const stripEmoji = (value: string) =>
  value.replace(/^[\p{Extended_Pictographic}\u200d\ufe0f\p{Emoji_Modifier}]+\s*/u, "").trim();

export function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const { t, language } = useI18n();
  const flowLabel = (level?: string | null): string => {
    switch (level) {
      case "spotting":
        return t("Spotting");
      case "light":
        return t("Light");
      case "medium":
        return t("Medium");
      case "heavy":
        return t("Heavy");
      case "very-heavy":
        return t("Very heavy");
      default:
        return "";
    }
  };

  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const dateLabel = fromKey(date).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines: string[] = [`BIXBO — ${dateLabel}`, ""];

    if (log.pain?.length) {
      const avg = log.pain.reduce((s, p) => s + p.score, 0) / log.pain.length;
      lines.push(`${t("Pain")} — ${t("avg")} ${avg.toFixed(1)}/10 · ${log.pain.length} ${log.pain.length === 1 ? t("entry") : t("entries")}`);
      for (const p of log.pain) {
        const bits = [`${p.time}`, `${p.score}/10 (${t(PAIN_DESCRIPTIONS[Math.round(p.score)])})`];
        if (p.parts.length) bits.push(p.parts.join(", "));
        if (p.quality.length) bits.push(`[${p.quality.map(t).join(", ")}]`);
        lines.push(`  • ${bits.join(" · ")}`);
        if (p.note) lines.push(`    "${p.note}"`);
      }
      lines.push("");
    }
    if (log.panic?.length) {
      lines.push(`${t("Panic episode")} — ${log.panic.length}`);
      for (const p of log.panic)
        lines.push(
          `  • ${p.time} · ${p.intensity}/10 · ${p.minutes == null ? t("ongoing") : `${p.minutes}min`}${p.trigger ? ` — ${p.trigger}` : ""}`,
        );
      lines.push("");
    }
    if (log.tetany?.length) {
      lines.push(`${t("Tetany episode")} — ${log.tetany.length}`);
      for (const tetanyEntry of log.tetany)
        lines.push(
          `  • ${tetanyEntry.time} · ${tetanyEntry.types.map(t).join(", ")} · ${tetanyEntry.intensity}/5 · ${tetanyEntry.minutes == null ? t("ongoing") : `${tetanyEntry.minutes}min`}`,
        );
      lines.push("");
    }
    if (log.periodInfo?.level || log.period) lines.push(`${t("Period")}: ${flowLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null)
      lines.push(`${t("Sleep")}: ${log.sleepHours}h ${asArr(log.sleepQuality).map(stripEmoji).join(", ")}`);
    if (log.temperature != null) lines.push(`${t("Temperature")}: ${log.temperature}°C`);
    if (log.weight != null) lines.push(`${t("Weight")}: ${log.weight}kg`);
    if (log.food?.length) lines.push(`${t("Food")}: ${log.food.length} ${t("entries")}`);
    if (log.workout?.length)
      lines.push(`${t("Workout")}: ${log.workout.map((w) => `${stripEmoji(w.kind)} ${w.minutes}min`).join(", ")}`);

    lines.push("", "— sent from BIXBO");
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: `${t("How I feel")} · ${dateLabel}`, text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      alert(t("Copied to clipboard"));
    } catch {
      alert(text);
    }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> {t("Share day")}
    </Button>
  );
}
