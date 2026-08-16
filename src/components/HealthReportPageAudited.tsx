import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type CSSProperties } from "react";

import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { resolveScheduledDose, summarizeMedicationAdherence } from "@/lib/domain/meds";
import {
  average,
  countRecordedPrnUses,
  hasMeaningfulReportDay,
  maxValue,
  minValue,
  mode,
  summarizeReportDay,
  type ReportDaySummary,
} from "@/lib/healthReport";
import {
  formatClockTime,
  formatTemperature,
  formatVolume,
  formatWeight,
  unitPrefs,
  type UnitPreferences,
} from "@/lib/preferences";
import { BRISTOL, EMPTY, useBixbo, type BixboData, type DayLog, type Med } from "@/lib/storage";

type Preset = "7" | "30" | "90" | "365" | "custom";
type DetailRow = { date: string; category: string; detail: string };
type HeatColumn = { key: string; label: string; days: ReportDaySummary[] };

type MedLog = Record<string, Record<string, boolean>>;
type MedLogItems = Record<string, Record<string, string[]>>;

const PAIN_COLORS = [
  "#72C64A", "#91CD3A", "#B7D12F", "#DFD11F", "#F3C30D", "#F5A20B",
  "#F47B16", "#F05A28", "#EF4444", "#DC2626", "#B91C1C",
] as const;

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (value: string, amount: number) => {
  const date = fromIso(value);
  date.setDate(date.getDate() + amount);
  return iso(date);
};
const dayCount = (start: string, end: string) => {
  let count = 0;
  for (let key = start; key <= end && count < 5000; key = addDays(key, 1)) count += 1;
  return Math.max(1, count);
};
const eachDate = (start: string, end: string) => Array.from({ length: dayCount(start, end) }, (_, index) => addDays(start, index));
const compactNumber = (value: number | undefined) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(1).replace(/\.0$/, "");
const longDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
const shortDate = (key: string, locale: string) => fromIso(key).toLocaleDateString(locale, { day: "numeric", month: "short" });

function list(values: string[] | undefined): string | undefined {
  const clean = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : undefined;
}

function valueText(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    const parts = value.map(valueText).filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !["id", "dataUrl", "photo", "photos"].includes(key))
      .map(([key, nested]) => {
        const text = valueText(nested);
        return text ? `${humanize(key)}: ${text}` : undefined;
      })
      .filter((part): part is string => Boolean(part));
    return parts.length ? parts.join("; ") : undefined;
  }
  return String(value);
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
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

function splitLongDetail(row: DetailRow): DetailRow[] {
  if (row.detail.length <= 620) return [row];
  const words = row.detail.split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (current && `${current} ${word}`.length > 620) {
      chunks.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  });
  if (current) chunks.push(current);
  return chunks.map((detail, index) => ({ ...row, category: index ? `${row.category} (cont.)` : row.category, detail }));
}

function row(date: string, category: string, detail: string | undefined): DetailRow[] {
  if (!detail) return [];
  return splitLongDetail({ date, category, detail });
}

function dayDetailRows(day: ReportDaySummary, data: BixboData, units: UnitPreferences, locale: string): DetailRow[] {
  const rows: DetailRow[] = [];
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
  const periodLevel = periodInfo?.level ?? log.period;
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

  (log.bowel ?? []).forEach((entry) => {
    const bowelType = entry.urinaryOnly ? "Urinary only" : entry.bristol === -1 ? "No bowel movement" : entry.bristol === 0 ? "Type 0 — Mystery" : entry.bristol >= 1 && entry.bristol <= 7 ? `Bristol Type ${entry.bristol}` : `Recorded value ${entry.bristol}`;
    rows.push(...row(date, "Bowel / urinary", parts([
      ["Time", formatClockTime(entry.time, units)], ["Bowel", bowelType], ["Urinary", list(entry.urinary)],
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

function hasMedicationActivity(date: string, data: BixboData): boolean {
  if (Object.values(data.medLog[date] ?? {}).some(Boolean)) return true;
  if (Object.values(data.medLogItems?.[date] ?? {}).some((items) => items.length > 0)) return true;
  if (Object.values(data.medLogNotes?.[date] ?? {}).some((note) => note.trim().length > 0)) return true;
  return false;
}

function clinicalRows(data: BixboData, units: UnitPreferences): DetailRow[] {
  const rows: DetailRow[] = [];
  const profile = data.profile;
  if (profile) {
    rows.push(...row("Profile", "Personal", parts([
      ["Name", profile.name], ["Nickname", profile.nickname], ["Birth date", profile.birthDate], ["Height", profile.heightCm != null ? `${profile.heightCm} cm` : undefined],
      ["Profile weight", profile.weightKg != null ? formatWeight(profile.weightKg, units) : undefined], ["Target weight", profile.targetWeightKg != null ? formatWeight(profile.targetWeightKg, units) : undefined],
      ["Gender", data.settings.gender ?? profile.gender], ["Pronouns", profile.pronouns], ["Blood type", profile.bloodType],
    ])));
    rows.push(...row("Profile", "Medical history", parts([
      ["Diagnoses", list(profile.diagnoses)], ["Chronic illnesses", list(profile.chronicIllnesses)], ["Allergies", list(profile.allergies)],
      ["Intolerances", list(profile.intolerances)], ["Surgeries", list(profile.surgeries)], ["Pregnancies", list(profile.pregnancies)], ["Disabilities", list(profile.disabilities)],
    ])));
    rows.push(...row("Profile", "Reproductive health", parts([
      ["Status", profile.pregnancyStatus], ["Trying to conceive", profile.tryingToConceive], ["Breastfeeding", profile.breastfeeding],
      ["Menopause", profile.menopause], ["Birth control", profile.birthControl], ["Fertility goals", profile.fertilityGoals],
    ])));
    rows.push(...row("Profile", "Lifestyle", parts([
      ["Smoking", profile.smoker], ["Alcohol", profile.alcohol], ["Caffeine", profile.caffeine], ["Exercise", profile.exercise],
      ["Sleep goal", profile.sleepGoalHours != null ? `${profile.sleepGoalHours} h` : undefined], ["Hydration goal", profile.hydrationGoalMl != null ? formatVolume(profile.hydrationGoalMl, units) : undefined],
    ])));
    const doctors = [["GP", profile.gp], ["Gynecologist", profile.gynecologist], ["Neurologist", profile.neurologist], ["Endocrinologist", profile.endocrinologist], ["Therapist", profile.therapist]] as const;
    doctors.forEach(([label, doctor]) => rows.push(...row("Profile", label, doctor ? parts([["Name", doctor.name], ["Clinic", doctor.clinic], ["Phone", doctor.phone], ["Email", doctor.email], ["Note", doctor.note]]) : undefined)));
    rows.push(...row("Profile", "Emergency contact", profile.emergencyContact ? parts([["Name", profile.emergencyContact.name], ["Relation", profile.emergencyContact.relation], ["Phone", profile.emergencyContact.phone]]) : undefined));
    rows.push(...row("Profile", "Medication profile", parts([["Pharmacy", profile.pharmacy], ["Medication notes", profile.medicationNotes]])));
  }

  (data.diagnoses ?? []).forEach((diagnosis) => rows.push(...row(diagnosis.date ?? "—", "Diagnosis", parts([
    ["Name", diagnosis.name], ["Doctor / workplace", diagnosis.doctor], ["Note", diagnosis.note], ["Linked document", diagnosis.docId ? "Yes" : undefined],
  ]))));
  (data.labs ?? []).forEach((lab) => rows.push(...row(lab.date, "Lab result", parts([
    ["Test", lab.test], ["Value", `${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`], ["Reference low", lab.refLow], ["Reference high", lab.refHigh], ["Note", lab.note],
  ]))));
  (data.docs ?? []).forEach((doc) => rows.push(...row(doc.date, "Document", parts([
    ["Name", doc.name], ["Type", doc.mime], ["Linked lab", doc.labId ? "Yes" : undefined], ["Attachment", doc.dataUrl ? "Included in BIXBO (binary content omitted from report text)" : undefined],
  ]))));
  if (data.pregnancy) rows.push(...row("Profile", "Pregnancy state", valueText(data.pregnancy)));
  if (data.postpartum) rows.push(...row("Profile", "Postpartum state", valueText(data.postpartum)));
  return rows;
}

function packRows(rows: DetailRow[]): DetailRow[][] {
  const pages: DetailRow[][] = [];
  let current: DetailRow[] = [];
  let budget = 0;
  rows.forEach((item) => {
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

function heatColumns(days: ReportDaySummary[], locale: string): HeatColumn[] {
  if (days.length <= 31) return days.map((day) => ({ key: day.key, label: fromIso(day.key).toLocaleDateString(locale, { day: "numeric" }), days: [day] }));
  const grouped = new Map<string, ReportDaySummary[]>();
  days.forEach((day) => {
    const month = day.key.slice(0, 7);
    grouped.set(month, [...(grouped.get(month) ?? []), day]);
  });
  return [...grouped.entries()].map(([key, values]) => ({ key, label: fromIso(`${key}-01`).toLocaleDateString(locale, { month: "short" }), days: values }));
}

function heatLevel(value: number | undefined, max: number): number {
  if (value == null || value <= 0) return 0;
  return Math.max(1, Math.min(4, Math.ceil((value / max) * 4)));
}

function Heatmap({ days, locale }: { days: ReportDaySummary[]; locale: string }) {
  const columns = heatColumns(days, locale);
  const rows = [
    { label: "Period", max: 1, value: (group: ReportDaySummary[]) => group.some((day) => day.log.period || day.log.periodInfo?.level) ? 1 : undefined, period: true },
    { label: "Pain", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.pain)) },
    { label: "Headache", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.headache)) },
    { label: "Hot flashes", max: 5, value: (group: ReportDaySummary[]) => average(group.map((day) => day.hotFlashes)) },
    { label: "Tetany", max: 5, value: (group: ReportDaySummary[]) => average(group.map((day) => day.tetany)) },
    { label: "Panic", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.panic)) },
    { label: "Nausea", max: 10, value: (group: ReportDaySummary[]) => average(group.map((day) => day.nausea)) },
  ];
  return <div className="heat" style={{ "--cells": columns.length } as CSSProperties}>
    <div className="heatRow heatHead"><span />{columns.map((column) => <b key={column.key}>{column.label}</b>)}</div>
    {rows.map((item) => <div className="heatRow" key={item.label}><span>{item.label}</span>{columns.map((column) => {
      const value = item.value(column.days);
      return <i key={column.key} className={item.period && value ? "periodCell" : ""} data-l={item.period ? undefined : heatLevel(value, item.max)} title={value == null ? "No data" : `${compactNumber(value)}/${item.max}`} />;
    })}</div>)}
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Sheet({ number, title, subtitle, children }: { number: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="pdf-sheet">
    <header className="hrHeader"><div><b>BIXBO</b><h1>{title}</h1>{subtitle ? <h3>{subtitle}</h3> : null}</div><span>Health report</span></header>
    {children}
    <footer><span>BIXBO · User-recorded health data</span><span>Page {number}</span></footer>
  </section>;
}

function DetailTable({ rows }: { rows: DetailRow[] }) {
  return <table className="detail"><thead><tr><th>Date</th><th>Category</th><th>Recorded values</th></tr></thead><tbody>{rows.map((item, index) => <tr key={`${item.date}-${item.category}-${index}`}><td>{item.date}</td><td>{item.category}</td><td>{item.detail}</td></tr>)}</tbody></table>;
}

function ReportDocument({ days, data, range, locale, units }: { days: ReportDaySummary[]; data: BixboData; range: string; locale: string; units: UnitPreferences }) {
  const loggedDays = days.filter((day) => hasMeaningfulReportDay(day) || hasMedicationActivity(day.key, data));
  const painValues = days.map((day) => day.pain);
  const headacheEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.headacheIntensity).filter((value): value is number => value != null && Number.isFinite(value)));
  const hotFlashEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.hotFlashes).filter((value): value is number => value != null && Number.isFinite(value)));
  const nauseaEpisodes = days.flatMap((day) => (day.log.pain ?? []).map((entry) => entry.nauseaSeverity).filter((value): value is number => value != null && Number.isFinite(value)));
  const tetanyEpisodes = days.flatMap((day) => (day.log.tetany ?? []).map((entry) => entry.intensity).filter(Number.isFinite));
  const panicEpisodes = days.flatMap((day) => (day.log.panic ?? []).map((entry) => entry.intensity).filter(Number.isFinite));
  const sleepValues = days.map((day) => day.sleep).filter((value): value is number => value != null);
  const bowelTypes = days.flatMap((day) => day.bowelTypes);
  const bowelLogs = days.reduce((total, day) => total + day.bowelLogCount, 0);
  const noMovement = days.reduce((total, day) => total + day.noBowelMovementCount, 0);
  const urinaryOnly = days.reduce((total, day) => total + day.urinaryOnlyCount, 0);
  const commonBowel = mode(bowelTypes);
  const commonBowelLabel = commonBowel == null ? "—" : commonBowel === 0 ? "Type 0" : `Type ${commonBowel}`;

  const weightPoints = days.flatMap((day) => {
    const entries = day.log.weightEntries ?? [];
    if (entries.length) return entries.map((entry) => ({ key: day.key, time: entry.time, value: entry.value }));
    return day.log.weight != null ? [{ key: day.key, time: "", value: day.log.weight }] : [];
  }).filter((point) => Number.isFinite(point.value));
  const latestWeight = weightPoints.at(-1)?.value;

  const detailRows = days.flatMap((day) => dayDetailRows(day, data, units, locale));
  const detailPages = packRows(detailRows);
  const profilePages = packRows(clinicalRows(data, units));
  const totalDetailPages = detailPages.length + profilePages.length;

  const scheduled = data.meds.filter((med) => !med.asNeeded);
  const asNeeded = data.meds.filter((med) => med.asNeeded);
  const medLogItems = data.medLogItems ?? {};
  const dateKeys = days.map((day) => day.key);
  const extraCounts = new Map<string, { label: string; count: number }>();
  days.forEach((day) => (day.log.extraMeds ?? []).forEach((entry) => {
    const key = entry.name.trim().toLocaleLowerCase();
    const previous = extraCounts.get(key);
    extraCounts.set(key, { label: previous?.label ?? entry.name, count: (previous?.count ?? 0) + 1 });
  }));
  const knownPrnNames = new Set(asNeeded.map((med) => med.name.trim().toLocaleLowerCase()));

  return <div className="hrDoc">
    <Sheet number={1} title="Health Report" subtitle={range}>
      <div className="meta"><span>{loggedDays.length}/{days.length} days with recorded data</span><span>Generated {new Date().toLocaleDateString(locale)}</span></div>
      <h2>At a glance <small>audited calculations</small></h2>
      <div className="metrics ten">
        <Metric label="Pain" value={`${compactNumber(average(painValues))}/10`} note={`daily avg · range ${compactNumber(minValue(painValues))}–${compactNumber(maxValue(painValues))}`} />
        <Metric label="Headache" value={`${compactNumber(average(headacheEpisodes))}/10`} note={`${headacheEpisodes.length} recorded intensities · max ${compactNumber(maxValue(headacheEpisodes))}`} />
        <Metric label="Hot flashes" value={`${compactNumber(average(hotFlashEpisodes))}/5`} note={`${hotFlashEpisodes.length} recorded intensities · max ${compactNumber(maxValue(hotFlashEpisodes))}`} />
        <Metric label="Nausea" value={`${compactNumber(average(nauseaEpisodes))}/10`} note={`${nauseaEpisodes.length} recorded intensities · max ${compactNumber(maxValue(nauseaEpisodes))}`} />
        <Metric label="Tetany" value={`${compactNumber(average(tetanyEpisodes))}/5`} note={`${tetanyEpisodes.length} episodes · max ${compactNumber(maxValue(tetanyEpisodes))}`} />
        <Metric label="Panic" value={`${compactNumber(average(panicEpisodes))}/10`} note={`${panicEpisodes.length} episodes · max ${compactNumber(maxValue(panicEpisodes))}`} />
        <Metric label="Sleep" value={sleepValues.length ? `${compactNumber(average(sleepValues))} h` : "—"} note={`${sleepValues.length} days with hours recorded`} />
        <Metric label="Bowel" value={commonBowelLabel} note={`${bowelLogs} logs · ${noMovement} no movement · ${urinaryOnly} urinary-only`} />
        <Metric label="Latest weight" value={latestWeight != null ? formatWeight(latestWeight, units) : "—"} note={`${weightPoints.length} measurements in range`} />
        <Metric label="Coverage" value={`${Math.round((loggedDays.length / Math.max(1, days.length)) * 100)}%`} note={`${loggedDays.length} of ${days.length} days`} />
      </div>
      <h2>Symptom intensity overview</h2>
      <Heatmap days={days} locale={locale} />
      <p className="subnote">Pain averages exclude symptom-only follow-ups. Panic and nausea use their current 1–10 scales; tetany and hot flashes use 1–5. Empty cells mean no recorded intensity, not zero.</p>
    </Sheet>

    <Sheet number={2} title="Trends" subtitle={range}>
      <h2>Pain by day <small>daily average of real pain measurements</small></h2>
      <div className="painBars">{days.map((day) => {
        const value = day.pain;
        const width = value == null ? 0 : Math.max(0, Math.min(100, value * 10));
        const color = value == null ? "#eef0e7" : PAIN_COLORS[Math.max(0, Math.min(10, Math.round(value)))];
        return <div key={day.key}><span>{shortDate(day.key, locale)}</span><i><b style={{ width: `${width}%`, background: color }} /></i><strong>{value == null ? "—" : compactNumber(value)}</strong></div>;
      })}</div>
      <h2>Bowel distribution <small>Type 0 is valid; no-movement and urinary-only are separate</small></h2>
      <div className="bowelBars">{Array.from({ length: 8 }, (_, type) => {
        const count = bowelTypes.filter((value) => value === type).length;
        const label = type === 0 ? "Type 0 — Mystery" : BRISTOL.find((item) => item.n === type)?.label ?? `Type ${type}`;
        const maxCount = Math.max(1, ...Array.from({ length: 8 }, (__, current) => bowelTypes.filter((value) => value === current).length));
        return <div key={type}><span>{label}</span><i><b style={{ width: `${(count / maxCount) * 100}%` }} /></i><strong>{count}</strong></div>;
      })}</div>
      <div className="miniMetrics"><Metric label="No bowel movement" value={String(noMovement)} note="Recorded explicitly as no movement" /><Metric label="Urinary-only" value={String(urinaryOnly)} note="Excluded from Bristol distribution" /></div>
    </Sheet>

    <Sheet number={3} title="Medication" subtitle={range}>
      <h2>Scheduled medication adherence <small>granular grouped-dose logic</small></h2>
      {scheduled.length ? <table className="adherenceTable"><thead><tr><th>Medication</th><th>Schedule</th><th>Taken / expected</th><th>Adherence</th></tr></thead><tbody>{scheduled.map((med) => {
        const summary = summarizeMedicationAdherence(med, dateKeys, data.medLog, medLogItems, new Date());
        return <tr key={med.id}><td><b>{med.name}</b>{med.dose ? <small>{med.dose}</small> : null}</td><td>{(med.times ?? []).map((time) => formatClockTime(time, units)).join(", ") || "—"}</td><td>{summary ? `${summary.taken} / ${summary.expected}` : "—"}</td><td>{summary ? `${summary.pct}%` : "—"}<div className="adhBar"><i><span style={{ width: `${summary?.pct ?? 0}%` }} /></i></div></td></tr>;
      })}</tbody></table> : <p className="emptyLine">No scheduled medication configured.</p>}
      <p className="adherenceNote">For grouped medication slots, each selected item is counted separately. Future/not-yet-due doses are not treated as missed.</p>
      <h2>Extra / PRN uses</h2>
      <table className="prnTable"><thead><tr><th>Medication</th><th>Recorded uses</th><th>Source</th></tr></thead><tbody>
        {asNeeded.map((med) => <tr key={med.id}><td>{med.name}{med.dose ? ` · ${med.dose}` : ""}</td><td>{countRecordedPrnUses(med, dateKeys, data.dayLogs, data.medLog)}</td><td>PRN checkbox + matching extra-dose logs</td></tr>)}
        {[...extraCounts.entries()].filter(([key]) => !knownPrnNames.has(key)).map(([key, item]) => <tr key={key}><td>{item.label}</td><td>{item.count}</td><td>Extra-dose logs</td></tr>)}
        {!asNeeded.length && !extraCounts.size ? <tr><td colSpan={3}>No PRN / extra medication use recorded in this period.</td></tr> : null}
      </tbody></table>
    </Sheet>

    {profilePages.map((pageRows, pageIndex) => <Sheet key={`profile-${pageIndex}`} number={4 + pageIndex} title="Clinical profile" subtitle={profilePages.length > 1 ? `Part ${pageIndex + 1} of ${profilePages.length}` : undefined}><DetailTable rows={pageRows} /></Sheet>)}

    {detailPages.length ? detailPages.map((pageRows, pageIndex) => <Sheet key={`details-${pageIndex}`} number={4 + profilePages.length + pageIndex} title="Recorded health details" subtitle={`${range} · Part ${pageIndex + 1} of ${detailPages.length}`}><DetailTable rows={pageRows} /></Sheet>) : <Sheet number={4 + profilePages.length} title="Recorded health details" subtitle={range}><div className="empty">No health values were recorded in this period.</div></Sheet>}

    <div className="sr-only">{totalDetailPages} detail pages</div>
  </div>;
}

export function HealthReportPageAudited() {
  const { t, language } = useI18n();
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const locale = language === "sk" ? "sk-SK" : "en-GB";
  const units = unitPrefs(view);
  const today = iso(new Date());
  const [preset, setPreset] = useState<Preset>("30");
  const [customStart, setCustomStart] = useState(addDays(today, -29));
  const [customEnd, setCustomEnd] = useState(today);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [start, end] = useMemo(() => preset === "custom"
    ? [customStart <= customEnd ? customStart : customEnd, customStart <= customEnd ? customEnd : customStart]
    : [addDays(today, -(Number(preset) - 1)), today], [preset, customStart, customEnd, today]);
  const days = useMemo(() => eachDate(start, end).map((key) => summarizeReportDay(key, view.dayLogs[key] ?? {}, view.dayNotes?.[key])), [start, end, view.dayLogs, view.dayNotes]);
  const range = `${longDate(start, locale)} – ${longDate(end, locale)} · ${days.length}-day report`;
  const report = <ReportDocument days={days} data={view} range={range} locale={locale} units={units} />;

  const savePdf = async () => {
    if (busy || !previewRef.current) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const sheets = [...previewRef.current.querySelectorAll<HTMLElement>(".pdf-sheet")];
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      for (let index = 0; index < sheets.length; index += 1) {
        if (index) pdf.addPage("a4", "landscape");
        const canvas = await html2canvas(sheets[index], { scale: 2, backgroundColor: "#fff", useCORS: true, logging: false });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, "FAST");
      }
      pdf.save(`BIXBO-Health-Report-${start}-${end}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return <AppShell title={<Link to="/profile" className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" />{t("PDF reports")}</Link>}>
    <style>{CSS}</style>
    <div className="reportRoot px-4 pb-28 pt-3">
      <div className="controls"><section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80"><p className="font-serif text-xl font-bold">Health Report</p><p className="mt-1 text-xs text-muted-foreground">Doctor-friendly summary using the current BIXBO data model and audited calculations.</p>
        <div className="presets">{(["7", "30", "90", "365", "custom"] as Preset[]).map((option) => <button type="button" key={option} data-active={preset === option} onClick={() => setPreset(option)}>{option === "365" ? "1 year" : option === "custom" ? "Custom" : `${option} days`}</button>)}</div>
        {preset === "custom" ? <div className="custom"><label><b>From</b><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value || customStart)} /></label><label><b>To</b><input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value || customEnd)} /></label></div> : null}
        <button type="button" className="previewBtn" onClick={() => setPreview(true)}>Preview / Save PDF</button>
      </section></div>
      <div className="screenPreview">{report}</div>
    </div>
    {preview ? <div ref={previewRef} className="modal"><div className="toolbar"><button type="button" onClick={() => setPreview(false)}>← Back</button><span>{range}</span><button type="button" disabled={busy} onClick={savePdf}>{busy ? "Creating PDF…" : "Save PDF"}</button></div>{report}</div> : null}
  </AppShell>;
}

const CSS = String.raw`
.reportRoot{--olive:#7f8950;--ink:#20261d;--muted:#707668;--line:#dde1cf;--pale:#f7f8f2;--pink:#f29aa5}.controls{max-width:1120px;margin:0 auto 16px}.presets{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:14px}.presets button{height:42px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--surface));font-size:12px;font-weight:700}.presets button[data-active=true]{background:#f0f3e6;border-color:#90995f;color:#596238}.custom{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.custom label{display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 12px;border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--surface));font-size:12px}.custom input{margin-left:auto;min-height:38px;max-width:170px;background:transparent}.previewBtn{margin-top:14px;width:100%;height:44px;border-radius:16px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-weight:700}.screenPreview{max-width:1120px;margin:auto;overflow:auto}.hrDoc{display:grid;gap:18px}.pdf-sheet{position:relative;box-sizing:border-box;width:1120px;height:792px;margin:auto;background:#fff;color:var(--ink);padding:28px 40px 42px;font-family:Inter,Arial,sans-serif;box-shadow:0 10px 34px #0001;overflow:hidden}.hrHeader{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8px}.hrHeader b{font-size:11px;letter-spacing:.36em}.hrHeader h1{font-family:"Instrument Serif",Georgia,serif;font-size:38px;line-height:1;margin:7px 0 0}.hrHeader h3{font-family:"Instrument Serif",Georgia,serif;font-size:14px;margin:3px 0}.hrHeader>span{font-size:8px}.pdf-sheet h2{font-family:"Instrument Serif",Georgia,serif;font-size:19px;margin:10px 0 6px}.pdf-sheet h2 small{font:500 8px Inter;color:var(--olive)}.meta{display:flex;justify-content:flex-end;gap:22px;font-size:8px}.metrics{display:grid;gap:7px}.metrics.ten{grid-template-columns:repeat(5,1fr)}.metric{border:1px solid var(--line);border-radius:9px;padding:8px 10px;min-height:62px}.metric span{font-size:6.5px;font-weight:700;text-transform:uppercase}.metric strong{display:block;font-family:"Instrument Serif",Georgia,serif;font-size:20px;margin-top:5px}.metric small{display:block;font-size:6.2px;color:var(--muted);margin-top:3px}.miniMetrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.heat{border:1px solid var(--line)}.heatRow{display:grid;grid-template-columns:90px repeat(var(--cells),1fr)}.heatRow span{font-size:6.5px;padding:3px;border-top:1px solid #eef0e7}.heatHead b{font-size:5.8px;text-align:center;padding:2px;color:var(--muted)}.heatRow i{min-height:16px;border-left:1px solid #eef0e7;border-top:1px solid #eef0e7;background:#fff}.heatRow i[data-l="1"]{background:#e5e8d5}.heatRow i[data-l="2"]{background:#c8cda5}.heatRow i[data-l="3"]{background:#a5ad73}.heatRow i[data-l="4"]{background:#5f6b32}.periodCell{background:var(--pink)!important}.subnote,.adherenceNote{font-size:7.2px;color:var(--muted);margin:7px 0}.painBars,.bowelBars{display:grid;gap:4px}.painBars{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:22px;max-height:360px;overflow:hidden}.painBars>div,.bowelBars>div{display:grid;grid-template-columns:74px 1fr 28px;gap:6px;align-items:center;font-size:7px}.painBars i,.bowelBars i{display:block;height:7px;background:#f0f2e9;border-radius:99px;overflow:hidden}.painBars i b,.bowelBars i b{display:block;height:100%}.bowelBars i b{background:#8f9859}.painBars strong,.bowelBars strong{text-align:right}.adherenceTable,.prnTable,.detail{width:100%;border-collapse:collapse;table-layout:fixed}.adherenceTable,.prnTable{font-size:8.5px}.adherenceTable th,.prnTable th,.detail th{background:#f1f3e9;border:1px solid var(--line);text-align:left}.adherenceTable th,.prnTable th{padding:8px}.adherenceTable td,.prnTable td{padding:9px 8px;border:1px solid var(--line);vertical-align:middle}.adherenceTable td small{display:block;color:var(--muted)}.adhBar i{display:block;height:7px;background:#f0f2e9;margin-top:4px}.adhBar span{display:block;height:100%;background:#6f783d}.prnTable{margin-top:2px}.detail{font-size:7.5px}.detail th{padding:6px}.detail td{padding:6px;border:1px solid var(--line);vertical-align:top;line-height:1.28;overflow-wrap:anywhere}.detail tbody tr:nth-child(even){background:#fafbf6}.detail th:nth-child(1){width:12%}.detail th:nth-child(2){width:20%}.detail th:nth-child(3){width:68%}.empty{height:500px;display:grid;place-items:center;color:var(--muted)}.emptyLine{font-size:9px;color:var(--muted);padding:12px 0}footer{position:absolute;left:40px;right:40px;bottom:18px;border-top:1px solid var(--line);padding-top:6px;display:flex;justify-content:space-between;font-size:6px;color:#8b9084}.modal{position:fixed;inset:0;z-index:10050;overflow:auto;background:#eceee8;padding:72px 14px 28px}.toolbar{position:fixed;z-index:10060;top:max(env(safe-area-inset-top),10px);left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 24px));display:flex;align-items:center;gap:8px;padding:8px;border-radius:16px;background:#fffffff5;box-shadow:0 8px 30px #0002}.toolbar span{flex:1;text-align:center;font-size:9px}.toolbar button{height:38px;border-radius:11px;padding:0 13px;background:#eef1e5;font-size:10px;font-weight:700}.toolbar button:last-child{background:#7f8950;color:#fff}@media(max-width:700px){.presets{grid-template-columns:repeat(3,1fr)}.custom{grid-template-columns:1fr}}@media print{.controls,.toolbar{display:none!important}.screenPreview{display:none!important}.modal{position:static!important;padding:0;background:#fff}.pdf-sheet{box-shadow:none;break-after:page;width:297mm;height:210mm}@page{size:A4 landscape;margin:0}}
`;
