import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

for (const file of ["AdminEditOverlay.tsx", "CoupleAdminEditOverlay.tsx", "HakAdminEditOverlay.tsx"]) {
  describe(`${file} global Admin Mode gate`, () => {
    it("uses the shared session mode instead of relying only on CSS hiding", () => {
      const source = readFileSync(new URL(`../../components/${file}`, import.meta.url), "utf8");
      expect(source).toContain("isGlobalAdminModeActive");
      expect(source).toContain("ADMIN_MODE_CHANGED");
      expect(source).toContain("!adminMode");
    });
  });
}
