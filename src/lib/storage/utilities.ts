import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_ACCOUNT_PRIVACY_PREFS,
  DEFAULT_BACKUP_PREFS,
  DEFAULT_TRACKING_PREFS,
  DEFAULT_UNIT_PREFS,
  settingsFromLegacyHealthPreferences,
  type AccountPrivacyPreferences,
  type BackupPreferences,
  type TrackingPreferences,
  type UnitPreferences,
} from "../preferences";
import type { PeriodLevel } from "../domain/cycle";
import type { BixboData, CustomLists, CyclePrefs, DayLog, SexKind, VitalMeasurement } from "./types";
import { latestVitalValue } from "./migrations";
import type { VitalField } from "./migrations";

export function hasAnyLog(l?: DayLog): boolean {
  if (!l) return false;
  return !!(
    l.pain?.length ||
    l.tetany?.length ||
    l.panic?.length ||
    l.heat?.length ||
    l.period ||
    l.periodInfo?.level ||
    l.food?.length ||
    l.bowel?.length ||
    l.sex?.length ||
    l.temperatureEntries?.length ||
    l.weightEntries?.length ||
    l.temperature != null ||
    l.weight != null ||
    l.sleepHours != null ||
    l.extraMeds?.length ||
    l.workout?.length ||
    l.mood?.length ||
    l.energy?.length ||
    l.histamine?.length ||
    l.pregnancy != null ||
    l.postpartum != null
  );
}

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function isDateInRange(k: string, start: string, end: string): boolean {
  return k >= start && k <= end;
}

export function predictPeriods(cycle: CyclePrefs, from: Date, to: Date): { start: string; end: string }[] {
  if (!cycle.lastPeriodStart) return [];
  const out: { start: string; end: string }[] = [];
  const fromK = toKey(from),
    toK = toKey(to);
  let curStart = cycle.lastPeriodStart;
  while (curStart <= toK) {
    const end = addDays(curStart, Math.max(0, cycle.periodLength - 1));
    if (end >= fromK) out.push({ start: curStart, end });
    curStart = addDays(curStart, cycle.cycleLength);
    if (out.length > 24) break;
  }
  if (cycle.lastPeriodStart && cycle.lastPeriodEnd) {
    const s = cycle.lastPeriodStart,
      e = cycle.lastPeriodEnd;
    if (s <= toK && e >= fromK && !out.some((o) => o.start === s)) out.unshift({ start: s, end: e });
  }
  return out;
}

export function nextPredictedPeriod(cycle: CyclePrefs): { start: string; end: string } | null {
  if (!cycle.lastPeriodStart) return null;
  const todayK = todayKey();
  let s = cycle.lastPeriodStart;
  while (s <= todayK) s = addDays(s, cycle.cycleLength);
  return { start: s, end: addDays(s, Math.max(0, cycle.periodLength - 1)) };
}

export const PAIN_DESCRIPTIONS: Record<number, string> = {
  0: "Pain free",
  1: "Very minor annoyance",
  2: "Minor annoyance",
  3: "Annoying, distracting",
  4: "Bearable if involved in work",
  5: "Can't be ignored > 30 min",
  6: "Can't be ignored for long",
  7: "Hard to concentrate",
  8: "Physical activity limited",
  9: "Unable to speak, crying out",
  10: "Unconscious — passes out",
};

export function vitalEntriesFor(log: DayLog | undefined, field: VitalField): VitalMeasurement[] {
  return (log?.[field] ?? [])
    .filter((entry) => Number.isFinite(entry.value))
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
}

export function latestDayWeight(log?: DayLog): number | undefined {
  return latestVitalValue(vitalEntriesFor(log, "weightEntries")) ?? log?.weight;
}

export function latestDayTemperature(log?: DayLog): number | undefined {
  return latestVitalValue(vitalEntriesFor(log, "temperatureEntries")) ?? log?.temperature;
}

export function averageDayTemperature(log?: DayLog): number | undefined {
  const entries = vitalEntriesFor(log, "temperatureEntries");
  if (!entries.length) return log?.temperature;
  return entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
}

export const BODY_PARTS_DEFAULT = [
  "Abdomen",
  "Lower abdomen",
  "Lower belly",
  "Pelvis",
  "Ovaries",
  "Uterus",
  "Vagina",
  "Groin",
  "Back",
  "Head",
  "Legs",
  "Chest",
];

export const PAIN_QUALITY_DEFAULT = [
  "Cramping",
  "Stabbing",
  "Burning",
  "Dull",
  "Sharp",
  "Throbbing",
  "Pressure",
  "Shooting",
  "Aching",
];

export const OTHER_SYMPTOMS_DEFAULT = [
  "Dizziness",
  "Fatigue",
  "Bloating",
  "Diarrhea",
  "Constipation",
  "Cold sweats",
  "Fainting",
  "Mood swings",
  "Flu",
];

export const FOOD_FEELINGS_DEFAULT = [
  "😊 Great",
  "🙂 Fine",
  "😐 Neutral",
  "😕 Off",
  "😖 Bloated",
  "🤢 Nauseous",
  "🤕 Stomach pain",
  "😴 Sleepy",
  "🥵 Flushed",
  "⚡ Energy up",
];

export const WORKOUT_KINDS_DEFAULT = [
  "Yoga",
  "Walk",
  "Run",
  "Hike",
  "Cycling",
  "Strength",
  "Stretching",
  "Swim",
  "Meditation",
];

export function workoutHasDistance(kind: string) {
  return /walk|run|hike/i.test(kind);
}

export function workoutIsHike(kind: string) {
  return /hike/i.test(kind);
}

export function workoutIsStrength(kind: string) {
  return /strength/i.test(kind);
}

export const MOODS_DEFAULT = [
  "🌀 All over the place",
  "😠 Angry",
  "😤 Annoyed",
  "😰 Anxious",
  "😑 Apathetic",
  "🥱 Bored",
  "🏃 Busy",
  "😌 Calm",
  "🥺 Clingy",
  "😾 Cranky",
  "😔 Depressed",
  "🤩 Excited",
  "😪 Fatigued",
  "🙏 Grateful",
  "😊 Happy",
  "🥰 In love",
  "🤕 In pain",
  "😐 Indifferent",
  "😒 Irritated",
  "😎 Just chillin",
  "🥲 Lonely",
  "😕 Meh",
  "🌩️ PMDD",
  "💪 Productive",
  "😴 Restful",
  "😢 Sad",
  "🫥 Self-deprecating",
  "😴 Sleepy",
  "😖 Stressed",
  "🥱 Tired",
];

export const TETANY_TYPES = [
  "Carpopedal spasm",
  "Calf cramps",
  "Twitches around mouth/face",
  "Tingling / numbness",
  "Fasciculations",
  "Eyelid twitching",
  "Jaw clenching",
  "Chvostek sign",
  "Trousseau sign",
  "Whole body tremor",
];

export const TETANY_TYPE_DESC: Record<string, string> = {
  "Carpopedal spasm": "Cramp of hands/feet — fingers pulled into an “obstetrician's hand” or feet arched like a bow.",
  "Calf cramps": "Painful cramps in the calves, often at night or after exertion.",
  "Twitches around mouth/face": "Small twitches around the mouth or face.",
  "Tingling / numbness": "Pins and needles or numbness (lips, fingers, limbs).",
  Fasciculations: "Fine muscle rippling under the skin without limb movement.",
  "Eyelid twitching": "Eyelid twitch — often with fatigue or low magnesium.",
  "Jaw clenching": "Jaw clenching, teeth grinding.",
  "Chvostek sign": "Facial twitch when tapping the facial nerve (in front of the ear).",
  "Trousseau sign": "Hand cramp after inflating a BP cuff above systolic pressure.",
  "Whole body tremor": "Whole-body tremor or shaking from within.",
};

export const TETANY_LOCATIONS_DEFAULT = ["Lips", "Fingers", "Toes", "Hands", "Calves", "Face", "Around mouth"];

export const TETANY_TRIGGERS = ["Hyperventilation / stress", "Exercise", "Cold", "Cycle phase", "Other"];

export const TETANY_HELPED_DEFAULT = ["Slow breathing", "Breathe into bag/hands", "Warmth", "Extra magnesium", "Rest"];

export const PANIC_PHYSICAL = [
  "Racing heart",
  "Shortness of breath",
  "Chest pressure",
  "Dizziness",
  "Tingling / numbness",
  "Trembling",
  "Nausea",
  "Hot flashes / chills",
];

export const PANIC_COGNITIVE = ["Loss of control", "Derealization", "Fear of dying", "Fear of collapse"];

export const PANIC_HELPED_DEFAULT = ["Slow exhale", "Frontin", "Grounding", "Someone with me", "Fresh air"];

export const HEADACHE_TYPES = [
  "Tension",
  "Migraine",
  "Cluster",
  "Sinus",
  "Cervicogenic",
  "Hormonal",
  "Dehydration",
  "Hangover",
  "Eye strain",
  "Caffeine withdrawal",
  "Ice-pick",
  "Thunderclap",
];

export const HEADACHE_TYPE_DESC: Record<string, string> = {
  Tension:
    "Tension headache — dull, pressing pain on both sides, like a band around the head. Often from stress, fatigue, or poor posture.",
  Migraine:
    "Migraine — throbbing pain (often one-sided), sensitivity to light/sound, nausea. May include aura (flashes, tingling).",
  Cluster: "Cluster — extremely severe pain behind/around one eye, in bouts; watery eye, blocked nose on that side.",
  Sinus:
    "Sinus — pressure in the face/behind the eyes/forehead, worse when bending forward; typically with a cold or sinusitis.",
  Cervicogenic:
    "Cervicogenic — originates in the neck; pain rises from the nape up into the head, worse with neck movement.",
  Hormonal: "Hormonal — linked to the cycle (before/during period), ovulation, or contraception.",
  Dehydration: "Dehydration — dull, whole-head pain from low fluid intake, worse with movement.",
  Hangover: "Hangover — throbbing pain with nausea after drinking alcohol.",
  "Eye strain": "Eye strain — after long screen time; pressure behind the eyes, blurred vision.",
  "Caffeine withdrawal": "Caffeine withdrawal — dull pain with fatigue after skipping coffee.",
  "Ice-pick": "“Ice-pick” — brief, sharp stabbing jabs of pain lasting seconds.",
  Thunderclap:
    "“Thunderclap” — sudden, extremely severe pain peaking within 1 minute. WARNING: seek medical help, can be serious.",
};

export const SEX_TYPES_DEFAULT: { value: SexKind; label: string }[] = [
  { value: "sex", label: "Sex" },
  { value: "fingering", label: "Fingering" },
  { value: "suck_dick", label: "Suck dick" },
  { value: "oral", label: "Oral (receiving)" },
];

export function isIntercourseKind(kind: unknown): boolean {
  const raw = String(kind ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^other:/, "");
  return ["sex", "sex_with_condom", "sex_without_condom", "with_condom", "without_condom"].includes(raw);
}

export const DISCHARGE_OPTS: { value: string; label: string; color: string }[] = [
  { value: "clear", label: "Clear / egg-white", color: "#dbeafe" },
  { value: "white", label: "White / creamy", color: "#f5f5f4" },
  { value: "yellow", label: "Yellow", color: "#fde68a" },
  { value: "brown", label: "Brown / spotting", color: "#a16207" },
  { value: "other", label: "Other", color: "#c084fc" },
];

export const BRISTOL: { n: number; label: string; sub: string; color: string; shape: string }[] = [
  { n: 1, label: "Type 1 — Constipation", sub: "Separate hard lumps", color: "#7c3aed", shape: "lumps" },
  { n: 2, label: "Type 2 — Constipation", sub: "Sausage-shaped but firm and lumpy", color: "#2563eb", shape: "lumpy" },
  { n: 3, label: "Type 3 — Normal", sub: "Thicker but soft, with cracks", color: "#16a34a", shape: "cracked" },
  { n: 4, label: "Type 4 — Normal", sub: "Smooth, soft, uniform", color: "#eab308", shape: "smooth" },
  { n: 5, label: "Type 5 — Lacks fiber", sub: "Soft blobs with clear-cut edges", color: "#f97316", shape: "blobs" },
  { n: 6, label: "Type 6 — Diarrhea", sub: "Fluffy, mushy, ragged edges", color: "#ec4899", shape: "mushy" },
  { n: 7, label: "Type 7 — Diarrhea", sub: "Watery, no solid pieces", color: "#dc2626", shape: "liquid" },
];

export const BOWEL_FEELINGS_DEFAULT = [
  "Relief",
  "Normal",
  "Neutral",
  "Painful",
  "Cramping",
  "Urgent",
  "Gassy",
  "Incomplete",
];

export const BOWEL_SYMPTOMS_DEFAULT = [
  "Bloating",
  "Cramps",
  "Straining",
  "Blood",
  "Mucus",
  "Burning",
  "Nausea",
  "Urgency",
];

export const EVENT_COLORS = [
  "#93A66A", // sage
  "#7F8A45", // olive
  "#7895B2", // dusty blue
  "#D89B72", // muted apricot
  "#C9A94D", // soft mustard
  "#C97D91", // dusty rose
  "#9A82C4", // lavender
  "#76A9B7", // muted sky
  "#B96752", // terracotta
];

export const BODY_BATTERY: { n: number; label: string; color: string; emoji: string }[] = [
  { n: 1, label: "Drained", color: "#ef4444", emoji: "😴" },
  { n: 2, label: "Low", color: "#f97316", emoji: "🙁" },
  { n: 3, label: "Ok", color: "#eab308", emoji: "😐" },
  { n: 4, label: "Good", color: "#22c55e", emoji: "🙂" },
  { n: 5, label: "Fully charged", color: "#16a34a", emoji: "⚡" },
];

export const SLEEP_QUALITY = [
  "😩 Awful",
  "😴 Terrible",
  "🥱 Restless",
  "🙁 Poor",
  "😐 Ok",
  "🌙 Broken sleep",
  "😪 Woke up a lot",
  "🙂 Good",
  "😌 Refreshed",
  "😀 Great",
  "🤩 Perfect",
  "💤 Slept in",
  "⏰ Too short",
  "🛌 Too long",
  "🥴 Groggy",
  "😵‍💫 Foggy head",
  "😰 Nightmares",
  "💭 Vivid dreams",
  "🌡️ Sweaty night",
  "🥶 Cold night",
  "🤕 Woke with headache",
  "🦵 Cramps at night",
  "🚽 Up to the toilet",
  "📱 Fell asleep late",
  "☀️ Woke up early",
  "🐢 Hard to get up",
  "🧘 Deep & calm",
  "😻 Best sleep ever",
];

export function pregnancyInfo(since?: string): { week: number; trimester: 1 | 2 | 3 } | null {
  if (!since) return null;
  const days = daysBetween(since, todayKey());
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  const trimester: 1 | 2 | 3 = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return { week, trimester };
}

export const SEX_FEELINGS_DEFAULT = [
  "😊 Great",
  "🥰 Loved",
  "🤩 Amazing",
  "😌 Relaxed",
  "🙂 Good",
  "😐 Meh",
  "😞 Down",
  "😢 Sad",
  "😤 Frustrated",
  "🤕 Sore",
  "😴 Sleepy",
  "💦 Sweaty",
  "🥵 Hot",
  "🥶 Cold",
  "😵‍💫 Dizzy",
  "🤢 Nauseous",
  "💪 Energized",
  "🫠 Drained",
];

export const PCOS_SYMPTOMS = [
  "Acne",
  "Hirsutism (excess hair)",
  "Hair thinning / crown loss",
  "Sugar cravings / energy swings after meals",
  "Oily skin",
  "Dark skin patches (acanthosis nigricans)",
  "Skin tags",
  "Weight gain / hard to lose",
  "Heavy sweating",
  "Fatigue / low energy",
  "Hunger soon after eating",
];

export const HISTAMINE_SYMPTOMS = [
  "Flushing / redness",
  "Hives / rash",
  "Itching",
  "Stuffy nose",
  "Headache",
  "GI issues",
  "Rapid heart rate",
  "Swelling",
  "Fatigue after food",
];

export const FOOD_SYMPTOMS_AFTER = [
  "Bloating",
  "Gas",
  "Abdominal pain / cramps",
  "Nausea",
  "Diarrhea",
  "Constipation",
  "Heartburn / reflux",
  "Burping",
  "Fatigue after food",
  "Headache",
  "Flushing / redness",
  "Itching / hives",
  "Rapid heart rate",
];

export const URINARY_DEFAULT = [
  "Frequent urination",
  "Painful urination",
  "Urgency",
  "Incomplete emptying",
  "Night urination",
  "Blood in urine",
];

export const ALLERGENS_DEFAULT = ["Nuts", "Casein / dairy", "Gluten", "Eggs", "Fish", "Soy", "Shellfish", "Peanuts"];

export const PRESSURE_TYPES = ["Pelvic", "Abdominal", "Chest", "Head / sinus", "Vaginal", "Rectal", "Lower back"];

export const NAUSEA_TYPES = [
  "Mild nausea",
  "Moderate nausea",
  "Severe nausea",
  "Constant nausea",
  "Intermittent nausea",
  "Morning nausea",
  "Post-meal nausea",
  "Motion-induced nausea",
];

export const NAUSEA_TYPE_DESC: Record<string, string> = {
  "Mild nausea": "Slight queasiness you can easily ignore.",
  "Moderate nausea": "Clearly unpleasant, but you can still eat and function.",
  "Severe nausea": "Hard to function; vomiting feels likely.",
  "Constant nausea": "Present all day without letting up.",
  "Intermittent nausea": "Comes and goes in waves through the day.",
  "Morning nausea": "Worst right after waking, before eating.",
  "Post-meal nausea": "Starts shortly after eating.",
  "Motion-induced nausea": "Triggered by travel or movement (car, bus, boat).",
};

export const NAUSEA_SEVERITY_DESC: Record<number, string> = {
  0: "No nausea — feeling completely normal",
  1: "Very mild — occasionally noticeable, doesn't bother me",
  2: "Very mild — occasionally noticeable, doesn't bother me",
  3: "Mild — unpleasant, but I can function and eat normally",
  4: "Mild — unpleasant, but I can function and eat normally",
  5: "Moderate — need to sit or rest, food is very unappealing",
  6: "Moderate — need to sit or rest, food is very unappealing",
  7: "Strong — hard to concentrate, feel like I'll vomit",
  8: "Strong — hard to concentrate, feel like I'll vomit",
  9: "Very strong — almost unbearable, vomiting likely or already started",
  10: "Extreme — constant vomiting or the worst nausea imaginable",
};

export const NAUSEA_TRIGGERS = [
  "After food",
  "Car ride",
  "Smell",
  "Medication",
  "Hormonal",
  "Stress",
  "Hunger",
  "Unknown",
];

export const NAUSEA_SYMPTOMS = ["Dizziness", "Cold sweat", "Bloating", "Headache", "Weakness", "Vomiting"];

export const NAUSEA_HELPED = ["Lying down", "Ginger tea", "Fresh air", "Medication", "Food", "Nothing helped"];

export function markDeleted(update: (u: (d: BixboData) => BixboData) => void, ...ids: string[]) {
  update((d) => ({ ...d, deletedIds: Array.from(new Set([...(d.deletedIds ?? []), ...ids])) }));
}

export function withCustomTombstones<K extends keyof CustomLists>(
  d: BixboData,
  key: K,
  removed: string[],
): BixboData {
  if (!removed.length) return d;
  const prev = d.deletedCustom?.[key] ?? [];
  return {
    ...d,
    deletedCustom: { ...(d.deletedCustom ?? {}), [key]: Array.from(new Set([...prev, ...removed])) },
  };
}

export function withoutCustomTombstones<K extends keyof CustomLists>(
  d: BixboData,
  key: K,
  restored: string[],
): BixboData {
  const prev = d.deletedCustom?.[key];
  if (!prev?.length || !restored.length) return d;
  const next = prev.filter((v) => !restored.includes(v));
  return { ...d, deletedCustom: { ...(d.deletedCustom ?? {}), [key]: next } };
}
