import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Temp/Sleep/Weight admin field order", () => {
  it("registers stable logical blocks", () => {
    expect((BIXBO_LOG_FIELDS.temp ?? []).map((f) => f.id)).toEqual(["temperature", "weight", "sleepHours", "sleepQuality"]);
  });
  it("respects admin order", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: { temp: { fields: { sleepQuality: { order: 1 }, temperature: { order: 999 } } } } } } };
    expect(registryFieldsForFeature(data, "temp").map((f) => f.id)[0]).toBe("sleepQuality");
  });
});
