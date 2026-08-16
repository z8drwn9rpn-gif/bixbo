import { describe, expect, it } from "bun:test";

import { PAIN_COLOR_HEX, painColor } from "../domain/pain";

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
