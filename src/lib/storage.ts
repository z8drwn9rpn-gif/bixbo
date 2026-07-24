import { useEffect, useState, useCallback } from "react";

/* ------------------- Types ------------------- */
export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "veryheavy";
export type SexActivity = "" | "none" | "with_condom" | "without_condom";

export interface DayLog {
  pain?: number; // 0-10
  heat?: number; // 0 none, 1 mild, 2 medium, 3 strong
  bowel?: boolean;
  period?: PeriodLevel;
  food?: { breakfast?: string; lunch?: string; dinner?: string; snack?: string };
  sex?: SexActivity;
  temperature?: number; // °C
  weight?: number; // kg
}

export interface Todo { id: string; text: string; done: boolean }
export interface Med { id: string; name: string; dose?: string; times: string[]; asNeeded?: boolean; color?: string }
export interface Note { id: string; title: string; content: string; createdAt: number }

export interface BixboData {
  dayLogs: Record<string, DayLog>;
  dayNotes: Record<string, string[]>;
  todos: Record<string, Todo[]>;
  meds: Med[];
  medLog: Record<string, Record<string, boolean>>; // date -> `${medId}@${time}` -> taken
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

/* ------------------- Hook ------------------- */
export function useBixbo() {
  const [data, setData] = useState<BixboData>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...EMPTY, ...JSON.parse(raw) });
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

  return { data, update, hydrated };
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
