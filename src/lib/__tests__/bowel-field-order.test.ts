import { describe, expect, it } from "vitest";

import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Bowel built-in admin field order", () => {
  it("registers every linear bowel field with a stable ID", () => {
    expect((BIXBO_LOG_FIELDS.bowel ?? []).map((field) => field.id)).toEqual([
      "time", "bristol", "urinary", "feelings", "symptoms", "note",
    ]);
  });

  it("sorts bowel presentation order without changing stable IDs", () => {
    const data = {
      ...EMPTY,
      settings: {
        ...EMPTY.settings,
        adminConfig: { enabled: true, features: { bowel: { fields: { note: { order: 1 }, time: { order: 999 } } } } },
      },
    };
    expect(registryFieldsForFeature(data, "bowel").map((field) => field.id)).toEqual([
      "note", "bristol", "urinary", "feelings", "symptoms", "time",
    ]);
  });
});
