import { describe, expect, it } from "bun:test";

import { calculateCoupleSimilarity } from "../coupleSimilarity";

describe("Couple similarity", () => {
  it("uses only logged comparison days instead of the full calendar month", () => {
    const score = calculateCoupleSimilarity({
      mySymptomDays: 2,
      partnerSymptomDays: 1,
      loggedComparisonDays: 2,
      myPainAverage: 4,
      partnerPainAverage: 4,
      myPanicCount: 0,
      partnerPanicCount: 0,
      myTetanyCount: 0,
      partnerTetanyCount: 0,
    });

    // Symptom-day gap is 1 / 2 logged days, not 1 / 31 calendar days.
    expect(score).toBe(87.5);
  });

  it("returns zero when neither partner logged a comparable symptom day", () => {
    expect(
      calculateCoupleSimilarity({
        mySymptomDays: 0,
        partnerSymptomDays: 0,
        loggedComparisonDays: 0,
        myPainAverage: null,
        partnerPainAverage: null,
        myPanicCount: 0,
        partnerPanicCount: 0,
        myTetanyCount: 0,
        partnerTetanyCount: 0,
      }),
    ).toBe(0);
  });
});
