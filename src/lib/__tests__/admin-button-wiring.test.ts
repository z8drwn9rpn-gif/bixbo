import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const src = (path: string) => readFileSync(path, "utf8");

describe("admin button wiring regression guards", () => {
  it("routes Customize through explicit listeners instead of DOM button clicking", () => {
    const events = src("src/lib/adminCustomizeEvents.ts");
    expect(events).toContain("ADMIN_CUSTOMIZE_REQUESTED");
    expect(events).not.toContain("querySelectorAll");
    expect(events).not.toContain("button?.click");
    for (const path of [
      "src/components/AdminEditOverlay.tsx",
      "src/components/CoupleAdminEditOverlay.tsx",
      "src/components/HakAdminEditOverlay.tsx",
      "src/components/UniversalAdminPageEditor.tsx",
    ]) expect(src(path)).toContain("ADMIN_CUSTOMIZE_REQUESTED");
  });

  it("keeps Patterns page editing tied to the active sub-tab", () => {
    expect(src("src/routes/patterns.tsx")).toContain("data-bixbo-pattern-tab");
    expect(src("src/components/AdminEditOverlay.tsx")).toContain("patterns.${tab}");
  });

  it("keeps touch drag wired on every reorder editor", () => {
    for (const path of [
      "src/components/AdminEditOverlay.tsx",
      "src/components/CoupleAdminEditOverlay.tsx",
      "src/components/HakAdminEditOverlay.tsx",
      "src/components/UniversalAdminPageEditor.tsx",
      "src/components/NavigationAdminEditor.tsx",
      "src/components/AdminCustomPageBlocks.tsx",
      "src/components/LayoutOrderEditor.tsx",
    ]) {
      const text = src(path);
      expect(text).toContain("onPointerDown");
      expect(text).toContain('touchAction: "none"');
    }
  });

  it("applies published Universal page overrides at runtime", () => {
    const text = src("src/components/UniversalAdminPageEditor.tsx");
    expect(text).toContain("getEffectiveAdminConfig");
    expect(text).toContain("localPageConfig");
  });
});
