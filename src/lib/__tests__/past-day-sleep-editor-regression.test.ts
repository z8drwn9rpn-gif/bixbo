import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("selected-date Body & Recovery logging", () => {
  it("routes temp, sleep and weight logging through the canonical date-bound Body & Recovery form", () => {
    const wrapper = readFileSync("src/components/LogSheet.tsx", "utf8");
    const root = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");

    expect(wrapper).not.toContain("PastDaySleepSheet");
    expect(wrapper).not.toContain('if (props.initial === "temp")');
    expect(wrapper).toContain("<LogSheetRoot key={formKey} {...props} date={targetDate} />");
    expect(root).toContain("function BodyRecoveryForm");
    expect(root).toContain('active === "temp" && <BodyRecoveryForm');
    expect(root).toContain('setMode("body")');
    expect(root).toContain('setMode("recovery")');
    expect(root).toContain('t("Temp / Sleep / Weight")');
    expect(root).toContain('t("Heat / Cold / TENS")');
  });
});
