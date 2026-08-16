import { describe, expect, it } from "bun:test";

import { PAIN_SCALE_HALF_STEP_COLORS, averagePainScores, avgDayPain, painColor, painHexColor, snapPainScore } from "../domain/pain";

describe("painColor", () => {
  it("keeps the established whole-number green-to-red Pain colours", () => {
    const whole = ["#7FCF52", "#93CE48", "#B4D43F", "#D3D638", "#F0CF2E", "#F5B72D", "#F59A35", "#EF7838", "#E95A3F", "#DC3F43", "#C82F3F"];
    for (let score = 0; score <= 10; score += 1) {
      expect(painColor(score)).toBe(whole[score]);
      expect(painColor(score)).toBe(painHexColor(score));
      expect(painColor(score)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("gives each half-step the true midpoint between neighbouring whole colours", () => {
    expect(PAIN_SCALE_HALF_STEP_COLORS).toHaveLength(21);
    const expectedHalves = ["#89CE4D", "#A4D144", "#C4D53C", "#E2D233", "#F2C32E", "#F5A831", "#F28936", "#EC693C", "#E24C41", "#D23741"];
    for (let lower = 0; lower < 10; lower += 1) {
      const half = lower + 0.5;
      expect(painColor(half)).toBe(expectedHalves[lower]);
      expect(painColor(half)).toBe(painHexColor(half));
      expect(painColor(half)).not.toContain("color-mix");
      expect(painHexColor(half)).not.toBe(painHexColor(lower));
      expect(painHexColor(half)).not.toBe(painHexColor(lower + 1));
    }
  });

  it("keeps the high Pain range orange/red rather than pink", () => {
    expect(painHexColor(7)).toBe("#EF7838");
    expect(painColor(7.5)).toBe("#EC693C");
    expect(painHexColor(8)).toBe("#E95A3F");
    expect(painColor(8.5)).toBe("#E24C41");
    expect(painHexColor(9)).toBe("#DC3F43");
    expect(painColor(9.5)).toBe("#D23741");
    expect(painHexColor(10)).toBe("#C82F3F");
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
