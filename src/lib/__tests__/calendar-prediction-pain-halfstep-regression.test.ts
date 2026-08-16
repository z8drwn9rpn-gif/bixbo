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

  it("removes a disproved prediction completely once its predicted start passed without a real period", () => {
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

  it("keeps the original Period + Pain composition from the Month Calendar", () => {
    const calendar = readFileSync("src/components/MonthCalendar.tsx", "utf8");
    expect(calendar).toContain("ringColor=pAvg!=null?calendarPainColor(pAvg):null");
    expect(calendar).toContain("showPredictionRing=predictedPeriod&&pAvg==null&&!periodColor");
    expect(calendar).toContain("var(--period-medium)");
  });
});

describe("Pain 0.5-step device rendering", () => {
  it("forces every intermediate Pain button to its true green/yellow/orange/red midpoint", () => {
    const css = readFileSync("src/device-rendering-fixes.css", "utf8");
    const expected = [
      ["0.5", "#89CE4D"],
      ["1.5", "#A4D144"],
      ["2.5", "#C4D53C"],
      ["3.5", "#E2D233"],
      ["4.5", "#F2C32E"],
      ["5.5", "#F5A831"],
      ["6.5", "#F28936"],
      ["7.5", "#EC693C"],
      ["8.5", "#E24C41"],
      ["9.5", "#D23741"],
    ] as const;

    for (const [score, color] of expected) {
      expect(css).toContain(`button[title^="${score} —"][aria-label^="${score} —"] { background: ${color} !important;`);
    }
    expect(css).toContain("forced-color-adjust: none !important");
    expect(css).toContain("no pink or magenta is introduced");
  });
});
