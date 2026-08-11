import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Sex and Heat/Cold/TENS admin field order", () => {
  it("registers stable field IDs", () => {
    expect((BIXBO_LOG_FIELDS.sex ?? []).map((f) => f.id)).toEqual(["time", "type", "feelingAfter", "painful", "note"]);
    expect((BIXBO_LOG_FIELDS.heat ?? []).map((f) => f.id)).toEqual(["type", "start", "duration", "note"]);
  });
  it("respects admin order", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {
      sex: { fields: { note: { order: 1 }, time: { order: 999 } } },
      heat: { fields: { note: { order: 1 }, type: { order: 999 } } },
    } } } };
    expect(registryFieldsForFeature(data, "sex").map((f) => f.id)[0]).toBe("note");
    expect(registryFieldsForFeature(data, "heat").map((f) => f.id)[0]).toBe("note");
  });
});
