export type CoupleSimilarityInput = {
  mySymptomDays: number;
  partnerSymptomDays: number;
  loggedComparisonDays: number;
  myPainAverage: number | null;
  partnerPainAverage: number | null;
  myPanicCount: number;
  partnerPanicCount: number;
  myTetanyCount: number;
  partnerTetanyCount: number;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Couple similarity is based only on days where at least one partner actually
 * logged a comparable symptom. Empty calendar days must never increase or
 * dilute similarity just because the selected month has 28–31 days.
 */
export function calculateCoupleSimilarity(input: CoupleSimilarityInput): number {
  if (input.loggedComparisonDays <= 0) return 0;

  const symptomDayGap =
    Math.abs(input.mySymptomDays - input.partnerSymptomDays) / Math.max(1, input.loggedComparisonDays);

  const painGap =
    input.myPainAverage == null || input.partnerPainAverage == null
      ? 0.5
      : Math.abs(input.myPainAverage - input.partnerPainAverage) / 10;

  const panicGap =
    Math.abs(input.myPanicCount - input.partnerPanicCount) /
    Math.max(1, input.myPanicCount, input.partnerPanicCount);

  const tetanyGap =
    Math.abs(input.myTetanyCount - input.partnerTetanyCount) /
    Math.max(1, input.myTetanyCount, input.partnerTetanyCount);

  return clampPercent((1 - (symptomDayGap + painGap + panicGap + tetanyGap) / 4) * 100);
}
