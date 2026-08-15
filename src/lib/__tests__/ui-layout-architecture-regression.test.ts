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
    const css = readFileSync("src/ui-system.css", "utf8");
    expect(source).toContain('{mode === "body" && (');
    expect(source).toContain('{mode === "recovery" && (');
    expect(css).not.toContain('section:nth-of-type(4)');
    expect(css).not.toContain('section:nth-of-type(3)');
  });

  it("keeps shared log Save action touch-friendly", () => {
    const source = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");
    expect(source).toContain('h-10 min-w-[104px]');
  });
  it("keeps visual polish on stable component hooks instead of DOM-order patches", () => {
    const cycle = readFileSync("src/features/logging/CycleForms.tsx", "utf8");
    const log = readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");
    const notes = readFileSync("src/routes/notes.tsx", "utf8");
    const css = readFileSync("src/ui-system.css", "utf8");
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(cycle).toContain('data-bixbo-log-form="sex"');
    expect(cycle).toContain('data-bixbo-sex-section="symptoms"');
    expect(log).toContain("data-bixbo-log-menu");
    expect(log).not.toContain("radiusX");
    expect(notes).toContain("[&>span]:inline");
    expect(css).not.toContain("nth-of-type");
    expect(css).not.toContain(".mx-auto.flex.w-full.max-w-xl.flex-col.gap-4.pb-5");
    expect(css).not.toContain("--bixbo-bold-text");
    expect(shell).not.toMatch(/import "@\/.*\.css"/);
    expect(styles).toContain('@import "./ui-system.css";');
  });

});
