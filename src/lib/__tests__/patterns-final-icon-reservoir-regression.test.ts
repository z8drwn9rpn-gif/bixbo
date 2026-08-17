import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const icons = readFileSync("src/components/icons/BixboExtraIcons.tsx", "utf8");
const cycle = readFileSync("src/features/patterns/PatternsCycleDashboard.tsx", "utf8");
const monthly = readFileSync("src/features/patterns/PatternsMonthlyDashboard.tsx", "utf8");
const treatment = readFileSync("src/features/patterns/PatternsTreatmentDashboard.tsx", "utf8");
const triggers = readFileSync("src/features/patterns/PatternsTriggersDashboard.tsx", "utf8");

describe("final Patterns semantic icons and filled trigger reservoirs", () => {
  it("routes requested BIXBO symbols before the generic icon fallback", () => {
    for (const token of ["🔅", "🧠", "💢", "🌡", "🫐", "🩸", "🔥", "💩", "👟", "🌻", "🌶", "☕", "✨", "⚡", "⭐"]) {
      expect(icons).toContain(`normalized.includes("${token}")`);
    }
    expect(icons).toContain("NORMALIZED_EXTRA_SYMBOL_ICONS");
    expect(icons).toContain("requestedPatternIcon(e)");
  });

  it("keeps blueberry for Pain & flow and red drops for flow values", () => {
    expect(cycle).toContain('<Ico e="🫐" size={28} />');
    expect(cycle).toContain('<Ico e="🩸" size={17} />');
    expect(cycle).toContain('<QuickItem icon="🩸"');
    expect(cycle).toContain('<SummaryTile icon="🩸"');
  });

  it("keeps the requested semantic icons throughout Monthly and Treatment", () => {
    for (const token of ['icon="🔅"', 'icon="🌡️"', 'icon="🧠"', 'icon="💢"', 'icon="✨"', 'icon="⚡"', 'icon="👟"', 'icon="🌻"', 'icon="🌶️"']) {
      expect(monthly).toContain(token);
    }
    expect(treatment).toContain('icon="🔥"');
    expect(treatment).toContain('icon="⚡"');
    expect(treatment).toContain('icon="✨"');
    expect(treatment).toContain('icon="🧠"');
  });

  it("uses semantic trigger icons and visibly filled SVG reservoirs", () => {
    expect(triggers).toContain('if (value.includes("panic")) return "✨";');
    expect(triggers).toContain('if (value.includes("headache")) return "🧠";');
    expect(triggers).toContain('if (value.includes("pressure")) return "💢";');
    expect(triggers).toContain('data-bixbo-chart-mark="bar"');
    expect(triggers).toContain('height={fillHeight}');
    expect(triggers).toContain('y={fillY}');
    expect(triggers).toContain('fill={color}');
    expect(triggers).not.toContain("pct * 0.78");
  });
});
