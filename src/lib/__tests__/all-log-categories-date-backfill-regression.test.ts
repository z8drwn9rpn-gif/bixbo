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

  it("keeps Sleep, Temp and Weight in the canonical date-bound Body & Recovery editor", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const quickVital = readFileSync("src/components/home/QuickVitalSheet.tsx", "utf8");
    const root = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");

    expect(wrapper).not.toContain("PastDaySleepSheet");
    expect(wrapper).not.toContain('if (props.initial === "temp")');
    expect(quickVital).toContain('initial="temp"');
    expect(quickVital).toContain('date={date}');
    expect(root).toContain('active === "temp" && <BodyRecoveryForm');
  });
});
