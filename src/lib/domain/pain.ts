/** Pain-domain calculations. Persisted data remains owned by storage.ts. */
export type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };
export type PainDayLike = { pain?: PainEntryLike[] };

/**
 * Canonical 0–10 palette. These must match the --pain-* theme tokens so whole
 * scores keep their established colour everywhere in the app.
 */
export const PAIN_COLOR_HEX = [
  "#72c64a", "#91cd3a", "#b7d12f", "#dfd11f", "#f3c30d", "#f5a20b",
  "#f47b16", "#f05c5f", "#ec3f74", "#de2557", "#c81746",
] as const;

/**
 * Precomputed 50/50 OKLCH blends for 0.5, 1.5 … 9.5.
 *
 * Keeping the blends as solid sRGB colours makes them render identically in
 * normal UI, SVG charts, print/PDF rendering and installed iOS web apps.
 */
const PAIN_HALF_STEP_HEX = [
  "#82ca42", "#a5cf33", "#ccd124", "#eaca11", "#f5b200",
  "#f68f02", "#f56a41", "#ef4e69", "#e53366", "#d31e4e",
] as const;

export function painColor(score: number): string {
  const clamped = Math.max(0, Math.min(10, Number.isFinite(score) ? score : 0));
  const snapped = Math.round(clamped * 2) / 2;

  // Whole-number colours are the canonical palette and must stay unchanged.
  if (Number.isInteger(snapped)) return PAIN_COLOR_HEX[snapped];

  // Half steps get their own vivid midpoint colour instead of rounding up to
  // the next integer (for example 7.5 must not look identical to 8).
  return PAIN_HALF_STEP_HEX[Math.floor(snapped)];
}

export function avgDayPain(log?: PainDayLike): number | undefined {
  const measurements = (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");
  if (!measurements.length) return undefined;
  const sum = measurements.reduce((total, entry) => total + entry.score, 0);
  return sum / measurements.length;
}
