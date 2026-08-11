import { describe, expect, it } from "vitest";

import type { AdminConfig } from "@/lib/appRegistry";
import {
  layoutSectionOverridesFromConfig,
  mergeLayoutSectionOverrides,
  withLayoutSectionOverride,
  withoutLayoutSectionOverride,
  withoutPageLayoutOverrides,
} from "@/lib/adminLayoutOverrides";

describe("admin layout section overrides", () => {
  it("keeps old admin configs valid", () => {
    const config: AdminConfig = { enabled: true, layoutOrder: { home: ["calendar", "quickLog"] } };
    expect(layoutSectionOverridesFromConfig(config)).toEqual({});
    expect(config.layoutOrder?.home).toEqual(["calendar", "quickLog"]);
  });

  it("adds a section rename without changing its stable id or layout order", () => {
    const base: AdminConfig = { layoutOrder: { home: ["calendar", "quickLog"] } };
    const next = withLayoutSectionOverride(base, "home", "calendar", { label: "My calendar" });
    expect(layoutSectionOverridesFromConfig(next).home?.calendar).toEqual({ label: "My calendar" });
    expect(next.layoutOrder?.home).toEqual(["calendar", "quickLog"]);
  });

  it("supports non-destructive hide and reset", () => {
    const hidden = withLayoutSectionOverride({}, "insights", "heatmap", { hidden: true });
    expect(layoutSectionOverridesFromConfig(hidden).insights?.heatmap?.hidden).toBe(true);
    const reset = withoutLayoutSectionOverride(hidden, "insights", "heatmap");
    expect(layoutSectionOverridesFromConfig(reset).insights).toBeUndefined();
  });

  it("lets local section values win while preserving unrelated global overrides", () => {
    const globalConfig = withLayoutSectionOverride(
      withLayoutSectionOverride({}, "insights", "heatmap", { label: "Global heatmap", hidden: false }),
      "insights",
      "pain",
      { hidden: true },
    );
    const localConfig = withLayoutSectionOverride({}, "insights", "heatmap", { label: "Local heatmap" });
    const merged = mergeLayoutSectionOverrides(globalConfig, localConfig);
    expect(merged.insights?.heatmap).toEqual({ label: "Local heatmap", hidden: false });
    expect(merged.insights?.pain).toEqual({ hidden: true });
  });

  it("resets only the current page layout customizations", () => {
    let config = withLayoutSectionOverride({}, "home", "calendar", { label: "Calendar X" });
    config = withLayoutSectionOverride(config, "insights", "heatmap", { label: "Heatmap X" });
    config = { ...config, layoutOrder: { home: ["quickLog", "calendar"], insights: ["meds", "heatmap"] } };
    const next = withoutPageLayoutOverrides(config, "home");
    expect(layoutSectionOverridesFromConfig(next).home).toBeUndefined();
    expect(layoutSectionOverridesFromConfig(next).insights?.heatmap?.label).toBe("Heatmap X");
    expect(next.layoutOrder?.home).toBeUndefined();
    expect(next.layoutOrder?.insights).toEqual(["meds", "heatmap"]);
  });
});
