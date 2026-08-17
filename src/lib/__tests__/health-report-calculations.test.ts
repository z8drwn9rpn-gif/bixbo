import { describe, expect, it } from "vitest";
import {
  countRecordedPrnUses,
  firstRecordedScheduledMedicationDate,
  hasMeaningfulReportDay,
  paginateReportDays,
  reportPeriodLevel,
  summarizeReportDay,
} from "../healthReport";
import type { DayLog, Med, PainEntry } from "../storage";

const pain = (overrides: Partial<PainEntry> = {}): PainEntry => ({
  id: crypto.randomUUID(),
  time: "12:00",
  score: 0,
  parts: [],
  quality: [],
  symptoms: [],
  note: "",
  ...overrides,
});

describe("PDF health report calculations", () => {
  it("does not duplicate pain when Add symptoms creates a symptom-update", () => {
    const log: DayLog = {
      pain: [
        pain({ id: "real", score: 8 }),
        pain({ id: "follow-up", score: 8, entryKind: "symptom-update", sourcePainId: "real", nausea: true, nauseaSeverity: 6 }),
      ],
    };

    const day = summarizeReportDay("2026-08-16", log);
    expect(day.pain).toBe(8);
    expect(day.nausea).toBe(6);
  });

  it("keeps current intensity scales as stored without clipping panic or nausea to 5", () => {
    const log: DayLog = {
      panic: [{ id: "panic", time: "12:00", intensity: 9, physical: [], cognitive: [], trigger: "", hyperventilation: "no", tetanyPresent: false, helped: [] }],
      pain: [pain({ nausea: true, nauseaSeverity: 10 })],
      tetany: [{ id: "tetany", time: "12:00", types: [], location: [], intensity: 5, triggers: [], helped: [] }],
    };

    const day = summarizeReportDay("2026-08-16", log);
    expect(day.panic).toBe(9);
    expect(day.nausea).toBe(10);
    expect(day.tetany).toBe(5);
  });

  it("counts Bristol Type 0 but separates no-movement and urinary-only records", () => {
    const log: DayLog = {
      bowel: [
        { id: "type0", time: "08:00", bristol: 0 },
        { id: "none", time: "09:00", bristol: -1 },
        { id: "urinary", time: "10:00", bristol: -2, urinaryOnly: true, urinary: ["Frequent"] },
        { id: "type7", time: "11:00", bristol: 7 },
      ],
    };

    const day = summarizeReportDay("2026-08-16", log);
    expect(day.bowelTypes).toEqual([0, 7]);
    expect(day.bowelLogCount).toBe(4);
    expect(day.noBowelMovementCount).toBe(1);
    expect(day.urinaryOnlyCount).toBe(1);
  });

  it("uses the same saved period range fallback as the calendar", () => {
    const cycle = { lastPeriodStart: "2026-08-14", lastPeriodEnd: "2026-08-17", periodLength: 4 };
    expect(reportPeriodLevel("2026-08-15", {}, cycle)).toBe("medium");
    expect(reportPeriodLevel("2026-08-18", {}, cycle)).toBeUndefined();
    expect(reportPeriodLevel("2026-08-15", { period: "heavy" }, cycle)).toBe("heavy");
  });

  it("uses configured period length when the saved range has no explicit end", () => {
    const cycle = { lastPeriodStart: "2026-08-14", lastPeriodEnd: undefined, periodLength: 5 };
    expect(reportPeriodLevel("2026-08-14", {}, cycle)).toBe("medium");
    expect(reportPeriodLevel("2026-08-18", {}, cycle)).toBe("medium");
    expect(reportPeriodLevel("2026-08-19", {}, cycle)).toBeUndefined();
  });

  it("treats zero-valued measurements and newly-added log families as meaningful data", () => {
    const zeroSleep = summarizeReportDay("2026-08-16", { sleepHours: 0 });
    expect(hasMeaningfulReportDay(zeroSleep)).toBe(true);

    const weightOnly = summarizeReportDay("2026-08-16", { weight: 62 });
    expect(hasMeaningfulReportDay(weightOnly)).toBe(true);

    const histamineOnly = summarizeReportDay("2026-08-16", {
      histamine: [{ id: "h", time: "12:00", flare: true, note: "test" }],
    });
    expect(hasMeaningfulReportDay(histamineOnly)).toBe(true);

    const customOnly = summarizeReportDay("2026-08-16", {
      customLogs: { custom1: [{ id: "c", time: "12:00", values: { severity: 0 } }] },
    });
    expect(hasMeaningfulReportDay(customOnly)).toBe(true);
  });

  it("counts PRN uses from both the as-needed Meds checkbox and extra-dose records", () => {
    const med: Med = { id: "frontin", name: "Frontin", times: [], asNeeded: true };
    const dates = ["2026-08-15", "2026-08-16"];
    const dayLogs: Record<string, DayLog> = {
      "2026-08-15": { extraMeds: [{ id: "e1", time: "18:00", name: "Frontin", dose: "0.25 mg" }] },
      "2026-08-16": { extraMeds: [{ id: "e2", time: "20:00", name: "frontin" }] },
    };
    const medLog = {
      "2026-08-16": { "frontin@asneeded": true },
    };

    expect(countRecordedPrnUses(med, dates, dayLogs, medLog)).toBe(3);
  });

  it("starts long-range medication adherence at the first historical scheduled record", () => {
    const med: Med = { id: "daily", name: "Daily med", times: ["09:00"] };
    const medLog = {
      "2026-04-21": { "daily@09:00": true },
      "2026-04-22": {},
    };
    const medLogItems = {
      "2026-08-13": { "daily@09:00": ["Daily med"] },
    };

    expect(firstRecordedScheduledMedicationDate(med, medLog, medLogItems)).toBe("2026-04-21");
    expect(firstRecordedScheduledMedicationDate({ ...med, id: "unknown" }, medLog, medLogItems)).toBeUndefined();
  });

  it("paginates long-range Pain by day data without dropping days", () => {
    const ninety = Array.from({ length: 90 }, (_, index) => index);
    const year = Array.from({ length: 365 }, (_, index) => index);

    const ninetyPages = paginateReportDays(ninety, 30);
    const yearPages = paginateReportDays(year, 30);

    expect(ninetyPages).toHaveLength(3);
    expect(ninetyPages.flat()).toEqual(ninety);
    expect(yearPages).toHaveLength(13);
    expect(yearPages.flat()).toEqual(year);
    expect(yearPages.every((page) => page.length <= 30)).toBe(true);
  });
});
