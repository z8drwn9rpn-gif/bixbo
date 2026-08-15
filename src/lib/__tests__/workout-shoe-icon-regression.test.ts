import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Workout shoe icon regression", () => {
  it("keeps Workout on the dedicated BIXBO shoe artwork", () => {
    const categories = readFileSync("src/features/logging/logCategories.ts", "utf8");
    const icons = readFileSync("src/components/icons/BixboExtraIcons.tsx", "utf8");

    expect(categories).toContain('{ id: "workout", label: "Workout", emoji: "👟"');
    expect(icons).toContain("function BixboShoeIcon");
    expect(icons).toContain('["👟"]: BixboShoeIcon');
    expect(icons).not.toContain('["👟"]: BixboWorkoutIcon');
  });
});
