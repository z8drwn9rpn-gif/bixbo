/** Pain-domain calculations. Persisted data remains owned by storage.ts. */
export type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };
export type PainDayLike = { pain?: PainEntryLike[] };

/**
 * Canonical Pain scale colours at every 0.5 step.
 * Whole-number entries exactly match --pain-0 … --pain-10 in theme-system.css.
 * Half steps are explicit hex values so iOS/PWA rendering never depends on
 * CSS color-mix support and 7.5 can never collapse visually into 7 or 8.
 */
export const PAIN_SCALE_HALF_STEP_COLORS = [
  "#7FCF52", "#89CE4D", "#93CE48", "#A4D144", "#B4D43F",
  "#C4D53C", "#D3D638", "#E2D233", "#F0CF2E", "#F2C32E",
  "#F5B72D", "#F5A831", "#F59A35", "#F28936", "#EF7838",
  "#EC693C", "#E95A3F", "#E24C41", "#DC3F43", "#D23741",
  "#C82F3F",
] as const;

function snapPainHalfStep(score: number): number {
  const clamped = Math.max(0, Math.min(10, Number.isFinite(score) ? score : 0));
  return Math.round(clamped * 2) / 2;
}

/** Returns the canonical concrete Pain scale colour for charts and SVG UI. */
export function painHexColor(score: number): string {
  const snapped = snapPainHalfStep(score);
  return PAIN_SCALE_HALF_STEP_COLORS[Math.round(snapped * 2)];
}

export function painColor(score: number): string {
  const snapped = snapPainHalfStep(score);

  // Whole-number colours stay on their canonical theme tokens.
  if (Number.isInteger(snapped)) return `var(--pain-${snapped})`;

  // Half steps use explicit colours rather than color-mix so they render
  // identically in Safari/PWA and remain visibly distinct from both neighbours.
  return painHexColor(snapped);
}

export function avgDayPain(log?: PainDayLike): number | undefined {
  const measurements = (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");
  if (!measurements.length) return undefined;
  const sum = measurements.reduce((total, entry) => total + entry.score, 0);
  return sum / measurements.length;
}
