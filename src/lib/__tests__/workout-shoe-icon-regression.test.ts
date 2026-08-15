import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Workout shoe icon regression", () => {
  it("keeps Workout on the dedicated BIXBO shoe artwork through the production resolver", () => {
    const categories = readFileSync("src/features/logging/logCategories.ts", "utf8");
    const registry = readFileSync("src/lib/appRegistry.ts", "utf8");
    const extraIcons = readFileSync("src/components/icons/BixboExtraIcons.tsx", "utf8");
    const centralIcon = readFileSync("src/components/icons/BixboIcon.tsx", "utf8");
    const migrationPlugin = readFileSync("src/build/bixboIconMigrationPlugin.ts", "utf8");
    const log = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");

    expect(categories).toContain('{ id: "workout", label: "Workout", emoji: "👟"');
    expect(registry).toContain('{ id: "workout", label: "Workout", icon: "👟"');
    expect(registry).not.toContain('{ id: "workout", label: "Workout", icon: "🧘🏼‍♀️"');

    expect(extraIcons).toContain("function BixboShoeIcon");
    expect(extraIcons).toContain('["👟"]: BixboShoeIcon');
    expect(extraIcons).not.toContain('["👟"]: BixboWorkoutIcon');

    // Production transforms <Ico e=...> to the central resolver, so the shoe
    // must be handled there as well or Workout falls back to the note icon.
    expect(migrationPlugin).toContain('replaceAll("<Ico e=", "<BixboIcon emoji=")');
    expect(centralIcon).toContain("function WorkoutShoeIcon");
    expect(centralIcon).toContain('if (normalized === "👟") return WorkoutShoeIcon;');
    expect(centralIcon).toContain("WorkoutShoeIcon,");

    expect(log).toContain('<Ico e={c.id === "workout" ? "👟" : c.emoji} size={30} />');
  });
});
