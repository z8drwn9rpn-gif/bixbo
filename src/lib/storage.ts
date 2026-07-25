import { useEffect, useState, useCallback } from "react";

/* ------------------- Types ------------------- */
export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "veryheavy";
export type SexKind = "none" | "sex_with_condom" | "sex_without_condom" | "fingering" | "oral_giving" | "oral_receiving" | "other";
export type ThermoKind = "heat" | "cold";

export interface PainEntry {
  id: string;
  time: string;
  score: number;
  parts: string[];
  quality: string[];
  symptoms: string[];
  note: string;
}
export interface ThermoSession {
  id: string;
  kind: ThermoKind;
  start: string;
  minutes: number;
  note?: string;
}
export interface FoodEntry {
  id: string;
  time: string;
  what: string;
  feelings: string[];    // e.g. ["Bloated","😐"]
  after?: string;
}
export interface BowelEntry { id: string; time: string; bristol: number; note?: string }
export interface SexEntry { id: string; time: string; kind: SexKind; note?: string }
export interface ExtraMed { id: string; time: string; name: string; dose?: string }
export interface WorkoutEntry {
  id: string;
  time: string;
  kind: string;          // "Yoga", "Walk", …
  minutes: number;
  weightKg?: number;
  feeling?: string;
  note?: string;
}
export interface EventEntry {
  id: string;
  title: string;
  startDate: string;      // yyyy-mm-dd
  endDate: string;
  time?: string;
  note?: string;
  color?: string;
}
export interface TaskEntry {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  time?: string;
  done: boolean;
  note?: string;
}
export interface PeriodEntry {
  level: PeriodLevel;
  discharge?: string;      // "clear","white","yellow","brown","other"
  dischargeNote?: string;
  note?: string;
}

export interface DayLog {
  pain?: PainEntry[];
  heat?: ThermoSession[];       // heat + cold combined
  period?: PeriodLevel;         // legacy simple
  periodInfo?: PeriodEntry;     // richer
  food?: FoodEntry[];
  bowel?: BowelEntry[];
  sex?: SexEntry[];             // array now
  temperature?: number;
  weight?: number;
  sleepHours?: number;
  extraMeds?: ExtraMed[];
  workout?: WorkoutEntry[];
}

export interface Todo { id: string; text: string; done: boolean }
export interface Med { id: string; name: string; dose?: string; times: string[]; asNeeded?: boolean; color?: string }
export interface NoteFolder { id: string; name: string; icon?: string }
export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface CyclePrefs {
  lastPeriodStart?: string;   // yyyy-mm-dd
  lastPeriodEnd?: string;
  cycleLength: number;        // days
  periodLength: number;       // days
}

export interface CustomLists {
  bodyParts: string[];
  quality: string[];
  symptoms: string[];
  foodFeelings: string[];
  workoutKinds: string[];
}

export interface BixboData {
  dayLogs: Record<string, DayLog>;
  dayNotes: Record<string, string[]>;
  todos: Record<string, Todo[]>;            // legacy per-day
  tasks: TaskEntry[];                        // new global with date range
  events: EventEntry[];
  meds: Med[];
  medLog: Record<string, Record<string, boolean>>;
  folders: NoteFolder[];
  notebook: Note[];
  cycle: CyclePrefs;
  custom: CustomLists;
}

export const DEFAULT_FOLDERS: NoteFolder[] = [
  { id: "general", name: "General", icon: "📓" },
  { id: "health",  name: "Health",  icon: "💚" },
  { id: "ideas",   name: "Ideas",   icon: "💡" },
];

export const EMPTY: BixboData = {
  dayLogs: {},
  dayNotes: {},
  todos: {},
  tasks: [],
  events: [],
  meds: [],
  medLog: {},
  folders: DEFAULT_FOLDERS,
  notebook: [],
  cycle: {
    lastPeriodStart: "2026-07-15",
    lastPeriodEnd:   "2026-07-19",
    cycleLength: 28,
    periodLength: 5,
  },
  custom: {
    bodyParts: [],
    quality: [],
    symptoms: [],
    foodFeelings: [],
    workoutKinds: [],
  },
};

const KEY = "bixbo:v2";
const LEGACY_KEY = "bixbo:v1";

/* ------------------- Migration ------------------- */
function migrate(raw: unknown): BixboData {
  const parsed = (raw ?? {}) as Partial<BixboData> & Record<string, unknown>;
  const src = (parsed.dayLogs ?? {}) as Record<string, Record<string, unknown>>;
  const dayLogs: Record<string, DayLog> = {};
  for (const [k, l] of Object.entries(src)) {
    const out: DayLog = {};
    if (typeof l.pain === "number") {
      out.pain = [{ id: `${k}-legacy`, time: "00:00", score: l.pain, parts: [], quality: [], symptoms: [], note: "" }];
    } else if (Array.isArray(l.pain)) out.pain = l.pain as PainEntry[];

    if (typeof l.period === "string") out.period = l.period as PeriodLevel;
    if (l.periodInfo && typeof l.periodInfo === "object") out.periodInfo = l.periodInfo as PeriodEntry;

    if (Array.isArray(l.food)) {
      out.food = (l.food as unknown[]).map((f) => {
        const fx = f as Partial<FoodEntry>;
        return { id: fx.id ?? crypto.randomUUID(), time: fx.time ?? "00:00", what: fx.what ?? "", feelings: fx.feelings ?? [], after: fx.after };
      });
    }
    if (Array.isArray(l.bowel)) out.bowel = l.bowel as BowelEntry[];
    if (Array.isArray(l.heat)) out.heat = (l.heat as unknown[]).map((h) => {
      const hx = h as Partial<ThermoSession>;
      return { id: hx.id ?? crypto.randomUUID(), kind: hx.kind ?? "heat", start: hx.start ?? "00:00", minutes: hx.minutes ?? 20, note: hx.note };
    });
    if (Array.isArray(l.sex)) out.sex = l.sex as SexEntry[];
    else if (l.sex && typeof l.sex === "object" && !Array.isArray(l.sex)) {
      const s = l.sex as { type?: string; note?: string };
      if (s.type && s.type !== "none") {
        const map: Record<string, SexKind> = { with_condom: "sex_with_condom", without_condom: "sex_without_condom" };
        out.sex = [{ id: `${k}-legacy-sex`, time: "00:00", kind: (map[s.type] ?? "other") as SexKind, note: s.note }];
      }
    }
    if (Array.isArray(l.extraMeds)) out.extraMeds = l.extraMeds as ExtraMed[];
    if (Array.isArray(l.workout)) out.workout = l.workout as WorkoutEntry[];
    if (typeof l.temperature === "number") out.temperature = l.temperature;
    if (typeof l.weight === "number") out.weight = l.weight;
    if (typeof l.sleepHours === "number") out.sleepHours = l.sleepHours;
    dayLogs[k] = out;
  }

  return {
    ...EMPTY,
    ...parsed,
    dayLogs,
    folders: (parsed.folders as NoteFolder[] | undefined)?.length ? parsed.folders as NoteFolder[] : DEFAULT_FOLDERS,
    cycle: { ...EMPTY.cycle, ...(parsed.cycle as Partial<CyclePrefs> | undefined) },
    custom: { ...EMPTY.custom, ...(parsed.custom as Partial<CustomLists> | undefined) },
    tasks: (parsed.tasks as TaskEntry[] | undefined) ?? [],
    events: (parsed.events as EventEntry[] | undefined) ?? [],
    notebook: ((parsed.notebook as Note[] | undefined) ?? []).map((n) => ({
      ...n, folderId: n.folderId ?? "general",
    })),
  } as BixboData;
}

/* ------------------- Hook ------------------- */
export function useBixbo() {
  const [data, setData] = useState<BixboData>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (raw) setData(migrate(JSON.parse(raw)));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }, [data, hydrated]);

  const update = useCallback((updater: (d: BixboData) => BixboData) => {
    setData((prev) => updater(prev));
  }, []);
  const replace = useCallback((d: BixboData) => setData(migrate(d)), []);

  return { data, update, replace, hydrated };
}

/* ------------------- Day helpers ------------------- */
export function updateDayLog(
  update: (u: (d: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
) {
  update((d) => ({ ...d, dayLogs: { ...d.dayLogs, [date]: patch(d.dayLogs[date] ?? {}) } }));
}

export function hasAnyLog(l?: DayLog): boolean {
  if (!l) return false;
  return !!(
    l.pain?.length || l.heat?.length || l.period || l.periodInfo?.level ||
    l.food?.length || l.bowel?.length || l.sex?.length ||
    l.temperature != null || l.weight != null || l.sleepHours != null ||
    l.extraMeds?.length || l.workout?.length
  );
}

/* ------------------- Date helpers ------------------- */
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
export function todayKey() { return toKey(new Date()); }
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}
export function addDays(k: string, n: number): string {
  const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d);
}
export function isDateInRange(k: string, start: string, end: string): boolean {
  return k >= start && k <= end;
}

/* ------------------- Cycle prediction ------------------- */
export function predictPeriods(cycle: CyclePrefs, from: Date, to: Date): { start: string; end: string }[] {
  if (!cycle.lastPeriodStart) return [];
  const out: { start: string; end: string }[] = [];
  const fromK = toKey(from), toK = toKey(to);
  let curStart = cycle.lastPeriodStart;
  // Move forward
  while (curStart <= toK) {
    const end = addDays(curStart, Math.max(0, cycle.periodLength - 1));
    if (end >= fromK) out.push({ start: curStart, end });
    curStart = addDays(curStart, cycle.cycleLength);
    if (out.length > 24) break;
  }
  // Also include current stored one even if in past
  if (cycle.lastPeriodStart && cycle.lastPeriodEnd) {
    const s = cycle.lastPeriodStart, e = cycle.lastPeriodEnd;
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

/* ------------------- Constants ------------------- */
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
export function painColor(score: number): string {
  const n = Math.max(0, Math.min(10, Math.round(score)));
  return `var(--pain-${n})`;
}
export const BODY_PARTS_DEFAULT = [
  "Abdomen","Lower abdomen","Lower belly","Pelvis","Ovaries",
  "Uterus","Vagina","Groin","Back","Head","Legs","Chest",
];
export const PAIN_QUALITY_DEFAULT = [
  "Cramping","Stabbing","Burning","Dull","Sharp","Throbbing","Pressure","Shooting","Aching",
];
export const OTHER_SYMPTOMS_DEFAULT = [
  "Nausea","Dizziness","Fatigue","Bloating","Diarrhea","Constipation","Headache","Cold sweats","Fainting","Mood swings",
];
export const FOOD_FEELINGS_DEFAULT = [
  "😊 Great","🙂 Fine","😐 Neutral","😕 Off","😖 Bloated","🤢 Nauseous","🤕 Stomach pain","😴 Sleepy","🥵 Flushed",
];
export const WORKOUT_KINDS_DEFAULT = [
  "🧘🏼‍♀️ Yoga","🚶🏼‍♀️ Walk","🏃🏼‍♀️ Run","🚴 Cycling","💪 Strength","🤸 Stretching","🏊 Swim","🧘 Meditation",
];
export const DISCHARGE_OPTS: { value: string; label: string; color: string }[] = [
  { value: "clear",  label: "Clear / egg-white", color: "#dbeafe" },
  { value: "white",  label: "White / creamy",    color: "#f5f5f4" },
  { value: "yellow", label: "Yellow",            color: "#fde68a" },
  { value: "brown",  label: "Brown / spotting",  color: "#a16207" },
  { value: "other",  label: "Other",             color: "#c084fc" },
];

export const BRISTOL: { n: number; label: string; color: string; shape: string }[] = [
  { n: 1, label: "Separate hard lumps", color: "#6b3f1a", shape: "lumps" },
  { n: 2, label: "Lumpy sausage",       color: "#8a5a2b", shape: "lumpy" },
  { n: 3, label: "Cracked sausage",     color: "#a97142", shape: "cracked" },
  { n: 4, label: "Smooth sausage",      color: "#c58a5b", shape: "smooth" },
  { n: 5, label: "Soft blobs",          color: "#d9a273", shape: "blobs" },
  { n: 6, label: "Mushy",               color: "#c9b48b", shape: "mushy" },
  { n: 7, label: "Liquid",              color: "#a6b57a", shape: "liquid" },
];
