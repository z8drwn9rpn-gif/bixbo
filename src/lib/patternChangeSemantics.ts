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
  if (tone === "good") return "bixbo-pattern-tone-good font-bold";
  if (tone === "bad") return "bixbo-pattern-tone-bad font-bold";
  return "bixbo-pattern-tone-neutral font-semibold";
}

export function outcomeChangeDirection(outcomeId: string): PatternChangeDirection {
  // Built-in trigger outcomes are adverse symptoms/events or adverse thresholds:
  // higher occurrence is worse. Admin-defined outcomes remain neutral because
  // BIXBO cannot infer the user's intended direction safely.
  return outcomeId.startsWith("admin-") ? "neutral" : "higher-worse";
}
