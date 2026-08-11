import { describe, expect, it } from "bun:test";
import { registryAdminCorrelationFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

const data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });

describe("admin Correlation fields", () => {
  it("exposes only selected visible Yes/No fields", () => {
    const view = data({ features: { pain: { correlationFieldIds: ["yesno", "number", "hidden"], customFields: [
      { id: "yesno", label: "Yes no", kind: "toggle", order: 10, enabled: true },
      { id: "number", label: "Number", kind: "number", order: 20, enabled: true },
      { id: "hidden", label: "Hidden", kind: "toggle", order: 30, enabled: false },
    ] } } });
    expect(registryAdminCorrelationFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["yesno"]);
  });
});
