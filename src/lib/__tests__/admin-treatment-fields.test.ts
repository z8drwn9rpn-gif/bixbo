import { describe, expect, it } from "bun:test";
import { registryAdminTreatmentFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

const data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });

describe("admin Treatment fields", () => {
  it("exposes only explicitly selected visible Number/Scale fields", () => {
    const view = data({ features: { pain: { treatmentFieldIds: ["number", "text", "hidden"], customFields: [
      { id: "number", label: "Number", kind: "number", order: 10, enabled: true },
      { id: "text", label: "Text", kind: "text", order: 20, enabled: true },
      { id: "hidden", label: "Hidden", kind: "scale", order: 30, enabled: false, scale: { min: 1, max: 5, step: 1 } },
    ] } } });
    expect(registryAdminTreatmentFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["number"]);
  });
});
