import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cycle = readFileSync("src/features/patterns/PatternsCycleDashboard.tsx", "utf8");
const monthly = readFileSync("src/features/patterns/PatternsMonthlyDashboard.tsx", "utf8");
const treatment = readFileSync("src/features/patterns/PatternsTreatmentDashboard.tsx", "utf8");
const triggers = readFileSync("src/features/patterns/PatternsTriggersDashboard.tsx", "utf8");
const icons = readFileSync("src/components/icons/BixboExtraIcons.tsx", "utf8");

describe("final Patterns icon and trigger polish", () => {
  it("keeps the requested semantic icons across Patterns", () => {
    expect(cycle).toContain('icon: "💩"');
    expect(cycle).toContain('icon: "💢"');
    expect(cycle).toContain('icon: "🌡️"');
    expect(cycle).toContain('<Ico e="🫐" size={28}');
    expect(cycle).toContain('icon="🔥"');
    expect(cycle).toContain('icon="🩸"');
    expect(icons).toContain('["💩"]: BixboPoopEyesIcon');
    expect(icons).toContain('["🔥"]: BixboFireIcon');
    expect(icons).toContain('["🫐"]: BixboBlueberryIcon');
    expect(icons).toContain('["🩸"]: BixboBloodDropIcon');
    expect(icons).toContain('headache: "🧠"');
    expect(icons).toContain('pressure: "💢"');
    expect(icons).toContain('panic: "✨"');
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

  it("keeps period flow inside the Cycle comparison cards", () => {
    expect(cycle).toContain("function MonthSummaryCard");
    expect(cycle).toContain("max-w-[88px]");
    expect(cycle).toContain("truncate text-[10px]");
    expect(cycle).toContain('e="🩸"');
    expect(cycle).toContain("normalizedFlow");
  });

  it("matches the approved Trigger comparison iconography and filled reservoirs", () => {
    expect(triggers).toContain("function PurpleTargetIcon");
    expect(triggers).toContain("function CaffeineCupIcon");
    expect(triggers).toContain('if (value.includes("panic")) return "✨"');
    expect(triggers).toContain('if (value.includes("headache")) return "🧠"');
    expect(triggers).toContain('if (value.includes("pressure")) return "💢"');
    expect(triggers).toContain("iconForTrigger(selectedTriggerLabel)");
    expect(triggers).toContain('SummaryItem icon="🎯"');
    expect(triggers).toContain('SummaryItem icon="👤"');
    expect(triggers).toContain('SummaryItem icon="👥"');
    expect(triggers).toContain("const bottomDisplay = `${pct.toFixed(0)}%`");
    expect(triggers).toContain("const fillHeight = pct === 0 ? 4 : Math.max(8, pct)");
    expect(triggers).toContain('height: pct === 0 ? "4px" : `${fillHeight}%`');
    expect(triggers).toContain("saturate(1.85)");
  });
});
