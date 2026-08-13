import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin BIXBO icons and HAK overlay regressions", () => {
  it("renders branded BIXBO icons in the feature icon picker", () => {
    const source = read("src/components/admin/AdminFeaturesTab.tsx");
    expect(source).toContain('import { Ico } from "@/components/icons/BixboIcons"');
    expect(source).toContain("<Ico e={feature.icon} size={24} />");
    expect(source).not.toContain("<select value={feature.icon}");
  });

  it("marks HAK as an admin-editable root and keeps HAK editor wiring available", () => {
    const index = [read("src/routes/index.tsx"), read("src/components/home/BirthControlCard.tsx")].join("\n");
    const admin = read("src/components/GlobalAdminModeController.tsx");
    const hak = read("src/components/HakAdminEditOverlay.tsx");
    expect(index).toContain('data-bixbo-hak-root="1"');
    expect(admin).toContain('requestAdminTool("page")');
    expect(admin).toContain('requestAdminTool("sections")');
    expect(hak).toContain('data-bixbo-admin-open="hak"');
  });
});
