import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("past-day sleep logging", () => {
  it("opens Body & Recovery for Sleep when a past calendar day is selected", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain("if (selected !== todayKey())");
    expect(home).toContain('setQuickCat("temp")');
    expect(home).toContain("setLogOpen(true)");
  });
});
