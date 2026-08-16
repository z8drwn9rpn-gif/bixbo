import { describe, expect, it } from "bun:test";

import { painColor } from "../domain/pain";

describe("painColor", () => {
  it("keeps whole-number pain colours on their canonical tokens", () => {
    for (let score = 0; score <= 10; score += 1) {
      expect(painColor(score)).toBe(`var(--pain-${score})`);
    }
  });

  it("gives every half-step a distinct vivid midpoint colour", () => {
    for (let lower = 0; lower < 10; lower += 1) {
      const half = lower + 0.5;
      expect(painColor(half)).toBe(
        `color-mix(in oklch, var(--pain-${lower}) 50%, var(--pain-${lower + 1}) 50%)`,
      );
      expect(painColor(half)).not.toBe(painColor(lower));
      expect(painColor(half)).not.toBe(painColor(lower + 1));
    }
  });

  it("keeps 7.5 visually distinct from both 7 and 8", () => {
    expect(painColor(7.5)).toBe("color-mix(in oklch, var(--pain-7) 50%, var(--pain-8) 50%)");
    expect(painColor(7.5)).not.toBe(painColor(8));
  });
});
