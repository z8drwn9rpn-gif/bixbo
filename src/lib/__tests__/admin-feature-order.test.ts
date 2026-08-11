import { describe, expect, it } from "bun:test";
import { registryFeaturesForSurface } from "../appRegistry";
import type { BixboData } from "../storage";

describe("admin feature order", () => {
  it("sorts registry surface features by stable admin order", () => {
    const data = { settings: { adminConfig: { features: { pain: { order: 30 }, tetany: { order: 10 }, panic: { order: 20 } } } } } as unknown as Pick<BixboData, "settings">;
    const ids = registryFeaturesForSurface(data, "log").map((feature) => feature.id);
    expect(ids.indexOf("tetany")).toBeLessThan(ids.indexOf("panic"));
    expect(ids.indexOf("panic")).toBeLessThan(ids.indexOf("pain"));
  });
});
