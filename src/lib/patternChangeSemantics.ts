export type PatternChangeDirection = "higher-better" | "higher-worse" | "neutral";
export type PatternChangeTone = "good" | "bad" | "neutral";

export function changeToneFromDelta(
  delta: number | null | undefined,
  direction: PatternChangeDirection,
): PatternChangeTone {
  if (delta == null || !Number.isFinite(delta) || delta === 0 || direction === "neutral") return "neutral";
  const improved = direction === "higher-worse" ? delta < 0 : delta > 0;
  return improved ? "good" : "bad";
}

export function changeToneTextClass(tone: PatternChangeTone): string {
  // These colors carry analytical meaning. Keep them stronger than generic
  // foreground/bold rules so an improvement cannot regress to black text.
  if (tone === "good") return "font-bold !text-emerald-700 dark:!text-emerald-300";
  if (tone === "bad") return "font-bold !text-rose-600 dark:!text-rose-300";
  return "font-semibold text-muted-foreground";
}

export function outcomeChangeDirection(outcomeId: string): PatternChangeDirection {
  // Every built-in trigger outcome is an adverse symptom/event or an adverse
  // threshold (pain, low energy, negative mood, poor sleep, etc.). A higher
  // occurrence rate is therefore worse. Admin-defined outcomes remain neutral
  // because BIXBO cannot infer the user's desired direction safely.
  return outcomeId.startsWith("admin-") ? "neutral" : "higher-worse";
}
