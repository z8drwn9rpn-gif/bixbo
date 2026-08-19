import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const painLayoutCss = readFileSync("src/pain-log-layout-fixes.css", "utf8");
const noBlurCss = readFileSync("src/no-backdrop-blur.css", "utf8");
const appShellCss = readFileSync("src/app-shell.css", "utf8");
const summary = readFileSync("src/components/home/HomeSummaryOverlay.tsx", "utf8");
const primitives = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");
const cycle = readFileSync("src/features/logging/CycleForms.tsx", "utf8");
const registry = readFileSync("src/lib/appRegistry.ts", "utf8");
const slovak = readFileSync("src/lib/i18n/sk-6.ts", "utf8");

describe("Month Summary rendering", () => {
  it("keeps the dim layer but removes backdrop blur at the source", () => {
    expect(summary).toContain('data-bixbo-overlay-backdrop="month-summary"');
    expect(summary).toContain('className="absolute inset-0 bg-black/40"');
    expect(summary).not.toContain('bg-black/40 backdrop-blur-[1px]');
    expect(painLayoutCss).toContain('[data-bixbo-overlay-backdrop="month-summary"]');
    expect(painLayoutCss).toContain('-webkit-backdrop-filter: none !important;');
    expect(painLayoutCss).toContain('backdrop-filter: none !important;');
  });

  it("shows readable legacy custom-entry content instead of a mystery category", () => {
    expect(summary).toContain("function customLogEntryLabel(entry: unknown)");
    expect(summary).toContain('typeof record.text === "string"');
    expect(summary).toContain("customLogLabels");
    expect(summary).toContain('label: month.customLogLabels.length === 1 ? month.customLogLabels[0] : t("Saved entries")');
    expect(summary).not.toContain('label: t("Other saved entries")');
  });
});

describe("Shared log header spacing", () => {
  it("reserves the date offset for every standard SaveBar log", () => {
    expect(appShellCss).toContain('@import "./pain-log-layout-fixes.css";');
    expect(painLayoutCss).toContain('[data-bixbo-log-surface="standard"] [data-bixbo-log-save-bar]');
    expect(painLayoutCss).toContain('margin-bottom: var(--bixbo-log-date-offset, 0px) !important;');
  });

  it("uses one rule for every Pain page, including pages 1 and 5", () => {
    expect(painLayoutCss).toContain('[data-bixbo-log-surface="pain"] > div.flex.min-h-full.flex-col.px-5.pb-4.pt-0 > div.sticky');
    expect(painLayoutCss).toContain('margin-bottom: calc(var(--bixbo-log-date-offset, 0px) + 12px) !important;');
    expect(painLayoutCss).not.toContain('[data-bixbo-log-field-id="parts"]');
    expect(painLayoutCss).not.toContain('[data-bixbo-log-field-id="quality"]');
    expect(painLayoutCss).not.toContain('[data-bixbo-log-field-id="symptoms"]');
  });

  it("does not load the obsolete negative global log shift", () => {
    expect(appShellCss).not.toContain('log-header-spacing.css');
  });

  it("puts scale explanation sheets above the fixed date control", () => {
    expect(painLayoutCss).toContain('[role="dialog"][aria-modal="true"]');
    expect(painLayoutCss).toContain('z-index: 320 !important;');
  });
});

describe("No backdrop blur", () => {
  it("disables backdrop filtering across the BIXBO app while preserving other styling", () => {
    expect(appShellCss).toContain('@import "./no-backdrop-blur.css";');
    expect(noBlurCss).toContain('body[data-bixbo-app-root] *');
    expect(noBlurCss).toContain('-webkit-backdrop-filter: none !important;');
    expect(noBlurCss).toContain('backdrop-filter: none !important;');
  });

  it("keeps full-screen log headings crisp", () => {
    expect(noBlurCss).toContain('[data-bixbo-fullscreen-log="true"] h2');
    expect(noBlurCss).toContain('text-shadow: none !important;');
    expect(noBlurCss).toContain('filter: none !important;');
  });
});

describe("Cramp pain explanations", () => {
  it("uses the existing cramp field and canonical pain descriptions", () => {
    expect(cycle).toContain('const [cramps, setCramps] = useState<number | undefined>(cur?.cramps);');
    expect(cycle).toContain('descriptions={getScaleDesc(data, "pain")}');
    expect(cycle).toContain('legendTitle="Cramp pain scale"');
    expect((cycle.match(/const \[cramps, setCramps\]/g) ?? [])).toHaveLength(1);
    expect((registry.match(/id: "cramps"/g) ?? [])).toHaveLength(1);
  });

  it("keeps the functional info control and places it beside the Cramp pain heading", () => {
    expect(primitives).toContain('aria-label={t("Cramp pain scale")}');
    expect(painLayoutCss).toContain('button:is([aria-label="Cramp pain scale"], [aria-label="Stupnica bolesti pri kŕčoch"])');
    expect(painLayoutCss).toContain('grid-row: 1;');
    expect(painLayoutCss).toContain('grid-column: 2;');
    expect(slovak).toContain('"Cramp pain scale": "Stupnica bolesti pri kŕčoch"');
  });
});
