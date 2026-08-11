import { describe, expect, it } from "vitest";

import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Pain wizard admin step order", () => {
  it("registers all five wizard steps with stable IDs", () => {
    expect((BIXBO_LOG_FIELDS.pain ?? []).map((field) => field.id)).toEqual([
      "score", "parts", "quality", "symptoms", "details",
    ]);
  });

  it("uses admin order without changing stable IDs", () => {
    const data = {
      ...EMPTY,
      settings: {
        ...EMPTY.settings,
        adminConfig: {
          enabled: true,
          features: { pain: { fields: { details: { order: 1 }, score: { order: 999 } } } },
        },
      },
    };
    expect(registryFieldsForFeature(data, "pain").map((field) => field.id)).toEqual([
      "details", "parts", "quality", "symptoms", "score",
    ]);
  });
});
