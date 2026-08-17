import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selected-date Sleep logging", () => {
  it("routes any selected date to the editable date-bound Sleep editor", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const editor = readFileSync("src/components/PastDaySleepSheet.tsx", "utf8");

    expect(wrapper).toContain('if (props.initial === "temp")');
    expect(wrapper).not.toContain('props.date !== todayKey()');
    expect(wrapper).toContain("date={props.date}");
    expect(editor).toContain("const [targetDate, setTargetDate] = useState(date)");
    expect(editor).toContain("data.dayLogs[targetDate]");
    expect(editor).toContain("updateDayLog(update, targetDate");
    expect(editor).toContain('type="date"');
    expect(editor).toContain("value={targetDate}");
    expect(editor).toContain("Logging for");
  });
});
