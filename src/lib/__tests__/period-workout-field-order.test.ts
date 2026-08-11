import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Period and Workout admin field order", () => {
  it("registers stable Period field IDs", () => {
    expect((BIXBO_LOG_FIELDS.period ?? []).map((f) => f.id)).toEqual([
      "flow", "cramps", "discharge", "dischargeNote", "note", "birthControlSince", "pregnant",
    ]);
  });

  it("registers stable Workout block IDs", () => {
    expect((BIXBO_LOG_FIELDS.workout ?? []).map((f) => f.id)).toEqual([
      "kind", "minutes", "distance", "exercises", "rpe", "magnesiumBefore", "triggeredSymptom", "weightKg", "feel", "note",
    ]);
  });

  it("respects admin order without changing stable IDs", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {
      period: { fields: { pregnant: { order: 1 }, flow: { order: 999 } } },
      workout: { fields: { note: { order: 1 }, kind: { order: 999 } } },
    } } } };
    expect(registryFieldsForFeature(data, "period").map((f) => f.id)[0]).toBe("pregnant");
    expect(registryFieldsForFeature(data, "workout").map((f) => f.id)[0]).toBe("note");
  });
});
