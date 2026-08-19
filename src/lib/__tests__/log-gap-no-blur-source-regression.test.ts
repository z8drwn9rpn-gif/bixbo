import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sheet = readFileSync("src/components/ui/sheet.tsx", "utf8");
const dialog = readFileSync("src/components/ui/dialog.tsx", "utf8");
const drawer = readFileSync("src/components/ui/drawer.tsx", "utf8");
const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
const logLayout = readFileSync("src/pain-log-layout-fixes.css", "utf8");
const profilePage = readFileSync("src/features/profile/ProfilePage.tsx", "utf8");

describe("log header source geometry", () => {
  it("does not reintroduce the shared SheetHeader margin above log actions", () => {
    expect(sheet).toContain('cn("flex flex-col gap-2 text-center sm:text-left", className)');
    expect(sheet).not.toContain('cn("mb-2 flex flex-col gap-2 text-center sm:text-left", className)');
  });

  it("removes the inherited full-screen SheetContent gap while preserving safe content clearance", () => {
    expect(logLayout).toContain('[data-bixbo-fullscreen-log="true"]');
    expect(logLayout).toContain("gap: 0 !important");
    expect(logLayout).toContain("margin-bottom: var(--bixbo-log-date-offset, 0px) !important");
    expect(logLayout).toContain("margin-bottom: calc(var(--bixbo-log-date-offset, 0px) + 12px) !important");
  });
});

describe("no blur at component source", () => {
  it("removes blur utilities and forces sheet overlays/footers to no backdrop filter", () => {
    expect(sheet).not.toContain("bg-black/45 backdrop-blur-sm");
    expect(sheet).toContain('backdropFilter: "none"');
    expect(sheet).toContain('WebkitBackdropFilter: "none"');
  });

  it("removes blur from dialog and drawer overlays and disables drawer background scaling", () => {
    expect(dialog).not.toContain("bg-black/45 backdrop-blur-sm");
    expect(drawer).not.toContain("bg-black/45 backdrop-blur-sm");
    expect(dialog).toContain('backdropFilter: "none"');
    expect(drawer).toContain('backdropFilter: "none"');
    expect(drawer).toContain("shouldScaleBackground = false");
  });

  it("keeps the app header and log action layers solid instead of backdrop blurred", () => {
    expect(appShell).not.toContain("backdrop-blur-xl");
    expect(appShell).not.toContain("supports-[backdrop-filter]");
    expect(appShell).toContain("border-b border-border/65 bg-background px-4");
    expect(logLayout).toContain("-webkit-backdrop-filter: none !important");
    expect(logLayout).toContain("backdrop-filter: none !important");
    expect(logLayout).toContain("background-color: var(--background) !important");
  });

  it("keeps Profile hub actions filter-free and restores Manage meds", () => {
    expect(profilePage).toContain('to="/meds"');
    expect(profilePage).toContain("Manage meds");
    expect(profilePage).not.toContain("backdrop-blur-md");
  });
});
