import { describe, expect, it } from "bun:test";

import { PAIN_SCALE_HALF_STEP_COLORS, averagePainScores, avgDayPain, painColor, painHexColor, snapPainScore } from "../domain/pain";

describe("painColor", () => {
  it("keeps every original whole-number Pain color unchanged", () => {
    const whole = ["#72C64A", "#91CD3A", "#B7D12F", "#DFD11F", "#F3C30D", "#F5A20B", "#F47B16", "#F05C5F", "#EC3F74", "#DE2557", "#C81746"];
    for (let score = 0; score <= 10; score += 1) {
      expect(painColor(score)).toBe(whole[score]);
      expect(painColor(score)).toBe(painHexColor(score));
      expect(painColor(score)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("gives each half-step the true midpoint between neighbouring whole colors", () => {
    expect(PAIN_SCALE_HALF_STEP_COLORS).toHaveLength(21);
    const expectedHalves = ["#82CA42", "#A4CF34", "#CBD127", "#E9CA16", "#F4B20C", "#F48E10", "#F26C3A", "#EE4E6A", "#E53266", "#D31E4E"];
    for (let lower = 0; lower < 10; lower += 1) {
      const half = lower + 0.5;
      expect(painColor(half)).toBe(expectedHalves[lower]);
      expect(painColor(half)).toBe(painHexColor(half));
      expect(painColor(half)).not.toContain("color-mix");
      expect(painHexColor(half)).not.toBe(painHexColor(lower));
      expect(painHexColor(half)).not.toBe(painHexColor(lower + 1));
    }
  });

  it("keeps 7.5 between the unchanged 7 and 8 colors", () => {
    expect(painHexColor(7)).toBe("#F05C5F");
    expect(painColor(7.5)).toBe("#EE4E6A");
    expect(painHexColor(8)).toBe("#EC3F74");
  });

  it("snaps chart colours to the same half-step palette", () => {
    expect(painHexColor(4.24)).toBe(painHexColor(4));
    expect(painHexColor(4.26)).toBe(painHexColor(4.5));
    expect(painHexColor(99)).toBe(painHexColor(10));
    expect(painHexColor(-5)).toBe(painHexColor(0));
  });
});

describe("half-step pain calculations", () => {
  it("keeps calculated values on the 0.5 scale instead of rounding to whole numbers", () => {
    expect(snapPainScore(7.5)).toBe(7.5);
    expect(snapPainScore(7.25)).toBe(7.5);
    expect(snapPainScore(7.1)).toBe(7);
  });

  it("keeps aggregate pain on half steps for Month, Couple and Insights", () => {
    expect(averagePainScores([7, 7.5])).toBe(7.5);
    const dayAverage = avgDayPain({ pain: [{ score: 7 }, { score: 7.5 }] });
    expect(dayAverage).toBe(7.5);
    expect(painColor(dayAverage!)).toBe(painColor(7.5));
  });

  it("ignores symptom-update rows when computing the day pain value", () => {
    expect(avgDayPain({ pain: [{ score: 7.5 }, { score: 10, entryKind: "symptom-update" }] })).toBe(7.5);
  });
});
