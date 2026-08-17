import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("past-day Sleep logging", () => {
  it("routes direct Sleep logging to a date-bound editor", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const editor = readFileSync("src/components/PastDaySleepSheet.tsx", "utf8");

    expect(wrapper).toContain('if (props.initial === "temp")');
    expect(wrapper).toContain("date={props.date}");
    expect(editor).toContain("data.dayLogs[targetDate]");
    expect(editor).toContain("updateDayLog(update, targetDate");
    expect(editor).toContain("setTargetDate(date)");
    expect(editor).toContain("Logging for");
  });
});
