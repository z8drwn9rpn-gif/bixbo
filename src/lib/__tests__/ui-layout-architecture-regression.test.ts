import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("UI layout architecture regressions", () => {
  it("keeps Pain navigation source-native and removes old fixed spacer coupling", () => {
    const pain = readFileSync("src/features/logging/PainWizard.tsx", "utf8");
    const css = readFileSync("src/ios-touch-stability.css", "utf8");
    expect(pain).not.toContain('pt-[68px]');
    expect(pain).not.toContain('style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}');
    expect(pain).toContain('className="sticky top-0');
    expect(css).not.toContain('> div > div.fixed.inset-x-0');
    expect(css).not.toContain(':has(> div.fixed.mt-6)');
  });

  it("renders Body & Recovery modes in React instead of CSS nth-of-type surgery", () => {
    const source = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");
    const css = readFileSync("src/ui-components-polish.css", "utf8");
    expect(source).toContain('{mode === "body" && (');
    expect(source).toContain('{mode === "recovery" && (');
    expect(css).not.toContain('section:nth-of-type(4)');
    expect(css).not.toContain('section:nth-of-type(3)');
  });

  it("keeps shared log Save action touch-friendly", () => {
    const source = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");
    expect(source).toContain('h-10 min-w-[104px]');
  });
});
