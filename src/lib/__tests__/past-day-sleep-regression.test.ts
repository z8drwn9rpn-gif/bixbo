import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selected-date sleep logging", () => {
  it("opens the direct Sleep editor for the currently selected calendar day", () => {
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

    expect(home).toContain('label="Sleep"');
    expect(home).toContain('setQuickCat("temp")');
    expect(home).toContain("setLogOpen(true)");
    expect(home).not.toContain("if (selected !== todayKey())");
  });
});
