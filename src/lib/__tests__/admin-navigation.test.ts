import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";
import type { AdminConfig } from "../appRegistry";

function navOrder(config: AdminConfig, surface: "mobile" | "desktop") {
  const defaults = [
    { id: "home", order: 10, desktopOrder: 10, mobile: true, desktop: true },
    { id: "overview", order: 20, desktopOrder: 20, mobile: true, desktop: true },
    { id: "log", order: 30, desktopOrder: 0, mobile: true, desktop: true },
    { id: "couple", order: 40, desktopOrder: 40, mobile: true, desktop: true },
    { id: "notes", order: 50, desktopOrder: 50, mobile: true, desktop: true },
    { id: "healthProfile", order: 60, desktopOrder: 60, mobile: false, desktop: true },
  ];
  return defaults
    .filter((item) => item[surface])
    .filter((item) => config.navigation?.items?.[item.id]?.hidden !== true)
    .sort((a, b) => (config.navigation?.items?.[a.id]?.order ?? (surface === "desktop" ? a.desktopOrder : a.order)) - (config.navigation?.items?.[b.id]?.order ?? (surface === "desktop" ? b.desktopOrder : b.order)))
    .map((item) => item.id);
}

describe("admin navigation config", () => {
  it("keeps the original mobile and desktop default positions", () => {
    expect(navOrder({}, "mobile")).toEqual(["home", "overview", "log", "couple", "notes"]);
    expect(navOrder({}, "desktop")).toEqual(["log", "home", "overview", "couple", "notes", "healthProfile"]);
  });

  it("deep-merges global and local navigation item overrides", () => {
    const merged = mergeAdminConfigs(
      { navigation: { items: { home: { label: "Start" }, notes: { hidden: true } } } },
      { navigation: { items: { home: { order: 50 }, log: { label: "Quick add" } } } },
    );
    expect(merged.navigation?.items?.home).toEqual({ label: "Start", order: 50 });
    expect(merged.navigation?.items?.notes?.hidden).toBe(true);
    expect(merged.navigation?.items?.log?.label).toBe("Quick add");
  });
});
