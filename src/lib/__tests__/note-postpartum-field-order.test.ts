import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Note and Postpartum admin field order", () => {
  it("registers stable input IDs", () => {
    expect((BIXBO_LOG_FIELDS.note ?? []).map((f) => f.id)).toEqual(["time", "text"]);
    expect((BIXBO_LOG_FIELDS.postpartum ?? []).map((f) => f.id)).toEqual(["symptoms", "note"]);
  });
  it("respects admin order", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {
      note: { fields: { text: { order: 1 }, time: { order: 999 } } },
      postpartum: { fields: { note: { order: 1 }, symptoms: { order: 999 } } },
    } } } };
    expect(registryFieldsForFeature(data, "note").map((f) => f.id)[0]).toBe("text");
    expect(registryFieldsForFeature(data, "postpartum").map((f) => f.id)[0]).toBe("note");
  });
});
