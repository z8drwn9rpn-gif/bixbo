import { describe, expect, it } from "bun:test";
import { registryAdminHeatmapFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

function withConfig(config: AdminConfig) {
  return { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } };
}

describe("admin core Heatmap fields", () => {
  it("exposes only explicitly selected numeric/scale supplementary fields", () => {
    const data = withConfig({
      features: {
        pain: {
          heatmapFieldIds: ["pressure", "note", "hidden"],
          customFields: [
            { id: "pressure", label: "Pressure", kind: "scale", order: 10, enabled: true, scale: { min: 1, max: 5, step: 1 } },
            { id: "note", label: "Note", kind: "text", order: 20, enabled: true },
            { id: "hidden", label: "Hidden number", kind: "number", order: 30, enabled: false },
            { id: "not_selected", label: "Other number", kind: "number", order: 40, enabled: true },
          ],
        },
      },
    });
    expect(registryAdminHeatmapFieldsForFeature(data, "pain").map((field) => field.id)).toEqual(["pressure"]);
  });
});
