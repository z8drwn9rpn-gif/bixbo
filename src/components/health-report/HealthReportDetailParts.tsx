import { resolveScheduledDose } from "@/lib/domain/meds";
import { reportPeriodLevel, type ReportDaySummary } from "@/lib/healthReport";
import { formatClockTime, formatTemperature, formatVolume, formatWeight, type UnitPreferences } from "@/lib/preferences";
import type { BixboData } from "@/lib/storage";

export type HealthReportDetailRow = { date: string; category: string; detail: string };

const fromIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const shortDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short" });

function list(values: string[] | undefined): string | undefined {
  const clean = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : undefined;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function valueText(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    const items = value.map(valueText).filter((part): part is string => Boolean(part));
    return items.length ? items.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const items = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !["id", "dataUrl", "photo", "photos"].includes(key))
      .map(([key, nested]) => {
        const text = valueText(nested);
        return text ? `${humanize(key)}: ${text}` : undefined;
      })
      .filter((part): part is string => Boolean(part));
    return items.length ? items.join("; ") : undefined;
  }
  return String(value);
}

function parts(items: Array<[string, unknown]>): string {
  return items
    .map(([label, value]) => {
      const text = valueText(value);
      return text ? `${label}: ${text}` : undefined;
    })
    .filter((item): item is string => Boolean(item))
    .join("; ");
}

function splitLongDetail(item: HealthReportDetailRow): HealthReportDetailRow[] {
  if (item.detail.length <= 620) return [item];
  const words = item.detail.split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (current && `${current} ${word}`.length > 620) {
      chunks.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  });
  if (current) chunks.push(current);
  return chunks.map((detail, index) => ({ ...item, category: index ? `${item.category} (cont.)` : item.category, detail }));
}

function row(date: string, category: string, detail: string | undefined): HealthReportDetailRow[] {
  if (!detail) return [];
  return splitLongDetail({ date, category, detail });
}

function dayDetailRows(day: ReportDaySummary, data: BixboData, units: UnitPreferences, locale: string): HealthReportDetailRow[] {
  const rows: HealthReportDetailRow[] = [];
  const date = shortDate(day.key, locale);
  const log = day.log;

  (log.pain ?? []).forEach((entry) => {
    const followUp = entry.entryKind === "symptom-update";
    rows.push(...row(date, followUp ? "Pain symptom update" : "Pain", parts([
      ["Time", formatClockTime(entry.time, units)],
      ["Pain", followUp ? undefined : `${entry.score}/10`],
      ["Body areas", list(entry.parts)],
      ["Quality", list(entry.quality)],
      ["Other symptoms", list(entry.symptoms)],
      ["Pressure type", list(entry.pressureTypes)],
      ["Pressure", entry.pressureIntensity != null ? `${entry.pressureIntensity}/10` : undefined],
      ["Nausea", entry.nausea ? "Yes" : undefined],
      ["Nausea type", list(entry.nauseaTypes)],
      ["Nausea severity", entry.nauseaSeverity != null ? `${entry.nauseaSeverity}/10` : undefined],
      ["Nausea duration", entry.nauseaOngoing ? "Ongoing" : entry.nauseaMinutes != null ? `${entry.nauseaMinutes} min` : undefined],
      ["Nausea triggers", list(entry.nauseaTriggers)],
      ["Nausea symptoms", list(entry.nauseaSymptoms)],
      ["Nausea relieved by", list(entry.nauseaHelped)],
      ["Nausea note", entry.nauseaNote],
      ["Headache", entry.headache ? "Yes" : undefined],
      ["Headache type", list(entry.headacheTypes)],
      ["Headache intensity", entry.headacheIntensity != null ? `${entry.headacheIntensity}/10` : undefined],
      ["Headache medication", entry.headacheMed],
      ["Headache medication time", entry.headacheMed ? formatClockTime(entry.headacheMedTime, units) : undefined],
      ["Headache note", entry.headacheNote],
      ["Hot flashes", entry.hotFlashes != null ? `${entry.hotFlashes}/5` : undefined],
      ["Hot flashes note", entry.hotFlashesNote],
      ["PCOS symptoms", list(entry.pcosSymptoms)],
      ["Flu note", entry.fluNote],
      ["Body battery", entry.bodyBattery],
      ["Stress", entry.stress != null ? `${entry.stress}/10` : undefined],
      ["Mood", list(entry.mood)],
      ["Note", entry.note],
    ])));
  });

  (log.tetany ?? []).forEach((entry) => rows.push(...row(date, "Tetany", parts([
    ["Time", formatClockTime(entry.time, units)], ["Intensity", `${entry.intensity}/5`],
    ["Duration", entry.minutes == null ? "Ongoing" : `${entry.minutes} min`], ["Type", list(entry.types)],
    ["Location", list(entry.location)], ["Triggers", list(entry.triggers)],
    ["Time since Magnerot", entry.timeSinceMagnerotMin != null ? `${entry.timeSinceMagnerotMin} min` : undefined],
    ["Helped", list(entry.helped)], ["Rescue medication", entry.rescueMed], ["Note", entry.note],
  ]))));

  (log.panic ?? []).forEach((entry) => rows.push(...row(date, "Panic", parts([
    ["Time", formatClockTime(entry.time, units)], ["Intensity", `${entry.intensity}/10`],
    ["Duration", entry.minutes == null ? "Ongoing" : `${entry.minutes} min`], ["Physical", list(entry.physical)],
    ["Cognitive", list(entry.cognitive)], ["Trigger", entry.trigger], ["Place", entry.place],
    ["Hyperventilation", entry.hyperventilation], ["Tetany present", entry.tetanyPresent],
    ["Helped", list(entry.helped)], ["Rescue medication", entry.rescueMed], ["Note", entry.note],
  ]))));

  (log.heat ?? []).forEach((entry) => rows.push(...row(date, entry.kind === "tens" ? "TENS" : entry.kind === "heat" ? "Heat" : "Cold", parts([
    ["Start", formatClockTime(entry.start, units)], ["Duration", entry.ongoing ? "Ongoing" : `${entry.minutes} min`], ["Note", entry.note],
  ]))));

  const periodInfo = log.periodInfo;
  const periodLevel = reportPeriodLevel(day.key, log, data.cycle);
  if (periodLevel || periodInfo) rows.push(...row(date, "Period / cycle", parts([
    ["Flow", periodLevel], ["Cramps", periodInfo?.cramps != null ? `${periodInfo.cramps}/10` : undefined],
    ["Discharge", periodInfo?.discharge], ["Discharge note", periodInfo?.dischargeNote],
    ["Symptoms", list(periodInfo?.symptoms)], ["Clots", periodInfo?.clots], ["Note", periodInfo?.note],
  ])));

  (log.food ?? []).forEach((entry) => rows.push(...row(date, "Food", parts([
    ["Time", formatClockTime(entry.time, units)], ["Food / drink", entry.what], ["Feeling after", list(entry.feelings)],
    ["Additional note", entry.after], ["Water", entry.hydrationMl != null ? formatVolume(entry.hydrationMl, units) : undefined],
    ["Caffeine", entry.caffeineMg != null ? `${entry.caffeineMg} mg` : undefined], ["Alcohol drinks", entry.alcoholDrinks],
    ["Symptoms after", list(entry.symptomsAfter)], ["High histamine", entry.highHistamine],
    ["Histamine flare", entry.histamineFlare], ["Histamine symptoms", list(entry.histamineSymptoms)],
    ["Allergens", list(entry.allergensInMeal)], ["Allergic reaction", entry.allergicReaction], ["Reaction severity", entry.reactionSeverity],
  ]))));

  (log.bowel ?? [])
    .filter((entry) => !entry.urinaryOnly && Number(entry.bristol) !== -2)
    .forEach((entry) => {
      const bowelType = entry.bristol === -1 ? "No bowel movement" : entry.bristol === 0 ? "Type 0 — Mystery" : entry.bristol >= 1 && entry.bristol <= 7 ? `Bristol Type ${entry.bristol}` : `Recorded value ${entry.bristol}`;
      rows.push(...row(date, "Bowel", parts([
        ["Time", formatClockTime(entry.time, units)], ["Bowel", bowelType],
        ["Feeling", list(entry.feelings)], ["Symptoms", list(entry.symptoms)], ["Note", entry.note],
      ])));
    });

  (log.sex ?? []).forEach((entry) => rows.push(...row(date, "Sex", parts([
    ["Time", formatClockTime(entry.time, units)], ["Type", entry.kind], ["Orgasm", entry.orgasm],
    ["Protection", entry.protection], ["Contraception", entry.contraception], ["Painful", entry.painful],
    ["Symptoms after", list(entry.symptomsAfter)], ["Feeling after", Array.isArray(entry.feelingAfter) ? entry.feelingAfter.join(", ") : entry.feelingAfter],
    ["Note", entry.note],
  ]))));

  (log.temperatureEntries ?? []).forEach((entry) => rows.push(...row(date, "Temperature", parts([
    ["Time", formatClockTime(entry.time, units)], ["Value", formatTemperature(entry.value, units)], ["Method", entry.method], ["Note", entry.note],
  ]))));
  if (!(log.temperatureEntries?.length) && log.temperature != null) rows.push(...row(date, "Temperature", formatTemperature(log.temperature, units)));

  (log.weightEntries ?? []).forEach((entry) => rows.push(...row(date, "Weight", parts([
    ["Time", formatClockTime(entry.time, units)], ["Value", formatWeight(entry.value, units)],
    ["Body fat", entry.bodyFatPercent != null ? `${entry.bodyFatPercent}%` : undefined], ["Note", entry.note],
  ]))));
  if (!(log.weightEntries?.length) && log.weight != null) rows.push(...row(date, "Weight", formatWeight(log.weight, units)));

  if ([log.sleepHours, log.sleepQuality, log.sleepBedtime, log.sleepWakeTime, log.sleepAwakenings, log.sleepEnergy, log.sleepNote].some((value) => value != null && value !== "")) {
    rows.push(...row(date, "Sleep", parts([
      ["Hours", log.sleepHours], ["Quality", Array.isArray(log.sleepQuality) ? log.sleepQuality.join(", ") : log.sleepQuality],
      ["Bedtime", formatClockTime(log.sleepBedtime, units)], ["Wake time", formatClockTime(log.sleepWakeTime, units)],
      ["Awakenings", log.sleepAwakenings], ["Energy", log.sleepEnergy], ["Note", log.sleepNote],
    ])));
  }

  (log.extraMeds ?? []).forEach((entry) => rows.push(...row(date, "Extra medication / PRN", parts([
    ["Time", formatClockTime(entry.time, units)], ["Name", entry.name], ["Dose", entry.dose], ["Note", entry.note],
  ]))));

  (log.workout ?? []).forEach((entry) => rows.push(...row(date, "Workout", parts([
    ["Time", formatClockTime(entry.time, units)], ["Type", entry.kind], ["Duration", `${entry.minutes} min`],
    ["Distance", entry.distanceKm != null ? `${entry.distanceKm} km` : undefined], ["Elevation", entry.elevationM != null ? `${entry.elevationM} m` : undefined],
    ["RPE", entry.rpe != null ? `${entry.rpe}/10` : undefined], ["Magnesium before", entry.magnesiumBefore],
    ["Weight after", entry.weightKg != null ? formatWeight(entry.weightKg, units) : undefined],
    ["Exercises", entry.exercises?.map((exercise) => parts([["Exercise", exercise.name], ["Sets", exercise.sets], ["Reps", exercise.reps], ["Weight", exercise.weightKg != null ? formatWeight(exercise.weightKg, units) : undefined]])).join(" | ")],
    ["Triggered symptom", entry.triggeredSymptom ? `${entry.triggeredSymptom.type}${entry.triggeredSymptom.label ? ` — ${entry.triggeredSymptom.label}` : ""}` : undefined],
    ["Feeling", Array.isArray(entry.feeling) ? entry.feeling.join(", ") : entry.feeling], ["Note", entry.note],
  ]))));

  (log.mood ?? []).forEach((entry) => rows.push(...row(date, "Mood", parts([["Time", formatClockTime(entry.time, units)], ["Mood", entry.value]]))));
  (log.energy ?? []).forEach((entry) => rows.push(...row(date, "Energy", parts([["Time", formatClockTime(entry.time, units)], ["Energy", entry.value]]))));
  (log.histamine ?? []).forEach((entry) => rows.push(...row(date, "Histamine", parts([["Time", formatClockTime(entry.time, units)], ["Flare", entry.flare], ["Note", entry.note]]))));

  Object.entries(log.customLogs ?? {}).forEach(([featureId, entries]) => entries.forEach((entry) => rows.push(...row(date, `Custom log — ${humanize(featureId)}`, parts([
    ["Time", formatClockTime(entry.time, units)], ["Values", Object.entries(entry.values).map(([key, value]) => `${humanize(key)}: ${valueText(value) ?? "—"}`).join("; ")], ["Note", entry.note],
  ])))));

  Object.entries(log.adminFields ?? {}).forEach(([featureId, entries]) => entries.forEach((entry) => rows.push(...row(date, `Added fields — ${humanize(featureId)}`, parts([
    ["Time", formatClockTime(entry.time, units)], ["Values", Object.entries(entry.values).map(([key, value]) => `${humanize(key)}: ${valueText(value) ?? "—"}`).join("; ")], ["Note", entry.note],
  ])))));

  if (log.pregnancy) rows.push(...row(date, "Pregnancy daily log", valueText(log.pregnancy)));
  if (log.postpartum) rows.push(...row(date, "Postpartum daily log", valueText(log.postpartum)));
  day.notes.forEach((note) => rows.push(...row(date, "Day note", note)));

  data.meds.forEach((med) => {
    if (med.asNeeded) {
      const key = `${med.id}@asneeded`;
      if (data.medLog[day.key]?.[key]) rows.push(...row(date, "PRN medication", parts([
        ["Medication", med.name], ["Dose", med.dose], ["Taken", formatClockTime(data.medLogTimes?.[day.key]?.[key], units)],
        ["Note", data.medLogNotes?.[day.key]?.[key]],
      ])));
      return;
    }
    (med.times ?? []).forEach((scheduledTime) => {
      const state = resolveScheduledDose(med, day.key, scheduledTime, data.medLog, data.medLogItems ?? {}, new Date());
      if (!state.selectedItems.length) return;
      rows.push(...row(date, "Scheduled medication", parts([
        ["Medication", med.name], ["Dose", med.dose], ["Scheduled", formatClockTime(scheduledTime, units)],
        ["Taken", formatClockTime(data.medLogTimes?.[day.key]?.[state.key], units)], ["Items taken", state.selectedItems.join(", ")],
        ["Note", data.medLogNotes?.[day.key]?.[state.key]],
      ])));
    });
  });

  return rows;
}

export function buildHealthDetailPages(days: ReportDaySummary[], data: BixboData, units: UnitPreferences, locale: string): HealthReportDetailRow[][] {
  const allRows = days.flatMap((day) => dayDetailRows(day, data, units, locale));
  const pages: HealthReportDetailRow[][] = [];
  let current: HealthReportDetailRow[] = [];
  let budget = 0;
  allRows.forEach((item) => {
    const cost = Math.max(1, Math.ceil(item.detail.length / 115));
    if (current.length && (budget + cost > 24 || current.length >= 14)) {
      pages.push(current);
      current = [];
      budget = 0;
    }
    current.push(item);
    budget += cost;
  });
  if (current.length) pages.push(current);
  return pages;
}

export function HealthReportDetailTable({ rows }: { rows: HealthReportDetailRow[] }) {
  return <table className="detail"><thead><tr><th>Date</th><th>Category</th><th>Recorded values</th></tr></thead><tbody>{rows.map((item, index) => <tr key={`${item.date}-${item.category}-${index}`}><td>{item.date}</td><td>{item.category}</td><td>{item.detail}</td></tr>)}</tbody></table>;
}
