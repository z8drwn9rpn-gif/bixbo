import { describe, expect, it } from "vitest";
import { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("Event and Task admin field order", () => {
  it("registers stable block IDs", () => {
    expect((BIXBO_LOG_FIELDS.event ?? []).map((f) => f.id)).toEqual(["title", "dates", "times", "color", "note"]);
    expect((BIXBO_LOG_FIELDS.task ?? []).map((f) => f.id)).toEqual(["title", "dates", "times", "note"]);
  });
  it("respects admin order", () => {
    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {
      event: { fields: { note: { order: 1 }, title: { order: 999 } } },
      task: { fields: { times: { order: 1 }, title: { order: 999 } } },
    } } } };
    expect(registryFieldsForFeature(data, "event").map((f) => f.id)[0]).toBe("note");
    expect(registryFieldsForFeature(data, "task").map((f) => f.id)[0]).toBe("times");
  });
});
