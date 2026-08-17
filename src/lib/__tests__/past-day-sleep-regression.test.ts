import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selected-date sleep logging", () => {
  it("opens Body & Recovery for the currently selected calendar day", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const quickVital = readFileSync("src/components/home/QuickVitalSheet.tsx", "utf8");
    const root = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain('onClick={() => openQuickVital("sleep")}');
    expect(home).toContain('metric={quickVital} date={selected}');
    expect(quickVital).toContain('import { LogSheet } from "@/components/LogSheet"');
    expect(quickVital).toContain('initial="temp"');
    expect(quickVital).toContain('date={date}');
    expect(quickVital).not.toContain("updateDayLog(");
    expect(root).toContain('active === "temp" && <BodyRecoveryForm');
  });
});
