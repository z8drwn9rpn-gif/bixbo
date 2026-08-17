import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Home vital logging entry points", () => {
  it("keeps Today Sleep, Temp and Weight as quick-entry shortcuts", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const quickVital = readFileSync("src/components/home/QuickVitalSheet.tsx", "utf8");

    expect(home).toContain('onClick={() => openQuickVital("sleep")}');
    expect(home).toContain('onClick={() => openQuickVital("temperature")}');
    expect(home).toContain('onClick={() => openQuickVital("weight")}');
    expect(home).toContain('metric={quickVital} date={selected}');
    expect(quickVital).toContain("updateDayLog(update, targetDate");
    expect(quickVital).toContain('metric === "sleep"');
    expect(quickVital).toContain('metric === "temperature"');
    expect(quickVital).toContain("weightEntries");
    expect(quickVital).not.toContain('initial="temp"');
  });

  it("opens Body & Recovery when the Temp / Sleep / Weight card is tapped in the overview", () => {
    const overview = readFileSync("src/components/home/DayOverview.tsx", "utf8");
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const root = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");

    expect(overview).toContain('<Card title="Temp / Sleep / Weight" icon="🌡️">');
    expect(overview).toContain('onClick={() => onEdit?.("temp", undefined)}');
    expect(wrapper).not.toContain('if (props.initial === "temp")');
    expect(wrapper).not.toContain("PastDaySleepSheet");
    expect(root).toContain('active === "temp" && <BodyRecoveryForm');
  });
});
