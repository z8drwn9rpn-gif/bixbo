import { describe, expect, it } from "bun:test";
import { registryCustomFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

const data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });

describe("admin supplementary field ordering", () => {
  it("renders fields by persisted order rather than array insertion order", () => {
    const view = data({ features: { pain: { customFields: [
      { id: "third", label: "Third", kind: "text", order: 30 },
      { id: "first", label: "First", kind: "text", order: 10 },
      { id: "second", label: "Second", kind: "text", order: 20 },
    ] } } });
    expect(registryCustomFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["first", "second", "third"]);
  });
});
