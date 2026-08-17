import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("past-day logging", () => {
  it("remounts LogSheet when the selected calendar date changes", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

    expect(wrapper).toContain("props.date");
    expect(wrapper).toContain("<LogSheetRoot key={formKey}");
    expect(home).toContain("date={selected}");
    expect(home).toContain("const openDateBoundCategory = (cat?: string) => {");
    expect(home).toContain("setQuickCat(cat)");
    expect(home).toContain("metric={quickVital} date={selected}");
  });
});
