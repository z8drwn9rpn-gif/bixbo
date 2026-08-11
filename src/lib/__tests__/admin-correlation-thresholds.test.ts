import { describe, expect, it } from "bun:test";
import { registryAdminCorrelationFieldsForFeature, registryAdminCorrelationThreshold, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

const data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });

describe("admin correlation thresholds", () => {
  it("requires a valid threshold for selected Number/Scale fields", () => {
    const view = data({ features: { pain: {
      correlationFieldIds: ["number", "scale", "no_threshold"],
      correlationThresholds: { number: { operator: "gte", value: 7 }, scale: { operator: "lte", value: 2 } },
      customFields: [
        { id: "number", label: "Stress", kind: "number", order: 10, enabled: true },
        { id: "scale", label: "Pressure", kind: "scale", order: 20, enabled: true, scale: { min: 1, max: 5, step: 1 } },
        { id: "no_threshold", label: "No threshold", kind: "number", order: 30, enabled: true },
      ],
    } } });
    expect(registryAdminCorrelationFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["number", "scale"]);
    expect(registryAdminCorrelationThreshold(view, "pain", "number")).toEqual({ operator: "gte", value: 7 });
    expect(registryAdminCorrelationThreshold(view, "pain", "scale")).toEqual({ operator: "lte", value: 2 });
  });
});
