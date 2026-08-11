import { describe, expect, it } from "vitest";

import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

// Whole-field drag must change presentation order only; stable health-data keys remain unchanged.
describe("Panic/Tetany built-in admin field order", () => {
  it("registers every linear panic field with a stable ID", () => {
    expect((BIXBO_LOG_FIELDS.panic ?? []).map((field) => field.id)).toEqual([
      "time", "duration", "intensity", "physical", "cognitive", "trigger", "place",
      "hyperventilation", "tetanyPresent", "helped", "rescueMed", "note",
    ]);
  });

  it("registers every linear tetany field with a stable ID", () => {
    expect((BIXBO_LOG_FIELDS.tetany ?? []).map((field) => field.id)).toEqual([
      "time", "types", "location", "intensity", "duration", "triggers", "helped", "rescueMed", "note",
    ]);
  });

  it("sorts real form fields by admin override order", () => {
    const data = {
      ...EMPTY,
      settings: {
        ...EMPTY.settings,
        adminConfig: {
          enabled: true,
          features: { panic: { fields: { note: { order: 1 }, time: { order: 999 } } } },
        },
      },
    };
    const ids = registryFieldsForFeature(data, "panic").map((field) => field.id);
    expect(ids[0]).toBe("note");
    expect(ids.at(-1)).toBe("time");
  });
});
