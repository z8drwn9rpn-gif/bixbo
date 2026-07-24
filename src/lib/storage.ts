import { useEffect, useState, useCallback } from "react";

/* ------------------- Types ------------------- */
export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "veryheavy";
export type SexType = "none" | "with_condom" | "without_condom";

export interface PainEntry {
  id: string;
  time: string;         // HH:MM
  score: number;        // 0-10 in 0.5 steps
  parts: string[];      // body parts
  quality: string[];    // pain quality
  symptoms: string[];   // other symptoms
  note: string;
}
export interface HeatSession { id: string; start: string; minutes: number; note?: string }
export interface FoodEntry { id: string; time: string; what: string; after?: string }
export interface BowelEntry { id: string; time: string; bristol: number; note?: string }
export interface SexEntry { type: SexType; note?: string }
export interface ExtraMed { id: string; time: string; name: string; dose?: string }

export interface DayLog {
  pain?: PainEntry[];
  heat?: HeatSession[];
  period?: PeriodLevel;
  food?: FoodEntry[];
  bowel?: BowelEntry[];
  sex?: SexEntry;
  temperature?: number;
  weight?: number;
  extraMeds?: ExtraMed[];
}

export interface Todo { id: string; text: string; done: boolean }
export interface Med { id: string; name: string; dose?: string; times: string[]; asNeeded?: boolean; color?: string }
export interface Note { id: string; title: string; content: string; createdAt: number }

export interface BixboData {
  dayLogs: Record<string, DayLog>;
  dayNotes: Record<string, string[]>;
  todos: Record<string, Todo[]>;
  meds: Med[];
  medLog: Record<string, Record<string, boolean>>;
  notebook: Note[];
}

export const EMPTY: BixboData = {
  dayLogs: {},
  dayNotes: {},
  todos: {},
  meds: [],
  medLog: {},
  notebook: [],
};

const KEY = "bixbo:v1";

/* ------------------- Migration ------------------- */
// Convert legacy flat DayLog (single number pain, meal object food, plain sex string)
// into the new richer schema so existing data isn't lost.
function migrate(raw: unknown): BixboData {
  const parsed = (raw ?? {}) as Partial<BixboData> & { dayLogs?: Record<string, unknown> };
  const dayLogs: Record<string, DayLog> = {};
  const src = (parsed.dayLogs ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    const l = (v ?? {}) as Record<string, unknown>;
    const out: DayLog = {};
    // pain
    if (typeof l.pain === "number") {
      out.pain = [{
        id: `${k}-legacy`, time: "00:00", score: l.pain,
        parts: [], quality: [], symptoms: [], note: "",
      }];
    } else if (Array.isArray(l.pain)) {
      out.pain = l.pain as PainEntry[];
    }
    // period
    if (typeof l.period === "string") out.period = l.period as PeriodLevel;
    // food
    if (l.food && typeof l.food === "object" && !Array.isArray(l.food)) {
      const f = l.food as Record<string, string>;
      const list: FoodEntry[] = [];
      const meals: [string, string][] = [
        ["breakfast", "08:00"], ["lunch", "12:00"], ["dinner", "18:00"], ["snack", "15:00"],
      ];
      for (const [m, t] of meals) {
        if (f[m]) list.push({ id: `${k}-${m}`, time: t, what: f[m] });
      }
      if (list.length) out.food = list;
    } else if (Array.isArray(l.food)) {
      out.food = l.food as FoodEntry[];
    }
    // bowel
    if (typeof l.bowel === "boolean") {
      if (l.bowel) out.bowel = [{ id: `${k}-legacy-bowel`, time: "00:00", bristol: 4 }];
    } else if (Array.isArray(l.bowel)) {
      out.bowel = l.bowel as BowelEntry[];
    }
    // sex
    if (typeof l.sex === "string") {
      if (l.sex && l.sex !== "") out.sex = { type: l.sex as SexType };
    } else if (l.sex && typeof l.sex === "object") {
      out.sex = l.sex as SexEntry;
    }
    // heat
    if (Array.isArray(l.heat)) out.heat = l.heat as HeatSession[];
    // extraMeds
    if (Array.isArray(l.extraMeds)) out.extraMeds = l.extraMeds as ExtraMed[];
    // scalars
    if (typeof l.temperature === "number") out.temperature = l.temperature;
    if (typeof l.weight === "number") out.weight = l.weight;
    dayLogs[k] = out;
  }
  return {
    ...EMPTY,
    ...parsed,
    dayLogs,
  } as BixboData;
}

/* ------------------- Hook ------------------- */
export function useBixbo() {
  const [data, setData] = useState<BixboData>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
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

  const replace = useCallback((d: BixboData) => setData(d), []);

  return { data, update, replace, hydrated };
}

/* ------------------- Day helpers ------------------- */
export function updateDayLog(
  update: (u: (d: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
) {
  update((d) => ({
    ...d,
    dayLogs: { ...d.dayLogs, [date]: patch(d.dayLogs[date] ?? {}) },
  }));
}

export function hasAnyLog(l?: DayLog): boolean {
  if (!l) return false;
  return !!(
    (l.pain?.length) || (l.heat?.length) || l.period ||
    (l.food?.length) || (l.bowel?.length) || l.sex ||
    l.temperature != null || l.weight != null || (l.extraMeds?.length)
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

/* ------------------- Constants for pain wizard ------------------- */
export const PAIN_DESCRIPTIONS: Record<number, string> = {
  0: "Pain free",
  1: "Very minor annoyance",
  2: "Minor annoyance",
  3: "Annoying, distracting",
  4: "Can be ignored if involved in work",
  5: "Can't be ignored for more than 30 min",
  6: "Can't be ignored for any length",
  7: "Hard to concentrate, interferes",
  8: "Physical activity severely limited",
  9: "Unable to speak, crying out",
  10: "Unconscious — pain makes you pass out",
};

export const BODY_PARTS = [
  "Abdomen", "Lower abdomen", "Lower belly", "Pelvis", "Ovaries",
  "Uterus", "Vagina", "Groin", "Back", "Head", "Legs", "Chest", "Other",
];

export const PAIN_QUALITY = [
  "Cramping", "Stabbing", "Burning", "Dull", "Sharp",
  "Throbbing", "Pressure", "Shooting", "Aching",
];

export const OTHER_SYMPTOMS = [
  "Nausea", "Dizziness", "Fatigue", "Bloating",
  "Diarrhea", "Constipation", "Headache", "Cold sweats",
  "Fainting", "Mood swings",
];

export const BRISTOL: { n: number; label: string; color: string }[] = [
  { n: 1, label: "Separate hard lumps", color: "#6b3f1a" },
  { n: 2, label: "Lumpy sausage",       color: "#8a5a2b" },
  { n: 3, label: "Cracked sausage",     color: "#a97142" },
  { n: 4, label: "Smooth sausage",      color: "#c58a5b" },
  { n: 5, label: "Soft blobs",          color: "#d9a273" },
  { n: 6, label: "Mushy",               color: "#c9b48b" },
  { n: 7, label: "Liquid",              color: "#a6b57a" },
];
