import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";

describe("admin visible text overrides", () => {
  it("deep-merges global and local text label settings", () => {
    const key = "/meds::h2::Medication%20schedule::0";
    const merged = mergeAdminConfigs(
      { textOverrides: { [key]: { label: "My medicines" } } },
      { textOverrides: { [key]: { hidden: true } } },
    );
    expect(merged.textOverrides?.[key]).toEqual({ label: "My medicines", hidden: true });
  });

  it("keeps unrelated route text overrides", () => {
    const merged = mergeAdminConfigs(
      { textOverrides: { "/a::p::One::0": { label: "First" } } },
      { textOverrides: { "/b::p::Two::0": { label: "Second" } } },
    );
    expect(Object.keys(merged.textOverrides ?? {}).sort()).toEqual(["/a::p::One::0", "/b::p::Two::0"]);
  });
});
