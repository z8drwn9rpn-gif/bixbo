import { describe, expect, it } from "bun:test";

import { mergeBixbo } from "../merge";
import { EMPTY, isCycleTrackingHidden, latestRecordedWeight, type BixboData } from "../storage";

const clone = (): BixboData => structuredClone(EMPTY);
const DAY = "2026-08-10";

describe("BIXBO critical user-flow regression protection", () => {
  it("preserves a complete daily health log through cloud merge", () => {
    const local = clone();
    const remote = clone();

    local.dayLogs[DAY] = {
      pain: [
        {
          id: "pain-1",
          time: "10:00",
          score: 7,
          parts: ["Pelvis"],
          quality: ["Pressure"],
          symptoms: ["Nausea"],
          note: "test",
          pressureTypes: ["Tight"],
          pressureIntensity: 6,
          nausea: true,
          nauseaSeverity: 4,
          hotFlashesOn: true,
          hotFlashes: 2,
          headache: true,
          headacheIntensity: 5,
        },
      ],
      tetany: [
        {
          id: "tetany-1",
          time: "11:00",
          types: ["Tingling"],
          location: ["Hands"],
          intensity: 3,
          minutes: 10,
          triggers: ["Stress"],
          helped: ["Magnesium"],
        },
      ],
      panic: [
        {
          id: "panic-1",
          time: "12:00",
          minutes: 5,
          intensity: 6,
          physical: ["Palpitations"],
          cognitive: ["Fear"],
          trigger: "Crowd",
          hyperventilation: "during",
          tetanyPresent: true,
          helped: ["Breathing"],
        },
      ],
      period: "medium",
      periodInfo: { level: "medium", cramps: 4, discharge: "clear", note: "cycle" },
      food: [
        {
          id: "food-1",
          time: "13:00",
          what: "Rice",
          feelings: ["Good"],
          histamineFlare: true,
          histamineSymptoms: ["Flushing"],
        },
      ],
      bowel: [{ id: "bowel-0", time: "14:00", bristol: 0, note: "Type 0 must survive" }],
      sex: [{ id: "sex-1", time: "20:00", kind: "sex_without_condom", painful: "no" }],
      heat: [{ id: "heat-1", kind: "tens", start: "18:00", minutes: 20 }],
      workout: [{ id: "workout-1", time: "17:00", kind: "Pilates", minutes: 30 }],
      temperature: 36.7,
      temperatureEntries: [{ id: "temp-1", time: "09:00", value: 36.7 }],
      weight: 62.3,
      weightEntries: [{ id: "weight-1", time: "09:05", value: 62.3 }],
      sleepHours: 8,
      sleepQuality: ["Good"],
      extraMeds: [{ id: "extra-med-1", time: "15:00", name: "Frontin", dose: "0.25 mg" }],
    };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    const log = merged.dayLogs[DAY];

    expect(log?.pain?.[0]?.score).toBe(7);
    expect(log?.tetany?.[0]?.intensity).toBe(3);
    expect(log?.panic?.[0]?.intensity).toBe(6);
    expect(log?.periodInfo?.level).toBe("medium");
    expect(log?.food?.[0]?.histamineFlare).toBe(true);
    expect(log?.bowel?.[0]?.bristol).toBe(0);
    expect(log?.sex?.[0]?.kind).toBe("sex_without_condom");
    expect(log?.heat?.[0]?.kind).toBe("tens");
    expect(log?.workout?.[0]?.minutes).toBe(30);
    expect(log?.temperatureEntries?.[0]?.value).toBe(36.7);
    expect(log?.weightEntries?.[0]?.value).toBe(62.3);
    expect(log?.sleepHours).toBe(8);
    expect(log?.extraMeds?.[0]?.name).toBe("Frontin");
  });

  it("preserves medication schedules, taken state and actual taken time", () => {
    const local = clone();
    const remote = clone();

    local.meds = [{ id: "med-1", name: "Medication", dose: "1 tablet", times: ["09:00", "21:00"] }];
    local.medLog[DAY] = { "med-1@09:00": true, "med-1@21:00": false };
    local.medLogTimes[DAY] = { "med-1@09:00": "09:07" };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });

    expect(merged.meds[0]?.times).toEqual(["09:00", "21:00"]);
    expect(merged.medLog[DAY]?.["med-1@09:00"]).toBe(true);
    expect(merged.medLog[DAY]?.["med-1@21:00"]).toBe(false);
    expect(merged.medLogTimes[DAY]?.["med-1@09:00"]).toBe("09:07");
  });

  it("preserves calendar events, tasks, day notes and notebook notes", () => {
    const local = clone();
    const remote = clone();

    local.events = [{ id: "event-1", title: "Doctor", startDate: DAY, endDate: DAY, time: "15:00" }];
    local.tasks = [{ id: "task-1", title: "Call clinic", startDate: DAY, endDate: DAY, done: false }];
    local.dayNotes[DAY] = [{ text: "Daily note", time: "18:00" }];
    local.notebook = [
      {
        id: "note-1",
        folderId: "general",
        title: "Private note",
        content: "Body",
        checklist: [{ id: "check-1", text: "Item", done: true }],
        createdAt: 1,
        updatedAt: 2,
        pinned: true,
      },
    ];

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });

    expect(merged.events.map((entry) => entry.id)).toContain("event-1");
    expect(merged.tasks.map((entry) => entry.id)).toContain("task-1");
    expect(merged.dayNotes[DAY]?.[0]).toEqual({ text: "Daily note", time: "18:00" });
    expect(merged.notebook[0]?.checklist?.[0]?.done).toBe(true);
    expect(merged.notebook[0]?.pinned).toBe(true);
  });

  it("preserves pregnancy setup and daily pregnancy measurements", () => {
    const local = clone();
    const remote = clone();

    local.pregnancy = {
      active: true,
      lmp: "2026-01-01",
      dueDate: "2026-10-08",
      startWeightKg: 61,
      multiples: 1,
      hospitalBag: [{ id: "bag-1", text: "Documents", done: true }],
      vaccinations: [],
      supplements: [],
      appointments: [{ id: "appt-1", date: "2026-08-20", kind: "checkup", title: "Checkup" }],
    };
    local.dayLogs[DAY] = {
      pregnancy: {
        symptoms: ["Nausea"],
        weightKg: 64,
        bloodPressure: [{ id: "bp-1", time: "09:00", systolic: 118, diastolic: 76, pulse: 70 }],
        bloodSugar: [{ id: "bs-1", time: "09:10", value: 5.1, context: "fasting" }],
        kicks: [{ id: "kick-1", time: "14:00", count: 10, minutes: 12 }],
        contractions: [{ id: "contraction-1", start: "20:00", durationSec: 35 }],
        note: "Pregnancy note",
      },
    };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });

    expect(merged.pregnancy?.active).toBe(true);
    expect(merged.pregnancy?.appointments[0]?.id).toBe("appt-1");
    expect(merged.dayLogs[DAY]?.pregnancy?.bloodPressure?.[0]?.systolic).toBe(118);
    expect(merged.dayLogs[DAY]?.pregnancy?.bloodSugar?.[0]?.value).toBe(5.1);
    expect(merged.dayLogs[DAY]?.pregnancy?.kicks?.[0]?.count).toBe(10);
    expect(merged.dayLogs[DAY]?.pregnancy?.contractions?.[0]?.durationSec).toBe(35);
  });

  it("preserves postpartum setup and recovery/feeding logs", () => {
    const local = clone();
    const remote = clone();

    local.postpartum = {
      active: true,
      birthDate: "2026-07-01",
      deliveryType: "vaginal",
      babyName: "Baby",
      babyBirthWeightKg: 3.4,
      feedingMode: "mixed",
      visits: [{ id: "visit-1", date: "2026-08-12", kind: "checkup", title: "6-week check" }],
    };
    local.dayLogs[DAY] = {
      postpartum: {
        bleeding: "light",
        symptoms: ["Fatigue"],
        recovery: 7,
        sleepHours: 6,
        breastfeeding: [{ id: "feed-1", time: "08:00", minutes: 20, side: "left" }],
        pumping: [{ id: "pump-1", time: "10:00", ml: 80, minutes: 15 }],
        bottle: [{ id: "bottle-1", time: "12:00", ml: 90 }],
        diapers: [{ id: "diaper-1", time: "13:00", kind: "both" }],
        babySleepHours: 14,
        note: "Recovery note",
      },
    };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });

    expect(merged.postpartum?.active).toBe(true);
    expect(merged.postpartum?.visits[0]?.id).toBe("visit-1");
    expect(merged.dayLogs[DAY]?.postpartum?.bleeding).toBe("light");
    expect(merged.dayLogs[DAY]?.postpartum?.breastfeeding?.[0]?.minutes).toBe(20);
    expect(merged.dayLogs[DAY]?.postpartum?.pumping?.[0]?.ml).toBe(80);
    expect(merged.dayLogs[DAY]?.postpartum?.diapers?.[0]?.kind).toBe("both");
  });

  it("keeps reproductive-mode visibility and latest-weight selectors consistent", () => {
    const data = clone();

    data.dayLogs["2026-08-09"] = { weight: 61.8 };
    data.dayLogs[DAY] = { weightEntries: [{ id: "weight-latest", time: "09:00", value: 62.4 }] };
    expect(latestRecordedWeight(data)).toBe(62.4);

    expect(isCycleTrackingHidden(data)).toBe(false);
    data.pregnancy = { ...data.pregnancy!, active: true };
    expect(isCycleTrackingHidden(data)).toBe(true);

    data.pregnancy = { ...data.pregnancy!, active: false };
    data.postpartum = { ...data.postpartum!, active: true };
    expect(isCycleTrackingHidden(data)).toBe(true);

    data.postpartum = { ...data.postpartum!, active: false };
    data.settings.gender = "male";
    expect(isCycleTrackingHidden(data)).toBe(true);
  });
});
