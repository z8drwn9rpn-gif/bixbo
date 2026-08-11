import { describe, expect, it } from "bun:test";
import { EMPTY } from "../storage";
import { getRegistryFeature, isRegistrySurfaceEnabled } from "../appRegistry";

describe("ŠukŠuk Heatmap admin support", () => {
  it("exposes sex on Heatmap when admin enables the surface without changing stored logs", () => {
    const data = structuredClone(EMPTY);
    data.dayLogs["2026-08-11"] = {
      sex: [{ id: "s1", time: "21:00", kind: "sex_without_condom" }],
    };
    data.settings.adminConfig = {
      features: { sex: { surfaces: { heatmap: true } } },
    };

    expect(isRegistrySurfaceEnabled(data, "sex", "heatmap")).toBe(true);
    expect(getRegistryFeature(data, "sex").label).toBe("ŠukŠuk!");
    expect(data.dayLogs["2026-08-11"]?.sex?.[0]?.kind).toBe("sex_without_condom");
  });
});
