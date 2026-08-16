/** Pain-domain calculations. Persisted data remains owned by storage.ts. */
export type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };
export type PainDayLike = { pain?: PainEntryLike[] };

/**
 * Canonical Pain scale colours at every 0.5 step.
 * Whole-number entries exactly match --pain-0 … --pain-10 in theme-system.css.
 * Half steps are the direct sRGB midpoint between their two neighbouring whole
 * values: existing 0…10 colours never move, only the new .5 values sit between
 * them. Concrete hex values keep Calendar gradients, charts, PDF and iOS/PWA
 * rendering on the same palette.
 */
export const PAIN_SCALE_HALF_STEP_COLORS = [
  "#72C64A", "#82CA42", "#91CD3A", "#A4CF34", "#B7D12F",
  "#CBD127", "#DFD11F", "#E9CA16", "#F3C30D", "#F4B20C",
  "#F5A20B", "#F48E10", "#F47B16", "#F26C3A", "#F05C5F",
  "#EE4E6A", "#EC3F74", "#E53266", "#DE2557", "#D31E4E",
  "#C81746",
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
