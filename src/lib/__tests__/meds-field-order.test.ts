import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Meds admin block order", () => {
  it("registers stable medication blocks", () => {
    expect((BIXBO_LOG_FIELDS.meds ?? []).map((f) => f.id)).toEqual(["scheduled", "extraDose"]);
  });
  it("respects admin order", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: { meds: { fields: { extraDose: { order: 1 }, scheduled: { order: 999 } } } } } } };
    expect(registryFieldsForFeature(data, "meds").map((f) => f.id)).toEqual(["extraDose", "scheduled"]);
  });
});
