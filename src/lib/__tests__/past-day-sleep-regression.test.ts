import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("past-day sleep logging", () => {
  it("opens the date-bound Sleep editor for the selected calendar day", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain('setQuickCat("temp")');
    expect(home).toContain("setLogOpen(true)");
    expect(home).toContain("date={selected}");
  });
});
