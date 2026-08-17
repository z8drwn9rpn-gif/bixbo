import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("UI layout architecture regressions", () => {
  it("keeps Pain navigation source-native and removes old fixed spacer coupling", () => {
    const pain = readFileSync("src/features/logging/PainWizard.tsx", "utf8");
    const css = readFileSync("src/mobile-stability.css", "utf8");
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
    const nav = readFileSync("src/components/BottomNav.tsx", "utf8");
    const notes = readFileSync("src/routes/notes.tsx", "utf8");
    const css = readFileSync("src/ui-system.css", "utf8");
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(cycle).toContain('data-bixbo-log-form="sex"');
    expect(cycle).toContain('data-bixbo-sex-section="symptoms"');
    expect(log).toContain("data-bixbo-log-menu");
    expect(log).toContain('body.dataset.bixboLogMenuOpen = "true"');
    expect(log).not.toContain('modal={Boolean(active)}');
    expect(log).toContain('orderedCats.length === 9 ? "grid-cols-10" : "grid-cols-5"');
    expect(log).toContain('orderedCats.length === 9 && index === 5 ? "col-start-2" : ""');
    expect(log).not.toContain("const radiusX = 112;");
    expect(nav).toContain("data-bixbo-bottom-nav");
    expect(notes).toContain("[&>span]:inline");
    expect(css).toContain('body[data-bixbo-log-menu-open="true"] [data-bixbo-bottom-nav]');
    expect(css).not.toContain("nth-of-type");
    expect(css).not.toContain(".mx-auto.flex.w-full.max-w-xl.flex-col.gap-4.pb-5");
    expect(css).not.toContain("--bixbo-bold-text");
    expect(shell).not.toMatch(/import "@\/.*\.css"/);
    expect(styles).toContain('@import "./ui-system.css";');
  });

  it("keeps calendar visuals on semantic component hooks instead of DOM-shape patches", () => {
    const calendar = readFileSync("src/components/MonthCalendar.tsx", "utf8");
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const css = readFileSync("src/calendar-system.css", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const appShell = readFileSync("src/app-shell.css", "utf8");

    expect(calendar).toContain("data-bixbo-calendar-day");
    expect(calendar).toContain("bixbo-calendar-day-disc");
    expect(calendar).toContain("data-bixbo-period-level");
    expect(calendar).toContain('data-bixbo-today={isToday?"true":undefined}');
    expect(home).not.toContain("calendarRef");
    expect(home).not.toContain('querySelectorAll<HTMLButtonElement>("button.rounded-xl")');
    expect(css).not.toContain("nth-child");
    expect(css).not.toContain('[style*=');
    expect(css).not.toContain("> div > div");
    expect(root).toContain('import appCss from "../app-shell.css?url";');
    expect(appShell).toContain('@import "./calendar-system.css";');
    expect(root).not.toContain("calendar-3d.css");
    expect(root).not.toContain("calendar-period-fix.css");
  });


  it("keeps light and dark colour ownership in one canonical theme system", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    const theme = readFileSync("src/theme-system.css", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const appShell = readFileSync("src/app-shell.css", "utf8");
    const runtimeTheme = readFileSync("src/lib/theme.ts", "utf8");

    expect(styles).not.toContain("Final BIXBO Moss Green light palette");
    expect(styles).not.toContain("Final BIXBO Soft Olive dark palette");
    expect(styles).not.toContain("BIXBO Moss Green light theme");
    expect(styles).not.toContain("BIXBO — SOFT OLIVE DARK");
    expect(styles).not.toContain("#98A86A");
    expect(styles).not.toContain("#4B5133");
    expect(styles).not.toContain("saturate(0.92)");
    expect(styles).toContain("background: var(--background);");
    expect(theme).toContain(":root:not(.dark)");
    expect(theme).toContain("--background: #FBF7F3;");
    expect(theme).toContain("--background: #171A14;");
    expect(theme).toContain("--destructive:");
    expect(theme).toContain("--period-veryheavy:");
    expect(theme).toContain("--pain-10: #c81746;");
    expect(root).toContain('import appCss from "../app-shell.css?url";');
    expect(appShell).toContain('@import "./theme-system.css";');
    expect(root).not.toContain("white-green-theme.css");
    expect(root).not.toContain("dark-theme.css");
    expect(runtimeTheme).toContain('const LIGHT_THEME_COLOR = "#FBF7F3";');
    expect(runtimeTheme).toContain('const DARK_THEME_COLOR = "#171A14";');
    const hak = readFileSync("src/components/home/BirthControlCard.tsx", "utf8");
    expect(hak).toContain('data-bixbo-hak-wheel-center="1"');
    expect(theme).toContain('[data-bixbo-hak-wheel-center="1"]');
    expect(theme).not.toContain(".absolute.inset-");
    expect(theme).not.toContain("section.mt-4.rounded-3xl");
  });

  it("keeps mobile and iOS stability rules in one canonical stylesheet", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    const mobile = readFileSync("src/mobile-stability.css", "utf8");

    expect(styles).toContain('@import "./mobile-stability.css";');
    expect(styles).not.toContain("ios-touch-stability.css");
    expect(styles).not.toContain("mobile-overlay-stability.css");
    expect(existsSync("src/ios-touch-stability.css")).toBe(false);
    expect(existsSync("src/mobile-overlay-stability.css")).toBe(false);
    expect(mobile).toContain("[data-bixbo-fullscreen-log=\"true\"]");
    expect(mobile).toContain(".bixbo-page-fade");
    expect(mobile).toContain("touch-action: pan-x pan-y;");
  });

});
