import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("past-day logging", () => {
  it("keeps general LogSheet and compact vital editors bound to the selected date", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const quickVital = readFileSync("src/components/home/QuickVitalSheet.tsx", "utf8");

    expect(wrapper).toContain("props.date");
    expect(wrapper).toContain("<LogSheetRoot key={formKey}");
    expect(home).toContain("date={selected}");
    expect(home).toContain("const openDateBoundCategory = (cat?: string) => {");
    expect(home).toContain("setQuickCat(cat)");
    expect(home).toContain('onClick={() => openQuickVital("sleep")}');
    expect(home).toContain('onClick={() => openQuickVital("temperature")}');
    expect(home).toContain('onClick={() => openQuickVital("weight")}');
    expect(quickVital).toContain("setTargetDate(date)");
    expect(quickVital).toContain("updateDayLog(update, targetDate");
  });
});
