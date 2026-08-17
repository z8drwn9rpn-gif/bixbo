import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cycle = readFileSync("src/features/patterns/PatternsCycleDashboard.tsx", "utf8");
const monthly = readFileSync("src/features/patterns/PatternsMonthlyDashboard.tsx", "utf8");
const treatment = readFileSync("src/features/patterns/PatternsTreatmentDashboard.tsx", "utf8");
const triggers = readFileSync("src/features/patterns/PatternsTriggersDashboard.tsx", "utf8");

describe("final Patterns icon and trigger polish", () => {
  it("keeps the requested semantic icons across Patterns", () => {
    expect(cycle).toContain("BowelEyesIcon");
    expect(cycle).toContain('<Ico e="🔥"');
    expect(cycle).toContain('<Ico e="🫐"');
    expect(cycle).toContain('icon: "💢"');
    expect(cycle).toContain('icon: "🌡️"');
    expect(monthly).toContain('icon="🔅"');
    expect(monthly).toContain('icon="🧠"');
    expect(monthly).toContain('icon="💢"');
    expect(monthly).toContain('icon="👟"');
    expect(monthly).toContain('icon="🌻"');
    expect(monthly).toContain('icon="🌶️"');
    expect(treatment).toContain('icon="🔥"');
    expect(treatment).toContain('icon="⚡"');
    expect(treatment).toContain('icon="✨"');
    expect(treatment).toContain('icon="🧠"');
  });

  it("keeps period flow inside the Cycle phase cards", () => {
    expect(cycle).toContain("text-[8px]");
    expect(cycle).toContain("max-w-[52px]");
    expect(cycle).toContain("function FlowIcon");
  });

  it("matches the approved Trigger comparison iconography and reservoirs", () => {
    expect(triggers).toContain("function PurpleTargetIcon");
    expect(triggers).toContain("function CaffeineCupIcon");
    expect(triggers).toContain("iconForTrigger(selectedTriggerLabel)");
    expect(triggers).toContain('SummaryItem icon="🎯"');
    expect(triggers).toContain('SummaryItem icon="👤"');
    expect(triggers).toContain('SummaryItem icon="👥"');
    expect(triggers).toContain("const bottomDisplay = `${pct.toFixed(0)}%`");
    expect(triggers).toContain("const fillHeight = pct === 0 ? 4");
  });
});
