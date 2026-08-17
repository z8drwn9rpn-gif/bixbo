import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("date-selectable logging", () => {
  it("lets every detailed log category target an explicitly chosen date", () => {
    const source = readFileSync("src/components/LogSheet.tsx", "utf8");

    expect(source).toContain('const [targetDate, setTargetDate] = useState(props.date)');
    expect(source).toContain('<LogSheetRoot key={formKey} {...props} date={targetDate} />');
    expect(source).toContain('type="date"');
    expect(source).toContain('aria-label="Log date"');
    expect(source).toContain('setTargetDate(event.target.value)');
  });

  it("keeps Sleep on the dedicated date-bound editor", () => {
    const source = readFileSync("src/components/LogSheet.tsx", "utf8");
    expect(source).toContain('if (props.initial === "temp")');
    expect(source).toContain("<PastDaySleepSheet");
  });
});
