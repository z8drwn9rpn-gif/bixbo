/** Pain-domain calculations. Persisted data remains owned by storage.ts. */
export type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };
export type PainDayLike = { pain?: PainEntryLike[] };

/**
 * Canonical Pain scale colours at every 0.5 step.
 * Whole-number entries exactly match --pain-0 … --pain-10 in theme-system.css.
 * Half steps deliberately use stronger saturated intermediate colours so
 * 7 / 7.5 / 8 (and every other neighbouring trio) stay easy to distinguish.
 * Concrete hex values also keep Calendar gradients, SVG charts, PDF and iOS/PWA
 * rendering on the same palette.
 */
export const PAIN_SCALE_HALF_STEP_COLORS = [
  "#7FCF52", "#82CA42", "#93CE48", "#A5CF33", "#B4D43F",
  "#CCD124", "#D3D638", "#EACA11", "#F0CF2E", "#F5B200",
  "#F5B72D", "#F68F02", "#F59A35", "#F56A41", "#EF7838",
  "#EF4E69", "#E95A3F", "#E53366", "#DC3F43", "#D31E4E",
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
