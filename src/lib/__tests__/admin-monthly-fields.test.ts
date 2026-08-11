import { describe, expect, it } from "bun:test";
import { registryAdminMonthlyFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

function withConfig(config: AdminConfig) {
  return { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } };
}

describe("admin Monthly fields", () => {
  it("exposes only explicitly selected visible numeric or scale fields", () => {
    const data = withConfig({
      features: {
        pain: {
          monthlyFieldIds: ["scale", "text", "hidden"],
          customFields: [
            { id: "scale", label: "Pressure", kind: "scale", order: 10, enabled: true, scale: { min: 1, max: 5, step: 1 } },
            { id: "text", label: "Text", kind: "text", order: 20, enabled: true },
            { id: "hidden", label: "Hidden", kind: "number", order: 30, enabled: false },
            { id: "other", label: "Other", kind: "number", order: 40, enabled: true },
          ],
        },
      },
    });
    expect(registryAdminMonthlyFieldsForFeature(data, "pain").map((field) => field.id)).toEqual(["scale"]);
  });
});
