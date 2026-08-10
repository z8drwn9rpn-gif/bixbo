import { describe, expect, it } from "bun:test";
import { EMPTY, type BixboData } from "../storage";
import { getRegistryFeature, isRegistrySurfaceEnabled, registryFeaturesForSurface } from "../appRegistry";

const clone = (): BixboData => structuredClone(EMPTY);

describe("BIXBO admin registry", () => {
  it("keeps stable IDs while allowing rename", () => {
    const data = clone();
    data.settings.adminConfig = { features: { pain: { label: "My pain" } } };
    const pain = getRegistryFeature(data, "pain");
    expect(pain.id).toBe("pain");
    expect(pain.label).toBe("My pain");
  });

  it("can hide a feature from one surface without deleting it", () => {
    const data = clone();
    data.settings.adminConfig = { features: { period: { surfaces: { heatmap: false } } } };
    expect(isRegistrySurfaceEnabled(data, "period", "heatmap")).toBe(false);
    expect(isRegistrySurfaceEnabled(data, "period", "log")).toBe(true);
  });

  it("orders features using admin overrides", () => {
    const data = clone();
    data.settings.adminConfig = { features: { bowel: { order: 1 } } };
    expect(registryFeaturesForSurface(data, "log")[0]?.id).toBe("bowel");
  });
});
