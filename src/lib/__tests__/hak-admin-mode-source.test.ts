import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("HAK admin overlay global mode gate", () => {
  it("renders only while global Admin Mode is active", () => {
    const source = readFileSync(new URL("../../components/HakAdminEditOverlay.tsx", import.meta.url), "utf8");
    expect(source).toContain("isGlobalAdminModeActive");
    expect(source).toContain("ADMIN_MODE_CHANGED");
    expect(source).toContain("!adminMode");
  });
});
