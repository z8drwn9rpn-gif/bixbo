import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cycle = readFileSync("src/features/patterns/PatternsCycleDashboard.tsx", "utf8");
const icons = readFileSync("src/components/icons/BixboExtraIcons.tsx", "utf8");
const monthly = readFileSync("src/features/patterns/PatternsMonthlyDashboard.tsx", "utf8");
const triggers = readFileSync("src/features/patterns/PatternsTriggersDashboard.tsx", "utf8");

describe("Patterns approved dual-cycle comparison and icon system", () => {
  it("shows both selected periods as separate cards and compares phases between them", () => {
    expect(cycle).toContain("function MonthSummaryCard");
    expect(cycle).toContain("function PhaseComparisonCard");
    expect(cycle).toContain("cycleViews.map");
    expect(cycle).toContain("Compare periods");
    expect(cycle).toContain('e="🫐"');
    expect(cycle).toContain('e="🩸"');
  });

  it("maps requested Patterns symbols to dedicated BIXBO icons instead of fallback notes", () => {
    expect(icons).toContain('["🔥"]: BixboFireIcon');
    expect(icons).toContain('["🫐"]: BixboBlueberryIcon');
    expect(icons).toContain('["🌶️"]: BixboChiliIcon');
    expect(icons).toContain('["💩"]: BixboPoopEyesIcon');
    expect(icons).toContain('["☕"]: BixboCoffeeIcon');
    expect(icons).toContain('["⭐"]: BixboStarIcon');
    expect(icons).toContain('["✨"]: BixboSparklesIcon');
  });

  it("keeps the requested Monthly and Trigger icon assignments", () => {
    expect(monthly).toContain('icon="🔅"');
    expect(monthly).toContain('icon="🧠"');
    expect(monthly).toContain('icon="💢"');
    expect(monthly).toContain('icon="👟"');
    expect(triggers).toContain('icon="🎯"');
    expect(triggers).toContain('return "☕"');
    expect(triggers).toContain('return "⚡"');
  });
});
