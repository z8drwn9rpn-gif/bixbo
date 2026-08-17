import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const monthly = readFileSync("src/features/patterns/PatternsMonthlyDashboard.tsx", "utf8");
const cycle = readFileSync("src/features/patterns/PatternsCycleDashboard.tsx", "utf8");
const triggers = readFileSync("src/features/patterns/PatternsTriggersDashboard.tsx", "utf8");

describe("approved Patterns polish", () => {
  it("keeps one monthly summary and separates frequency from intensity", () => {
    expect(monthly).not.toContain('t("Monthly Summary")');
    expect(monthly).toContain('data-bixbo-chart-mark="intensity-point"');
    expect(monthly).toContain('icon="🧠"');
    expect(monthly).toContain('icon="💢"');
    expect(monthly).toContain('icon="🔅"');
    expect(monthly).toContain("function ConfidenceStar");
    expect(monthly).toContain('fill="#f6c945"');
  });

  it("lets Cycle move through period pairs and keeps flow labels intact", () => {
    expect(cycle).toContain("Compare periods");
    expect(cycle).toContain("phaseDays(selectedCycles)");
    expect(cycle).toContain('e="🩸"');
    expect(cycle).toContain('icon: "💢"');
    expect(cycle).toContain("whitespace-nowrap");
  });

  it("uses compact trigger reservoirs and a dedicated confidence star", () => {
    expect(triggers).toContain('h-24 w-[64px]');
    expect(triggers).toContain("function ConfidenceStar");
    expect(triggers).toContain("<SummaryItem star");
  });
});