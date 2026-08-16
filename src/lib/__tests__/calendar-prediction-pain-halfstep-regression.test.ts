import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

import { sanitizePeriodPredictions } from "../domain/cyclePredictions";

describe("display-safe period predictions", () => {
  it("stops the last real period at its recorded end instead of painting typical-length overhang", () => {
    const result = sanitizePeriodPredictions(
      { lastPeriodStart: "2026-08-01", lastPeriodEnd: "2026-08-03" },
      [
        { start: "2026-08-01", end: "2026-08-05" },
        { start: "2026-08-29", end: "2026-09-02" },
      ],
      "2026-08-16",
    );

    expect(result).toEqual([
      { start: "2026-08-01", end: "2026-08-03" },
      { start: "2026-08-29", end: "2026-09-02" },
    ]);
  });

  it("removes an AI prediction completely once its predicted start passed without a real period", () => {
    const result = sanitizePeriodPredictions(
      { lastPeriodStart: "2026-07-01", lastPeriodEnd: "2026-07-04" },
      [
        { start: "2026-07-01", end: "2026-07-05" },
        { start: "2026-08-14", end: "2026-08-18" },
        { start: "2026-09-11", end: "2026-09-15" },
      ],
      "2026-08-16",
    );

    expect(result).toEqual([
      { start: "2026-07-01", end: "2026-07-04" },
      { start: "2026-09-11", end: "2026-09-15" },
    ]);
  });

  it("routes storage consumers through the display-safe predictor", () => {
    const barrel = readFileSync("src/lib/storage.ts", "utf8");
    expect(barrel).toContain('predictPeriodsForDisplay as predictPeriods');
  });

  it("keeps actual and predicted Period purple even when Pain is logged on the same day", () => {
    const calendar = readFileSync("src/components/MonthCalendar.tsx", "utf8");
    expect(calendar).toContain("ringColor=pAvg!=null&&!periodColor&&!predictedPeriod?calendarPainColor(pAvg):null");
    expect(calendar).toContain("showPredictionRing=predictedPeriod&&!periodColor");
    expect(calendar).toContain("var(--period-medium)");
  });
});

describe("Pain 0.5-step device rendering", () => {
  it("forces every intermediate Pain button to its canonical concrete colour", () => {
    const css = readFileSync("src/device-rendering-fixes.css", "utf8");
    const expected = [
      ["0.5", "#82CA42"],
      ["1.5", "#A5CF33"],
      ["2.5", "#CCD124"],
      ["3.5", "#EACA11"],
      ["4.5", "#F5B200"],
      ["5.5", "#F68F02"],
      ["6.5", "#F56A41"],
      ["7.5", "#EF4E69"],
      ["8.5", "#E53366"],
      ["9.5", "#D31E4E"],
    ] as const;

    for (const [score, color] of expected) {
      expect(css).toContain(`button[title^="${score} —"][aria-label^="${score} —"] { background: ${color} !important;`);
    }
    expect(css).toContain("forced-color-adjust: none !important");
  });
});
