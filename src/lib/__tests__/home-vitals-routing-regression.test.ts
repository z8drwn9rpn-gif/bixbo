import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
const dayOverview = readFileSync("src/components/home/DayOverview.tsx", "utf8");

describe("Home vital shortcuts vs day overview routing", () => {
  it("keeps Sleep, Temp and Weight home tiles on their dedicated quick vital sheets", () => {
    expect(home).toContain('onClick={() => openQuickVital("sleep")}');
    expect(home).toContain('onClick={() => openQuickVital("temperature")}');
    expect(home).toContain('onClick={() => openQuickVital("weight")}');
    expect(home).toContain("<QuickVitalSheet");
    expect(home).toContain("metric={quickVital}");
    expect(home).toContain("date={selected}");
  });

  it("routes Temp / Sleep / Weight from the day overview into Body & Recovery", () => {
    expect(dayOverview).toContain('<Card title="Temp / Sleep / Weight"');
    expect(dayOverview).toContain('onClick={() => onEdit?.("temp", undefined)}');
    expect(home).toContain("<DayPreview");
    expect(home).toContain("onEdit={openEdit}");
    expect(home).toContain("setQuickCat(cat)");
    expect(home).toContain("<LogSheet");
    expect(home).toContain("initial={quickCat as never}");
  });
});
