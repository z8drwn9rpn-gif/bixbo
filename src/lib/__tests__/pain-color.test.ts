import { describe, expect, it } from "bun:test";

import { PAIN_SCALE_HALF_STEP_COLORS, painColor, painHexColor } from "../domain/pain";

describe("painColor", () => {
  it("keeps whole-number pain colours on their canonical tokens", () => {
    for (let score = 0; score <= 10; score += 1) {
      expect(painColor(score)).toBe(`var(--pain-${score})`);
    }
  });

  it("gives every half-step its own concrete colour without color-mix", () => {
    expect(PAIN_SCALE_HALF_STEP_COLORS).toHaveLength(21);
    for (let lower = 0; lower < 10; lower += 1) {
      const half = lower + 0.5;
      expect(painColor(half)).toBe(painHexColor(half));
      expect(painColor(half)).toMatch(/^#[0-9A-F]{6}$/);
      expect(painColor(half)).not.toContain("color-mix");
      expect(painHexColor(half)).not.toBe(painHexColor(lower));
      expect(painHexColor(half)).not.toBe(painHexColor(lower + 1));
    }
  });

  it("keeps 7.5 visibly distinct from both 7 and 8", () => {
    expect(painColor(7.5)).toBe("#EC693C");
    expect(painHexColor(7)).toBe("#EF7838");
    expect(painHexColor(8)).toBe("#E95A3F");
  });

  it("snaps chart colours to the same half-step palette", () => {
    expect(painHexColor(4.24)).toBe(painHexColor(4));
    expect(painHexColor(4.26)).toBe(painHexColor(4.5));
    expect(painHexColor(99)).toBe(painHexColor(10));
    expect(painHexColor(-5)).toBe(painHexColor(0));
  });
});
