import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";

describe("global + device Admin configuration", () => {
  it("uses globally published values when the device has no override", () => {
    const result = mergeAdminConfigs({
      features: { pain: { label: "Global pain", surfaces: { heatmap: false } } },
      layoutOrder: { home: ["home.quickLog", "home.calendar"] },
    }, {});
    expect(result.features?.pain?.label).toBe("Global pain");
    expect(result.features?.pain?.surfaces?.heatmap).toBe(false);
    expect(result.layoutOrder?.home?.[0]).toBe("home.quickLog");
  });

  it("keeps device-local changes above the global default", () => {
    const result = mergeAdminConfigs(
      { features: { pain: { label: "Global pain", surfaces: { heatmap: false, calendar: true } } } },
      { features: { pain: { label: "My phone pain", surfaces: { heatmap: true } } } },
    );
    expect(result.features?.pain?.label).toBe("My phone pain");
    expect(result.features?.pain?.surfaces?.heatmap).toBe(true);
    expect(result.features?.pain?.surfaces?.calendar).toBe(true);
  });

  it("keeps global page order except pages overridden on this device", () => {
    const result = mergeAdminConfigs(
      { layoutOrder: { home: ["a", "b"], insights: ["x", "y"] } },
      { layoutOrder: { home: ["b", "a"] } },
    );
    expect(result.layoutOrder?.home).toEqual(["b", "a"]);
    expect(result.layoutOrder?.insights).toEqual(["x", "y"]);
  });
});
