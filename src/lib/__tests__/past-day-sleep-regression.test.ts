import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selected-date sleep logging", () => {
  it("opens the direct Sleep editor for the currently selected calendar day", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const quickVital = readFileSync("src/components/home/QuickVitalSheet.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain('onClick={() => openQuickVital("sleep")}');
    expect(home).toContain('metric={quickVital} date={selected}');
    expect(quickVital).toContain("const [targetDate, setTargetDate] = useState(date)");
    expect(quickVital).toContain("updateDayLog(update, targetDate");
  });
});
