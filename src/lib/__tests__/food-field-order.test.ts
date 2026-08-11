import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Food admin field order", () => {
  it("registers stable logical blocks", () => {
    expect((BIXBO_LOG_FIELDS.food ?? []).map((f) => f.id)).toEqual([
      "time", "what", "quickAdd", "reaction", "feelings", "symptomsAfter", "highHistamine", "histamineFlare", "allergens", "intake", "note",
    ]);
  });
  it("respects admin order", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: { food: { fields: { note: { order: 1 }, time: { order: 999 } } } } } } };
    expect(registryFieldsForFeature(data, "food").map((f) => f.id)[0]).toBe("note");
  });
});
