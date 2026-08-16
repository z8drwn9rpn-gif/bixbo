import { describe, expect, it } from "bun:test";

import { PAIN_COLOR_HEX, averagePainScores, avgDayPain, painColor, snapPainScore } from "../domain/pain";

describe("painColor", () => {
  it("keeps whole-number pain colours unchanged", () => {
    for (let score = 0; score <= 10; score += 1) {
      expect(painColor(score)).toBe(PAIN_COLOR_HEX[score]);
    }
  });

  it("gives every half-step a distinct vivid midpoint colour", () => {
    const midpointColors = [
      "#82ca42", "#a5cf33", "#ccd124", "#eaca11", "#f5b200",
      "#f68f02", "#f56a41", "#ef4e69", "#e53366", "#d31e4e",
    ];
    for (let lower = 0; lower < 10; lower += 1) {
      const half = lower + 0.5;
      expect(painColor(half)).toBe(midpointColors[lower]);
      expect(painColor(half)).not.toBe(painColor(lower));
      expect(painColor(half)).not.toBe(painColor(lower + 1));
    }
  });

  it("keeps 7.5 visually distinct from both 7 and 8", () => {
    expect(painColor(7.5)).toBe("#ef4e69");
    expect(painColor(7.5)).not.toBe(painColor(8));
  });
});

describe("half-step pain calculations", () => {
  it("snaps calculations to the same 0.5 scale instead of whole numbers", () => {
    expect(snapPainScore(7.5)).toBe(7.5);
    expect(snapPainScore(7.25)).toBe(7.5);
    expect(snapPainScore(7.1)).toBe(7);
  });

  it("keeps aggregate pain on half steps so Month, Couple and Insights use the matching colour", () => {
    expect(averagePainScores([7, 7.5])).toBe(7.5);
    expect(avgDayPain({ pain: [{ score: 7 }, { score: 7.5 }] })).toBe(7.5);
    expect(painColor(avgDayPain({ pain: [{ score: 7 }, { score: 7.5 }] })!)).toBe(painColor(7.5));
  });

  it("ignores symptom-update rows when computing the day pain value", () => {
    expect(avgDayPain({ pain: [{ score: 7.5 }, { score: 10, entryKind: "symptom-update" }] })).toBe(7.5);
  });
});
