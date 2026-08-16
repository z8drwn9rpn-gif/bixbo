import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("bowel timeline readability regressions", () => {
  it("keeps a readable mobile chart and touch-friendly tooltip targets", () => {
    const source = readFileSync("src/features/insights/BowelTimelineChart.tsx", "utf8");

    expect(source).toContain("const width = 360;");
    expect(source).toContain("const height = 240;");
    expect(source).toContain('data-bowel-point-hit="true"');
    expect(source).toContain('r="14"');
    expect(source).toContain("InsightFloatingTooltip");
    expect(source).toContain("CHART_TICK_FONT_SIZE + 1.5");
  });

  it("uses exactly twelve month labels in year mode", () => {
    const source = readFileSync("src/features/insights/BowelTimelineChart.tsx", "utf8");

    expect(source).toContain('if (period === "Y")');
    expect(source).toContain("Array.from({ length: 12 }");
    expect(source).toContain('id: `month-${month}`');
  });
});
