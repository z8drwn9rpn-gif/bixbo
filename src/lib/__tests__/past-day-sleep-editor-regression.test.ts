import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("past-day Sleep logging", () => {
  it("routes a past selected date to a date-bound Sleep editor", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const editor = readFileSync("src/components/PastDaySleepSheet.tsx", "utf8");

    expect(wrapper).toContain('props.initial === "temp" && props.date !== todayKey()');
    expect(wrapper).toContain("date={props.date}");
    expect(editor).toContain("data.dayLogs[date]");
    expect(editor).toContain("updateDayLog(update, date");
    expect(editor).toContain("Logging for");
  });
});
