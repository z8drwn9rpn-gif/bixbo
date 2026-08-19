import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const logCss = readFileSync("src/pain-log-layout-fixes.css", "utf8");
const noBlurCss = readFileSync("src/no-backdrop-blur.css", "utf8");
const profile = readFileSync("src/features/profile/ProfilePage.tsx", "utf8");
const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

describe("full-screen log header geometry", () => {
  it("removes the shared SheetHeader margin instead of pulling the form upward", () => {
    expect(logCss).toContain('[data-bixbo-fullscreen-log="true"] > div.flex.h-full.min-h-0.flex-col > div.mb-2');
    expect(logCss).toContain("margin-bottom: 0 !important;");
    expect(logCss).toContain('[data-bixbo-log-surface="standard"] [data-bixbo-log-save-bar]');
    expect(logCss).toContain("margin-bottom: var(--bixbo-log-date-offset, 0px) !important;");
    expect(logCss).not.toContain("margin-top: -0.5rem");
  });
});

describe("Home wordmark sharpness", () => {
  it("removes the Home-only display shadow at the final CSS layer", () => {
    expect(home).toContain("data-bixbo-display-title");
    expect(noBlurCss).toContain('header[data-bixbo-app-header][data-bixbo-home-header="true"] h1[data-bixbo-app-title] [data-bixbo-display-title]');
    expect(noBlurCss).toContain("text-shadow: none !important;");
    expect(noBlurCss).toContain("-webkit-transform: none !important;");
  });
});

describe("Profile medication management access", () => {
  it("keeps Manage meds visible from the Profile hub without entering Edit mode", () => {
    expect(profile).toContain('to="/meds"');
    expect(profile).toContain('aria-label="Manage medications"');
    expect(profile).toContain("Manage meds");
  });
});
