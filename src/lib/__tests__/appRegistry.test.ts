import { describe, expect, it } from "bun:test";
import { EMPTY, type BixboData } from "../storage";
import { mergeBixbo } from "../merge";
import {
  getRegistryFeature,
  isRegistryOptionEnabled,
  isRegistrySurfaceEnabled,
  registryFeaturesForSurface,
} from "../appRegistry";

const clone = (): BixboData => structuredClone(EMPTY);

describe("BIXBO admin registry", () => {
  it("keeps stable IDs while allowing rename", () => {
    const data = clone();
    data.settings.adminConfig = { features: { pain: { label: "My pain" } } };
    const pain = getRegistryFeature(data, "pain");
    expect(pain.id).toBe("pain");
    expect(pain.label).toBe("My pain");
  });

  it("keeps Period available in Heatmap even when a stale admin override says false", () => {
    const data = clone();
    data.settings.adminConfig = { features: { period: { surfaces: { heatmap: false } } } };
    expect(isRegistrySurfaceEnabled(data, "period", "heatmap")).toBe(true);
    expect(isRegistrySurfaceEnabled(data, "period", "log")).toBe(true);
  });

  it("still allows non-required surfaces to be hidden", () => {
    const data = clone();
    data.settings.adminConfig = { features: { pain: { surfaces: { heatmap: false } } } };
    expect(isRegistrySurfaceEnabled(data, "pain", "heatmap")).toBe(false);
    expect(isRegistrySurfaceEnabled(data, "pain", "log")).toBe(true);
  });

  it("orders features using admin overrides", () => {
    const data = clone();
    data.settings.adminConfig = { features: { bowel: { order: 1 } } };
    expect(registryFeaturesForSurface(data, "log")[0]?.id).toBe("bowel");
  });

  it("preserves admin registry configuration through cloud merge", () => {
    const local = clone();
    const remote = clone();
    local.settings.adminConfig = { features: { pain: { label: "My pain", surfaces: { heatmap: false } } } };
    const merged = mergeBixbo(local, remote);
    expect(merged.settings.adminConfig?.features?.pain?.label).toBe("My pain");
    expect(merged.settings.adminConfig?.features?.pain?.surfaces?.heatmap).toBe(false);
  });
});

import { registryFieldScale, registryFieldOptions, registryOptionLabel } from "../appRegistry";

describe("BIXBO log schema registry", () => {
  it("applies dynamic scale overrides without mutating stored health values", () => {
    const data = structuredClone(EMPTY);
    data.dayLogs["2026-08-10"] = { pain: [{ id: "p", time: "10:00", score: 9, parts: [], quality: [], symptoms: [] }] };
    data.settings.adminConfig = { features: { pain: { fields: { score: { scale: { min: 1, max: 5, step: 1 } } } } } };
    expect(registryFieldScale(data, "pain", "score", { min: 0, max: 10, step: 1 })).toEqual({ min: 1, max: 5, step: 1 });
    expect(data.dayLogs["2026-08-10"]?.pain?.[0]?.score).toBe(9);
  });

  it("can rename/hide chip options while keeping their stored stable value", () => {
    const data = structuredClone(EMPTY);
    data.settings.adminConfig = { features: { pain: { fields: { parts: { options: { Pelvis: { label: "Lower pelvis" }, Head: { enabled: false } } } } } };
    expect(registryOptionLabel(data, "pain", "parts", "Pelvis")).toBe("Lower pelvis");
    expect(registryFieldOptions(data, "pain", "parts", ["Head", "Pelvis"])).toEqual(["Pelvis"]);
    expect(isRegistryOptionEnabled(data, "pain", "parts", "Head")).toBe(false);
    expect(isRegistryOptionEnabled(data, "pain", "parts", "Pelvis")).toBe(true);
  });
});
