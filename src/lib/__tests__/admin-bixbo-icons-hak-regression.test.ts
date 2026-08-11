import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin BIXBO icons and HAK overlay regressions", () => {
  it("renders branded BIXBO icons in the feature icon picker", () => {
    const source = read("src/components/AdminEditOverlay.tsx");
    expect(source).toContain('import { Ico } from "@/components/icons/BixboIcons"');
    expect(source).toContain("<Ico e={feature.icon} size={24} />");
    expect(source).not.toContain("<select value={feature.icon}");
  });

  it("marks HAK as an admin-editable root and routes HAK tools to its editor", () => {
    const index = read("src/routes/index.tsx");
    const admin = read("src/components/GlobalAdminModeController.tsx");
    expect(index).toContain('data-bixbo-hak-root="1"');
    expect(admin).toContain('document.querySelector("[data-bixbo-hak-root]")');
    expect(admin).toContain('if (hakOpen && tool !== "navigation")');
  });
});
