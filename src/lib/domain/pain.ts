/** Pain-domain calculations. Persisted data remains owned by storage.ts. */
export type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };
export type PainDayLike = { pain?: PainEntryLike[] };

/**
 * Canonical Pain scale colours at every 0.5 step.
 * Whole-number entries keep the established green → yellow → orange → red
 * BIXBO scale used by the Month Calendar. Half steps are direct sRGB midpoints
 * between their neighbouring whole values. No pink/magenta is introduced into
 * the Pain scale; purple remains reserved for Period/prediction UI.
 */
export const PAIN_SCALE_HALF_STEP_COLORS = [
  "#7FCF52", "#89CE4D", "#93CE48", "#A4D144", "#B4D43F",
  "#C4D53C", "#D3D638", "#E2D233", "#F0CF2E", "#F2C32E",
  "#F5B72D", "#F5A831", "#F59A35", "#F28936", "#EF7838",
  "#EC693C", "#E95A3F", "#E24C41", "#DC3F43", "#D23741",
  "#C82F3F",
] as const;

/** Concrete whole-number colours for PDF/export surfaces that cannot use CSS variables. */
export const PAIN_COLOR_HEX = [
  PAIN_SCALE_HALF_STEP_COLORS[0], PAIN_SCALE_HALF_STEP_COLORS[2], PAIN_SCALE_HALF_STEP_COLORS[4],
  PAIN_SCALE_HALF_STEP_COLORS[6], PAIN_SCALE_HALF_STEP_COLORS[8], PAIN_SCALE_HALF_STEP_COLORS[10],
  PAIN_SCALE_HALF_STEP_COLORS[12], PAIN_SCALE_HALF_STEP_COLORS[14], PAIN_SCALE_HALF_STEP_COLORS[16],
  PAIN_SCALE_HALF_STEP_COLORS[18], PAIN_SCALE_HALF_STEP_COLORS[20],
] as const;

/** Keep calculated Pain values on the same 0.5-step scale used by logging. */
export function snapPainScore(score: number): number {
  const clamped = Math.max(0, Math.min(10, Number.isFinite(score) ? score : 0));
  return Math.round(clamped * 2) / 2;
}

/** Average Pain values and keep the result on the canonical half-step scale. */
export function averagePainScores(values: number[]): number | undefined {
  const finite = values.filter(Number.isFinite).map(snapPainScore);
  if (!finite.length) return undefined;
  return snapPainScore(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

/** Returns the canonical concrete Pain scale colour for charts and SVG UI. */
export function painHexColor(score: number): string {
  const snapped = snapPainScore(score);
  return PAIN_SCALE_HALF_STEP_COLORS[Math.round(snapped * 2)];
}

/**
 * Use a concrete colour on every surface. MonthCalendar builds its satin ring
 * by parsing and shading this value, so returning a CSS var for whole numbers
 * would collapse those rings into invalid/black gradients.
 */
export function painColor(score: number): string {
  return painHexColor(score);
}

export function avgDayPain(log?: PainDayLike): number | undefined {
  const measurements = (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");
  return averagePainScores(measurements.map((entry) => entry.score));
}
