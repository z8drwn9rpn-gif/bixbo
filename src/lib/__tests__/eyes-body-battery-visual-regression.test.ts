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
    expect(wellnessIcons).toContain("export function BixboEyeSensitivityIcon");
    expect(eyesCard).toContain("<BixboEyeIcon");
    expect(eyesCard).not.toContain('icon="👁️"');
  });

  it("shows the Eyes edit title only once", () => {
    const translatedEyesTitles = eyesCard.match(/\{t\("Eyes"\)\}/g) ?? [];
    expect(translatedEyesTitles).toHaveLength(1);
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

  it("uses compact BIXBO sensitivity cards with persistent custom options", () => {
    expect(eyesForm).toContain('grid grid-cols-5 gap-1.5');
    expect(eyesForm).toContain("<BixboEyeSensitivityIcon");
    expect(eyesForm).toContain("eyesSensitivityOptions");
    expect(eyesForm).toContain('t("Add custom")');
    expect(eyesForm).not.toContain('{ value: "Sensitive to light", icon: "☀" }');
    expect(eyesForm).not.toContain('{ value: "Twitching / tetany feeling", icon: "⚡" }');
  });

  it("removes Other and renders custom sensitivity emoji as BIXBO artwork without a saved-card plus icon", () => {
    expect(eyesForm).not.toContain('{ value: "Other", icon: "other" }');
    expect(eyesForm).toContain('const HIDDEN_EYES_SENSITIVITY_OPTIONS = new Set(["Other"])');
    expect(eyesForm).toContain('import { BixboSafeText } from "@/components/icons/BixboSafeText"');
    expect(eyesForm).toContain("<BixboSafeText");
    expect(eyesForm).toContain("text={value}");
    expect(eyesForm).not.toContain('<BixboEyeSensitivityIcon variant="custom" size={30} />');
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
