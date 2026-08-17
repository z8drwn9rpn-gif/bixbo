import { describe, expect, it } from "vitest";

import {
  packTimelineDays,
  shouldShowPainPointLabel,
  timelineDayContentCost,
  timelineScheduledMedicationLabel,
} from "../../components/health-report/HealthReportPdfParts";
import { summarizeReportDay } from "../healthReport";

describe("PDF health report audit regressions", () => {
  it("prints only actually selected items for a partial grouped scheduled dose", () => {
    expect(
      timelineScheduledMedicationLabel(
        "Omega-3 2x, železo",
        ["Omega-3 2x", "železo"],
        ["železo"],
      ),
    ).toBe("železo");

    expect(
      timelineScheduledMedicationLabel(
        "Omega-3 2x, železo",
        ["Omega-3 2x", "železo"],
        ["Omega-3 2x", "železo"],
      ),
    ).toBe("Omega-3 2x, železo");
  });

  it("keeps all pain point labels for short reports but samples long reports", () => {
    expect(shouldShowPainPointLabel(30, 7, 3, false)).toBe(true);
    expect(shouldShowPainPointLabel(90, 1, 9, false)).toBe(false);
    expect(shouldShowPainPointLabel(90, 18, 9, false)).toBe(true);
    expect(shouldShowPainPointLabel(90, 89, 9, true)).toBe(true);
  });

  it("packs long/high-content timeline days more conservatively without changing table styling", () => {
    const shortDays = Array.from({ length: 10 }, (_, index) => summarizeReportDay(`2026-08-${String(index + 1).padStart(2, "0")}`, {
      sleepHours: 8,
    }));
    expect(shortDays.every((day) => timelineDayContentCost(day) === 1)).toBe(true);
    expect(packTimelineDays(shortDays)).toHaveLength(1);

    const longDay = summarizeReportDay("2026-08-11", { sleepHours: 8 }, "x".repeat(4000));
    const mixed = [longDay, ...shortDays.slice(0, 9)];
    expect(timelineDayContentCost(longDay)).toBe(4);
    expect(packTimelineDays(mixed).length).toBeGreaterThan(1);
    expect(packTimelineDays(mixed).flat().map((day) => day.key)).toEqual(mixed.map((day) => day.key));
  });
});
