import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("unified Bowel overview card", () => {
  it("keeps one Bowel analytics card instead of a duplicate timeline plus distribution chart", () => {
    const route = readFileSync("src/routes/insights.tsx", "utf8");
    const source = readFileSync("src/features/insights/BowelOverviewCard.tsx", "utf8");

    expect(route).toContain("BowelOverviewCard");
    expect(route).not.toContain("BowelTimelineChart");
    expect(route).not.toContain("<BristolChart");
    expect(source).toContain('data-bowel-overview-card="true"');
    expect(source).toContain("Distribution of logged bowel types");
    expect(source).toContain("Quick insights");
    expect(source).toContain("Latest entries");
  });

  it("keeps T0 separate from no-bowel-movement days", () => {
    const source = readFileSync("src/features/insights/BowelOverviewCard.tsx", "utf8");

    expect(source).toContain('if (type === 0) return "Unknown / mixed";');
    expect(source).toContain("noBowelMovementCount");
    expect(source).toContain("Type 0 is a logged unknown or mixed bowel value; no bowel movement is counted separately.");
  });

  it("keeps the mockup interactions: period switcher, tappable bars, filters and latest entries", () => {
    const source = readFileSync("src/features/insights/BowelOverviewCard.tsx", "utf8");

    expect(source).toContain("InsightPeriodControl");
    expect(source).toContain("InsightFloatingTooltip");
    expect(source).toContain("setFilterType");
    expect(source).toContain("setShowAll");
  });

  it("uses period as a time-window word in Bowel quick insights, not the Blueberry brand", () => {
    const source = readFileSync("src/features/insights/BowelOverviewCard.tsx", "utf8");
    const i18n = readFileSync("src/hooks/useI18n.ts", "utf8");

    expect(source).toContain('t("Typical range this period")');
    expect(i18n).toContain('"Typical range this period"');
    expect(i18n).toContain("NON_BLUEBERRY_PERIOD_COPY.has(key)");
  });
});
