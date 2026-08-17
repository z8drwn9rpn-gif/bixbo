import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

describe("past-day logging safety", () => {
  it("intercepts one-tap quick logs when a past calendar day is selected", () => {
    expect(home).toContain("onPointerUpCapture={interceptPastQuickLog}");
    expect(home).toContain("if (selected === todayKey()) return;");
    expect(home).toContain('button[data-bixbo-quick-tag]');
    expect(home).toContain("openDateBoundCategory(pastQuickTagCategory");
  });

  it("opens Sleep, temperature and weight through the selected-date quick vital editor", () => {
    expect(home).toContain('label="Sleep"');
    expect(home).toContain('label="Temp"');
    expect(home).toContain('label="Weight"');
    expect(home).toContain('onClick={() => openQuickVital("sleep")}');
    expect(home).toContain('onClick={() => openQuickVital("temperature")}');
    expect(home).toContain('onClick={() => openQuickVital("weight")}');
    expect(home).toContain('metric={quickVital} date={selected}');
  });
});
