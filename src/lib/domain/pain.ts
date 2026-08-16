/** Pain-domain calculations. Persisted data remains owned by storage.ts. */
export type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };
export type PainDayLike = { pain?: PainEntryLike[] };

export function painColor(score: number): string {
  const clamped = Math.max(0, Math.min(10, Number.isFinite(score) ? score : 0));
  const snapped = Math.round(clamped * 2) / 2;

  // Whole-number colours are the canonical palette and must stay unchanged.
  if (Number.isInteger(snapped)) return `var(--pain-${snapped})`;

  // Half steps get their own vivid midpoint colour instead of rounding up to
  // the next integer (for example 7.5 must not look identical to 8).
  const lower = Math.floor(snapped);
  const upper = Math.ceil(snapped);
  return `color-mix(in oklch, var(--pain-${lower}) 50%, var(--pain-${upper}) 50%)`;
}

export function avgDayPain(log?: PainDayLike): number | undefined {
  const measurements = (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");
  if (!measurements.length) return undefined;
  const sum = measurements.reduce((total, entry) => total + entry.score, 0);
  return sum / measurements.length;
}
