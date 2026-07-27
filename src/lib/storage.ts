import { useEffect, useSyncExternalStore } from "react";

/* ------------------- Types ------------------- */
export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "veryheavy";
export type SexKind = "sex" | "fingering" | "suck_dick" | "oral" | "other" | "sex_with_condom" | "sex_without_condom" | "oral_giving" | "oral_receiving";
export type ThermoKind = "heat" | "cold" | "tens";
export type PainfulWhen = "no" | "before" | "during" | "after";
export type Gender = "female" | "male";

export interface PainEntry {
  id: string;
  time: string;
  score: number;
  parts: string[];
  quality: string[];
  symptoms: string[];
  note: string;
  bodyBattery?: number;
  stress?: number;
  mood?: string[];
  hotFlashes?: number;
}
export interface TetanyEpisode {
  id: string;
  time: string;
  types: string[];
  location: string[];
  intensity: number;
  minutes?: number;
  triggers: string[];
  timeSinceMagnerotMin?: number;
  helped: string[];
  note?: string;
}
export interface PanicAttack {
  id: string;
  time: string;
  minutes?: number;
  intensity: number;
  physical: string[];
  cognitive: string[];
  trigger: string;
  place?: string;
  hyperventilation: "no" | "before" | "during" | "unknown";
  tetanyPresent: boolean;
  helped: string[];
  note?: string;
}
export interface ThermoSession { id: string; kind: ThermoKind; start: string; minutes: number; note?: string }
export interface FoodEntry {
  id: string; time: string; what: string; feelings: string[]; after?: string;
  hydrationMl?: number; caffeineMg?: number; alcoholDrinks?: number;
}
export interface BowelEntry { id: string; time: string; bristol: number; note?: string; feelings?: string[]; symptoms?: string[] }
export interface SexEntry { id: string; time: string; kind: SexKind; feelingAfter?: string | string[]; painful?: PainfulWhen; note?: string }
export interface ExtraMed { id: string; time: string; name: string; dose?: string; note?: string }
export interface WorkoutEntry { id: string; time: string; kind: string; minutes: number; weightKg?: number; feeling?: string | string[]; note?: string }
export interface EventEntry { id: string; title: string; startDate: string; endDate: string; time?: string; timeEnd?: string; note?: string; color?: string }
export interface TaskEntry { id: string; title: string; startDate: string; endDate: string; time?: string; timeEnd?: string; done: boolean; note?: string }
export interface PeriodEntry { level: PeriodLevel; discharge?: string; dischargeNote?: string; note?: string; cramps?: number }
export interface DayNote { text: string; time?: string }

export interface MoodEntry { id: string; time: string; value: "happy" | "neutral" | "sad" | "angry" }
export interface EnergyEntry { id: string; time: string; value: "good" | "exhausted" }
export interface HistamineEntry { id: string; time: string; flare: boolean; note?: string }

export interface DayLog {
  pain?: PainEntry[];
  tetany?: TetanyEpisode[];
  panic?: PanicAttack[];
  heat?: ThermoSession[];
  period?: PeriodLevel;
  periodInfo?: PeriodEntry;
  food?: FoodEntry[];
  bowel?: BowelEntry[];
  sex?: SexEntry[];
  temperature?: number;
  weight?: number;
  sleepHours?: number;
  sleepQuality?: string | string[];
  extraMeds?: ExtraMed[];
  workout?: WorkoutEntry[];
  mood?: MoodEntry[];
  energy?: EnergyEntry[];
  histamine?: HistamineEntry[];
}

export function asArr(v: string | string[] | undefined | null): string[] {
  if (v == null || v === "") return [];
  return Array.isArray(v) ? v : [v];
}

export interface Todo { id: string; text: string; done: boolean }
export interface Med { id: string; name: string; dose?: string; times: string[]; asNeeded?: boolean; color?: string; note?: string }
export interface NoteFolder { id: string; name: string; icon?: string }
export interface NoteChecklistItem { id: string; text: string; done: boolean }
export interface Note {
  id: string; folderId: string; title: string; content: string;
  checklist?: NoteChecklistItem[]; createdAt: number; updatedAt?: number;
}

export interface CyclePrefs {
  lastPeriodStart?: string;
  lastPeriodEnd?: string;
  cycleLength: number;
  periodLength: number;
}

export interface CustomLists {
  bodyParts: string[];
  quality: string[];
  symptoms: string[];
  foodFeelings: string[];
  foodQuickAdd: string[];
  workoutKinds: string[];
  moods: string[];
  tetanyTypes: string[];
  tetanyLocations: string[];
  tetanyTriggers: string[];
  tetanyHelped: string[];
  panicPhysical: string[];
  panicCognitive: string[];
  panicHelped: string[];
  sexTypes: string[];
  bowelFeelings: string[];
  bowelSymptoms: string[];
}

export interface Settings {
  textSize: "sm" | "md" | "lg" | "xl";
  notifications: boolean;
  pairingCode?: string;
  partnerName?: string;
  logOrder?: string[];
  gender?: Gender;
  birthControlSince?: string;
  scaleDescriptions?: Partial<Record<"pain" | "stress" | "tetany" | "panic" | "hotFlashes", Record<number, string>>>;
}

export interface PartnerData {
  name?: string;
  dayLogs: Record<string, { pain?: PainEntry[]; panic?: PanicAttack[]; tetany?: TetanyEpisode[]; extraMeds?: ExtraMed[]; period?: PeriodLevel; periodInfo?: PeriodEntry }>;
  dayNotes?: Record<string, DayNote[] | string[]>;
  meds?: Med[];
  medLog?: Record<string, Record<string, boolean>>;
  cycle?: CyclePrefs;
  gender?: Gender;
  importedAt: number;
}

export interface BixboData {
  dayLogs: Record<string, DayLog>;
  dayNotes: Record<string, DayNote[] | string[]>;
  todos: Record<string, Todo[]>;
  tasks: TaskEntry[];
  events: EventEntry[];
  meds: Med[];
  medLog: Record<string, Record<string, boolean>>;
  medLogTimes: Record<string, Record<string, string>>;
  folders: NoteFolder[];
  notebook: Note[];
  cycle: CyclePrefs;
  custom: CustomLists;
  settings: Settings;
  partner?: PartnerData;
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
  medLogTimes: {},
  folders: DEFAULT_FOLDERS,
  notebook: [],
  cycle: { lastPeriodStart: "2026-07-15", lastPeriodEnd: "2026-07-19", cycleLength: 28, periodLength: 5 },
  custom: {
    bodyParts: [], quality: [], symptoms: [], foodFeelings: [], foodQuickAdd: [], workoutKinds: [], moods: [],
    tetanyTypes: [], tetanyLocations: [], tetanyTriggers: [], tetanyHelped: [],
    panicPhysical: [], panicCognitive: [], panicHelped: [],
    sexTypes: [], bowelFeelings: [], bowelSymptoms: [],
  },
  settings: { textSize: "md", notifications: true, gender: "female" },
};

const KEY = "bixbo:v2";
const LEGACY_KEY = "bixbo:v1";

function migrate(raw: unknown): BixboData {
  const parsed = (raw ?? {}) as Partial<BixboData> & Record<string, unknown>;
  const src = (parsed.dayLogs ?? {}) as Record<string, Record<string, unknown>>;
  const dayLogs: Record<string, DayLog> = {};
  for (const [k, l] of Object.entries(src)) {
    const out: DayLog = { ...(l as DayLog) };
    if (typeof l.pain === "number") {
      out.pain = [{ id: `${k}-legacy`, time: "00:00", score: l.pain, parts: [], quality: [], symptoms: [], note: "" }];
    }
    if (l.sex && typeof l.sex === "object" && !Array.isArray(l.sex)) {
      const s = l.sex as { type?: string; note?: string };
      if (s.type && s.type !== "none") {
        const map: Record<string, SexKind> = { with_condom: "sex", without_condom: "sex" };
        out.sex = [{ id: `${k}-legacy-sex`, time: "00:00", kind: (map[s.type] ?? "other") as SexKind, note: s.note }];
      } else { out.sex = []; }
    }
    dayLogs[k] = out;
  }
  const c = { ...EMPTY.custom, ...(parsed.custom as Partial<CustomLists> | undefined) };
  return {
    ...EMPTY,
    ...parsed,
    dayLogs,
    folders: (parsed.folders as NoteFolder[] | undefined)?.length ? parsed.folders as NoteFolder[] : DEFAULT_FOLDERS,
    cycle: { ...EMPTY.cycle, ...(parsed.cycle as Partial<CyclePrefs> | undefined) },
    custom: c,
    settings: { ...EMPTY.settings, ...(parsed.settings as Partial<Settings> | undefined) },
    tasks: (parsed.tasks as TaskEntry[] | undefined) ?? [],
    events: (parsed.events as EventEntry[] | undefined) ?? [],
    notebook: ((parsed.notebook as Note[] | undefined) ?? []).map((n) => ({ ...n, folderId: n.folderId ?? "general" })),
  } as BixboData;
}

/* ------------------- Shared store ------------------- */
let _state: BixboData = EMPTY;
let _hydrated = false;
const listeners = new Set<() => void>();
const changeListeners = new Set<(d: BixboData, reason: "local" | "remote") => void>();

function emit() { listeners.forEach((l) => l()); }

function hydrate() {
  if (_hydrated || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) _state = migrate(JSON.parse(raw));
  } catch {}
  _hydrated = true;
  emit();
}

function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(_state)); } catch {}
}

export function setBixbo(updater: (d: BixboData) => BixboData) {
  _state = updater(_state);
  persist();
  emit();
  changeListeners.forEach((l) => l(_state, "local"));
}
export function replaceBixbo(d: BixboData, reason: "local" | "remote" = "local") {
  _state = migrate(d);
  persist();
  emit();
  changeListeners.forEach((l) => l(_state, reason));
}
export function setPartner(partner: PartnerData | undefined) {
  _state = { ..._state, partner };
  persist();
  emit();
}
export function getBixbo(): BixboData { return _state; }
export function subscribeBixboChanges(fn: (d: BixboData, reason: "local" | "remote") => void) {
  changeListeners.add(fn);
  return () => { changeListeners.delete(fn); };
}

export function useBixbo() {
  useEffect(() => { hydrate(); }, []);
  const data = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => _state,
    () => EMPTY,
  );
  useEffect(() => {
    if (!_hydrated) return;
    const map = { sm: "14px", md: "16px", lg: "18px", xl: "20px" } as const;
    document.documentElement.style.fontSize = map[data.settings.textSize] ?? "16px";
  }, [data.settings.textSize]);
  return { data, update: setBixbo, replace: (d: BixboData) => replaceBixbo(d, "local"), hydrated: _hydrated };
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
    l.pain?.length || l.tetany?.length || l.panic?.length ||
    l.heat?.length || l.period || l.periodInfo?.level ||
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
  while (curStart <= toK) {
    const end = addDays(curStart, Math.max(0, cycle.periodLength - 1));
    if (end >= fromK) out.push({ start: curStart, end });
    curStart = addDays(curStart, cycle.cycleLength);
    if (out.length > 24) break;
  }
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
  0: "Pain free", 1: "Very minor annoyance", 2: "Minor annoyance", 3: "Annoying, distracting",
  4: "Bearable if involved in work", 5: "Can't be ignored > 30 min", 6: "Can't be ignored for long",
  7: "Hard to concentrate", 8: "Physical activity limited", 9: "Unable to speak, crying out",
  10: "Unconscious — passes out",
};
export function painColor(score: number): string {
  const n = Math.max(0, Math.min(10, Math.round(score)));
  return `var(--pain-${n})`;
}
export function avgDayPain(log?: DayLog): number | undefined {
  if (!log?.pain?.length) return undefined;
  const sum = log.pain.reduce((s, p) => s + p.score, 0);
  return sum / log.pain.length;
}

export const BODY_PARTS_DEFAULT = ["Abdomen","Lower abdomen","Lower belly","Pelvis","Ovaries","Uterus","Vagina","Groin","Back","Head","Legs","Chest"];
export const PAIN_QUALITY_DEFAULT = ["Cramping","Stabbing","Burning","Dull","Sharp","Throbbing","Pressure","Shooting","Aching"];
export const OTHER_SYMPTOMS_DEFAULT = ["Nausea","Dizziness","Fatigue","Bloating","Diarrhea","Constipation","Headache","Cold sweats","Fainting","Mood swings"];
export const FOOD_FEELINGS_DEFAULT = ["😊 Great","🙂 Fine","😐 Neutral","😕 Off","😖 Bloated","🤢 Nauseous","🤕 Stomach pain","😴 Sleepy","🥵 Flushed","⚡ Energy up"];
export const WORKOUT_KINDS_DEFAULT = ["🧘🏼‍♀️ Yoga","🚶🏼‍♀️ Walk","🏃🏼‍♀️ Run","🚴 Cycling","💪 Strength","🤸 Stretching","🏊 Swim","🧘 Meditation"];
export const MOODS_DEFAULT = ["All over the place","Angry","Annoyed","Anxious","Apathetic","Bored","Busy","Calm","Clingy","Cranky","Depressed","Excited","Fatigued","Grateful","Happy","In love","In pain","Indifferent","Irritated","Just chillin","Lonely","Meh","PMDD","Productive","Restful","Sad","Self-deprecating","Sleepy","Stressed","Tired"];
export const TETANY_TYPES = ["Carpopedal spasm","Calf cramps","Twitches around mouth/face","Tingling / numbness","Fasciculations"];
export const TETANY_LOCATIONS_DEFAULT = ["Lips","Fingers","Toes","Hands","Calves","Face","Around mouth"];
export const TETANY_TRIGGERS = ["Hyperventilation / stress","Exercise","Cold","Cycle phase","Other"];
export const TETANY_HELPED_DEFAULT = ["Slow breathing","Breathe into bag/hands","Warmth","Extra magnesium","Rest"];
export const PANIC_PHYSICAL = ["Racing heart","Shortness of breath","Chest pressure","Dizziness","Tingling / numbness","Trembling","Nausea","Hot flashes / chills"];
export const PANIC_COGNITIVE = ["Loss of control","Derealization","Fear of dying","Fear of collapse"];
export const PANIC_HELPED_DEFAULT = ["Slow exhale","Frontin","Grounding","Someone with me","Fresh air"];

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
  { value: "clear",  label: "Clear / egg-white", color: "#dbeafe" },
  { value: "white",  label: "White / creamy",    color: "#f5f5f4" },
  { value: "yellow", label: "Yellow",            color: "#fde68a" },
  { value: "brown",  label: "Brown / spotting",  color: "#a16207" },
  { value: "other",  label: "Other",             color: "#c084fc" },
];

export const BRISTOL: { n: number; label: string; sub: string; color: string; shape: string }[] = [
  { n: 1, label: "Type 1 — Constipation",  sub: "Separate hard lumps",                    color: "#7c3aed", shape: "lumps" },
  { n: 2, label: "Type 2 — Constipation",  sub: "Sausage-shaped but firm and lumpy",      color: "#2563eb", shape: "lumpy" },
  { n: 3, label: "Type 3 — Normal",        sub: "Thicker but soft, with cracks",          color: "#16a34a", shape: "cracked" },
  { n: 4, label: "Type 4 — Normal",        sub: "Smooth, soft, uniform",                  color: "#eab308", shape: "smooth" },
  { n: 5, label: "Type 5 — Lacks fiber",   sub: "Soft blobs with clear-cut edges",        color: "#f97316", shape: "blobs" },
  { n: 6, label: "Type 6 — Diarrhea",      sub: "Fluffy, mushy, ragged edges",            color: "#ec4899", shape: "mushy" },
  { n: 7, label: "Type 7 — Diarrhea",      sub: "Watery, no solid pieces",                color: "#dc2626", shape: "liquid" },
];

export const BOWEL_FEELINGS_DEFAULT = ["😌 Relief","🙂 Normal","😐 Neutral","😖 Painful","🤕 Cramping","😰 Urgent","💨 Gassy","😞 Incomplete"];
export const BOWEL_SYMPTOMS_DEFAULT = ["Bloating","Cramps","Straining","Blood","Mucus","Burning","Nausea","Urgency"];

export const EVENT_COLORS = ["#22c55e","#3b82f6","#f97316","#eab308","#ec4899","#a855f7","#06b6d4","#ef4444"];

export const BODY_BATTERY: { n: number; label: string; color: string; emoji: string }[] = [
  { n: 1, label: "Drained",      color: "#ef4444", emoji: "😴" },
  { n: 2, label: "Low",          color: "#f97316", emoji: "🙁" },
  { n: 3, label: "Ok",           color: "#eab308", emoji: "😐" },
  { n: 4, label: "Good",         color: "#22c55e", emoji: "🙂" },
  { n: 5, label: "Fully charged",color: "#16a34a", emoji: "⚡" },
];

export const SLEEP_QUALITY = ["😴 Terrible","🙁 Poor","😐 Ok","🙂 Good","😀 Great"];
