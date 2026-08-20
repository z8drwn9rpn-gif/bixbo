import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const eyesForm = readFileSync("src/features/logging/EyesForm.tsx", "utf8");
const eyesCard = readFileSync("src/components/home/DayOverviewEyesCard.tsx", "utf8");
const wellnessIcons = readFileSync("src/components/icons/BixboWellnessIcons.tsx", "utf8");
const painCss = readFileSync("src/pain-log-layout-fixes.css", "utf8");

describe("Eyes and Body Battery visual contract", () => {
  it("uses BIXBO-owned Eyes artwork instead of the platform eye emoji", () => {
    expect(wellnessIcons).toContain("export function BixboEyeIcon");
    expect(wellnessIcons).toContain("export function BixboEyePainIcon");
    expect(eyesCard).toContain("<BixboEyeIcon");
    expect(eyesCard).not.toContain('icon="👁️"');
  });

  it("keeps five backwards-compatible Eyes pain intensity levels", () => {
    expect(eyesForm).toContain('"none" | "something" | "mild" | "moderate" | "severe"');
    expect(eyesForm).toContain('label: "No pain"');
    expect(eyesForm).toContain('label: "Feeling something there"');
    expect(eyesForm).toContain('label: "Mild pain"');
    expect(eyesForm).toContain('label: "Moderate pain"');
    expect(eyesForm).toContain('label: "Severe pain"');
    expect(eyesForm).toContain("<BixboEyePainIcon");
  });

  it("supports persistent add, rename and delete for custom Vision changes", () => {
    expect(eyesForm).toContain("<CustomChipList");
    expect(eyesForm).toContain("eyesVisionChanges");
    expect(eyesForm).toContain("onAddCustom=");
    expect(eyesForm).toContain("onRemoveCustom=");
    expect(eyesForm).toContain("onRenameCustom=");
  });

  it("removes the legacy platform emoji row from Body Battery", () => {
    expect(painCss).toContain("Body Battery is a BIXBO-owned meter");
    expect(painCss).toContain("button:has(> div.grid.h-10.w-6.place-items-end.rounded-md)");
    expect(painCss).toContain("> span.text-\\[10px\\]");
    expect(painCss).toContain("display: none !important");
  });
});
