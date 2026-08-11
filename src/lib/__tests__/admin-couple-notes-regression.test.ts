import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin / Couple / Notes regressions", () => {
  it("uses route-specific direct admin editor triggers", () => {
    const events = read("src/lib/adminCustomizeEvents.ts");
    expect(events).toContain("data-bixbo-admin-open");
    expect(read("src/components/AdminEditOverlay.tsx")).toContain('data-bixbo-admin-open="primary"');
    expect(read("src/components/CoupleAdminEditOverlay.tsx")).toContain('data-bixbo-admin-open="couple"');
    expect(read("src/components/HakAdminEditOverlay.tsx")).toContain('data-bixbo-admin-open="hak"');
    expect(read("src/components/UniversalAdminPageEditor.tsx")).toContain('data-bixbo-admin-open="universal"');
  });

  it("keeps Notes explicitly focusable on iOS", () => {
    const source = read("src/routes/notes-editor.tsx");
    expect(source).toContain("focusEditorForTyping");
    expect(source).toContain('role="textbox"');
    expect(source).toContain('inputMode="text"');
    expect(source).toContain("onTouchStart={focusEditorForTyping}");
  });

  it("checks for a newer deployed asset bundle", () => {
    const source = read("src/lib/deploymentFreshness.ts");
    expect(source).toContain('cache: "no-store"');
    expect(source).toContain("window.location.reload()");
    expect(read("src/routes/__root.tsx")).toContain("useDeploymentFreshness();");
  });
});
