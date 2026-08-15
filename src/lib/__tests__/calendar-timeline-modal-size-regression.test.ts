import { describe, expect, it } from "vitest";
import fs from "node:fs";

const calendar = fs.readFileSync("src/components/MonthCalendar.tsx", "utf8");

describe("calendar timeline modal sizing", () => {
  it("keeps long event/task timelines well below full-screen height on phones", () => {
    expect(calendar).toContain('max-h-[72dvh]');
    expect(calendar).toContain('sm:max-h-[76dvh]');
    expect(calendar).not.toContain('max-h-[calc(100dvh-40px)] w-full max-w-[370px]');
  });

  it("keeps the timeline body independently scrollable and the close control easy to tap", () => {
    expect(calendar).toContain('min-h-0 flex-1 overflow-y-auto overscroll-contain');
    expect(calendar).toContain('aria-label={t("Close")} className="grid h-11 w-11');
  });
});
