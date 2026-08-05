import { addDays, daysBetween, fromKey, toKey, todayKey } from "@/lib/storage";
import type { BixboData, PostpartumState, PregnancyState } from "@/lib/storage";

/* ------------------- Pregnancy math ------------------- */

/** Estimated due date: manual value wins, otherwise LMP + 280 days (Naegele). */
export function dueDateOf(p?: PregnancyState): string | undefined {
  if (!p) return undefined;
  if (p.dueDate) return p.dueDate;
  if (p.lmp) return addDays(p.lmp, 280);
  return undefined;
}

/** Conception-cycle start date implied by the due date. */
export function pregnancyStart(p?: PregnancyState): string | undefined {
  if (!p) return undefined;
  if (p.lmp) return p.lmp;

  const due = dueDateOf(p);
  return due ? addDays(due, -280) : undefined;
}

export interface PregnancyProgress {
  days: number;
  week: number;
  dayOfWeek: number;
  trimester: 1 | 2 | 3;
  dueDate?: string;
  daysLeft?: number;
  percent: number;
}

export function pregnancyProgress(p?: PregnancyState, on: string = todayKey()): PregnancyProgress | null {
  const start = pregnancyStart(p);
  if (!start) return null;

  const days = Math.max(0, daysBetween(start, on));
  const week = Math.floor(days / 7);
  const dayOfWeek = days % 7;
  const trimester: 1 | 2 | 3 = week < 13 ? 1 : week < 28 ? 2 : 3;
  const due = dueDateOf(p);

  return {
    days,
    week,
    dayOfWeek,
    trimester,
    dueDate: due,
    daysLeft: due ? Math.max(0, daysBetween(on, due)) : undefined,
    percent: Math.min(100, Math.round((days / 280) * 100)),
  };
}

/* ------------------- Postpartum math ------------------- */

export interface PostpartumProgress {
  days: number;
  week: number;
  dayOfWeek: number;
}

export function postpartumProgress(pp?: PostpartumState, on: string = todayKey()): PostpartumProgress | null {
  if (!pp?.birthDate) return null;

  const days = Math.max(0, daysBetween(pp.birthDate, on));

  return {
    days,
    week: Math.floor(days / 7),
    dayOfWeek: days % 7,
  };
}

export function weeksPostpartum(pp?: PostpartumState, on: string = todayKey()): number | null {
  return postpartumProgress(pp, on)?.week ?? null;
}

/** Fruit/object size comparison per gestational week (weeks 4–41). */
export const BABY_SIZE_BY_WEEK: Record<number, { size: string; lengthCm?: number; weightG?: number }> = {
  4: { size: "Poppy seed", lengthCm: 0.1 },
  5: { size: "Sesame seed", lengthCm: 0.2 },
  6: { size: "Lentil", lengthCm: 0.4 },
  7: { size: "Blueberry", lengthCm: 1.3 },
  8: { size: "Raspberry", lengthCm: 1.6 },
  9: { size: "Green olive", lengthCm: 2.3, weightG: 2 },
  10: { size: "Prune", lengthCm: 3.1, weightG: 4 },
  11: { size: "Fig", lengthCm: 4.1, weightG: 7 },
  12: { size: "Lime", lengthCm: 5.4, weightG: 14 },
  13: { size: "Pea pod", lengthCm: 7.4, weightG: 23 },
  14: { size: "Lemon", lengthCm: 8.7, weightG: 43 },
  15: { size: "Apple", lengthCm: 10.1, weightG: 70 },
  16: { size: "Avocado", lengthCm: 11.6, weightG: 100 },
  17: { size: "Pear", lengthCm: 13, weightG: 140 },
  18: { size: "Bell pepper", lengthCm: 14.2, weightG: 190 },
  19: { size: "Mango", lengthCm: 15.3, weightG: 240 },
  20: { size: "Banana", lengthCm: 25.6, weightG: 300 },
  21: { size: "Carrot", lengthCm: 26.7, weightG: 360 },
  22: { size: "Spaghetti squash", lengthCm: 27.8, weightG: 430 },
  23: { size: "Grapefruit", lengthCm: 28.9, weightG: 501 },
  24: { size: "Corn cob", lengthCm: 30, weightG: 600 },
  25: { size: "Rutabaga", lengthCm: 34.6, weightG: 660 },
  26: { size: "Lettuce head", lengthCm: 35.6, weightG: 760 },
  27: { size: "Cauliflower", lengthCm: 36.6, weightG: 875 },
  28: { size: "Eggplant", lengthCm: 37.6, weightG: 1005 },
  29: { size: "Butternut squash", lengthCm: 38.6, weightG: 1153 },
  30: { size: "Cabbage", lengthCm: 39.9, weightG: 1319 },
  31: { size: "Coconut", lengthCm: 41.1, weightG: 1502 },
  32: { size: "Jicama", lengthCm: 42.4, weightG: 1702 },
  33: { size: "Pineapple", lengthCm: 43.7, weightG: 1918 },
  34: { size: "Cantaloupe", lengthCm: 45, weightG: 2146 },
  35: { size: "Honeydew melon", lengthCm: 46.2, weightG: 2383 },
  36: { size: "Romaine lettuce", lengthCm: 47.4, weightG: 2622 },
  37: { size: "Swiss chard", lengthCm: 48.6, weightG: 2859 },
  38: { size: "Leek", lengthCm: 49.8, weightG: 3083 },
  39: { size: "Mini watermelon", lengthCm: 50.7, weightG: 3288 },
  40: { size: "Small pumpkin", lengthCm: 51.2, weightG: 3462 },
  41: { size: "Watermelon", lengthCm: 51.7, weightG: 3597 },
};

export function babySize(week: number) {
  const clamped = Math.min(41, Math.max(4, week));
  return BABY_SIZE_BY_WEEK[clamped];
}

/* ------------------- Mode helpers ------------------- */

export function isPregnancyMode(data: BixboData): boolean {
  return Boolean(data.pregnancy?.active);
}

export function isPostpartumMode(data: BixboData): boolean {
  return Boolean(data.postpartum?.active);
}

/**
 * Cycle predictions must be hidden for male mode, pregnancy and postpartum.
 */
export function showCyclePredictions(data: BixboData): boolean {
  return data.settings.gender !== "male" && !isPregnancyMode(data) && !isPostpartumMode(data);
}

/* ------------------- Default checklists ------------------- */

export const DEFAULT_HOSPITAL_BAG = [
  "ID + insurance card",
  "Maternity notes",
  "Birth plan",
  "Nightgown / pyjamas",
  "Nursing bra",
  "Slippers + socks",
  "Toiletries",
  "Maternity pads",
  "Phone charger",
  "Snacks and drinks",
  "Going-home outfit (you)",
  "Baby bodysuits",
  "Baby blanket",
  "Nappies",
  "Car seat",
];

export const DEFAULT_PREGNANCY_VACCINES = ["Flu (influenza)", "Tdap (whooping cough)", "COVID-19", "RSV"];

export const DEFAULT_SUPPLEMENTS = ["Folic acid", "Vitamin D", "Iron", "Iodine", "Omega-3 (DHA)", "Magnesium"];

/* ------------------- Symptoms ------------------- */

export const PREGNANCY_SYMPTOMS = [
  "Nausea",
  "Vomiting",
  "Heartburn",
  "Swelling",
  "Back pain",
  "Pelvic pain",
  "Braxton Hicks",
  "Cramping",
  "Constipation",
  "Dizziness",
  "Headache",
  "Shortness of breath",
  "Insomnia",
  "Fatigue",
  "Round ligament pain",
];

export const POSTPARTUM_SYMPTOMS = [
  "Afterpains / uterine cramps",
  "Abdominal pain",
  "Pelvic pain",
  "Perineal pain",
  "C-section incision pain",
  "Back pain",
  "Breast pain",
  "Nipple pain",
  "Breast engorgement",
  "Blocked duct",
  "Bleeding / lochia",
  "Heavy bleeding",
  "Blood clots",
  "Swelling",
  "Headache",
  "Dizziness",
  "Fever",
  "Chills",
  "Fatigue",
  "Constipation",
  "Hemorrhoids",
  "Painful urination",
  "Urinary leakage",
  "Shortness of breath",
  "Nausea",
  "Insomnia",
];

export const POSTPARTUM_MOODS = ["Calm", "Happy", "Overwhelmed", "Anxious", "Tearful", "Numb", "Irritable", "Proud"];

export { addDays, daysBetween, fromKey, toKey, todayKey };
