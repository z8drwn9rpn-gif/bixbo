import { describe, expect, it } from "bun:test";
import { registryAdminCorrelationFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

const data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });

describe("admin Correlation fields", () => {
  it("exposes selected visible Yes/No and Choices fields only", () => {
    const view = data({ features: { pain: { correlationFieldIds: ["yesno", "choices", "number", "hidden"], customFields: [
      { id: "yesno", label: "Yes no", kind: "toggle", order: 10, enabled: true },
      { id: "choices", label: "Choices", kind: "chips", order: 20, enabled: true, options: ["A", "B"] },
      { id: "number", label: "Number", kind: "number", order: 30, enabled: true },
      { id: "hidden", label: "Hidden", kind: "chips", order: 40, enabled: false, options: ["X"] },
    ] } } });
    expect(registryAdminCorrelationFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["yesno", "choices"]);
  });
});
