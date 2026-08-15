import { describe, expect, it } from "vitest";
import fs from "node:fs";

const deviceAdmin = fs.readFileSync("src/lib/deviceAdmin.ts", "utf8");
const homePage = fs.readFileSync("src/features/home/HomePage.tsx", "utf8");

describe("owner-only HAK visibility", () => {
  it("recognizes the owner by stable user id or the configured owner email", () => {
    expect(deviceAdmin).toContain('const ADMIN_USER_ID = "ec7819b0-aed8-4a77-a0d8-3ce2e82fc531"');
    expect(deviceAdmin).toContain('const ADMIN_EMAIL = "lucia.pp2@icloud.com"');
    expect(deviceAdmin).toContain("getCurrentStoredAuthUserId() === ADMIN_USER_ID");
    expect(deviceAdmin).toContain("getCurrentStoredAuthEmail() === ADMIN_EMAIL");
  });

  it("reads email from the persisted Supabase session instead of returning a stub", () => {
    expect(deviceAdmin).toContain("normalizeEmail(user?.email)");
    expect(deviceAdmin).not.toContain("export function getCurrentStoredAuthEmail(): string | null {\n  return null;");
  });

  it("keeps the HAK calendar owner-only and hidden in male mode", () => {
    expect(homePage).toContain("!maleMode && isAdminOwnerAccount()");
    expect(homePage).toContain("<BirthControlSummaryCard");
    expect(homePage).toContain("<BirthControlOverlay");
  });
});
