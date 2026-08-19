import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const deviceCss = readFileSync("src/device-rendering-fixes.css", "utf8");
const painLayoutCss = readFileSync("src/pain-log-layout-fixes.css", "utf8");
const appShellCss = readFileSync("src/app-shell.css", "utf8");
const summary = readFileSync("src/components/home/HomeSummaryOverlay.tsx", "utf8");
const logSheet = readFileSync("src/components/LogSheet.tsx", "utf8");
const primitives = readFileSync("src/features/logging/LogFormPrimitives.tsx", "utf8");
const cycle = readFileSync("src/features/logging/CycleForms.tsx", "utf8");
const registry = readFileSync("src/lib/appRegistry.ts", "utf8");
const slovak = readFileSync("src/lib/i18n/sk-6.ts", "utf8");

describe("iPhone standalone Month Summary rendering", () => {
  it("keeps the normal dim + backdrop blur styling for normal browsers", () => {
    expect(summary).toContain('data-bixbo-overlay-backdrop="month-summary"');
    expect(summary).toContain('bg-black/40 backdrop-blur-[1px]');
  });

  it("marks iOS standalone mode before paint and not ordinary browser mode", () => {
    expect(root).toContain('const isIOS = /iPhone|iPad|iPod/i.test(ua)');
    expect(root).toContain('const isStandalone = navigator.standalone === true');
    expect(root).toContain('if (isIOS && isStandalone) root.dataset.bixboIosStandalone = "true";');
    expect(root).toContain('else delete root.dataset.bixboIosStandalone;');
  });

  it("removes only the Month Summary backdrop filter in iOS standalone mode", () => {
    expect(deviceCss).toContain('html[data-bixbo-ios-standalone="true"] [data-bixbo-overlay-backdrop="month-summary"]');
    expect(deviceCss).toContain('backdrop-filter: none !important;');
    expect(deviceCss).toContain('-webkit-backdrop-filter: none !important;');
    expect(deviceCss).not.toContain('html [data-bixbo-overlay-backdrop="month-summary"] {');
  });
});

describe("Pain log explanation readability and spacing", () => {
  it("keeps the date control addressable and hides it while shared scale legends are open", () => {
    expect(logSheet).toContain("data-bixbo-log-date-control");
    expect(primitives).toContain("markScaleLegendOpen");
    expect(deviceCss).toContain('html[data-bixbo-scale-legend-open="true"] [data-bixbo-log-date-control]');
  });

  it("also protects the main Pain scale explanation dialog", () => {
    expect(painLayoutCss).toContain('html:has(.fixed.inset-0[role="presentation"] [role="dialog"][aria-modal="true"]) [data-bixbo-log-date-control]');
  });

  it("standardizes the header-to-question gap on Pain pages 2–5 only", () => {
    expect(appShellCss).toContain('@import "./pain-log-layout-fixes.css";');
    expect(painLayoutCss).toContain('[data-bixbo-log-field-id="parts"]');
    expect(painLayoutCss).toContain('[data-bixbo-log-field-id="quality"]');
    expect(painLayoutCss).toContain('[data-bixbo-log-field-id="symptoms"]');
    expect(painLayoutCss).toContain('> div.space-y-4.pt-1');
    expect(painLayoutCss).toContain('padding-top: 1rem !important;');
    expect(painLayoutCss).not.toContain('data-bixbo-log-field-id="score"');
  });
});

describe("Cramp pain explanations", () => {
  it("uses the existing cramp field and its canonical saved pain descriptions", () => {
    expect(cycle).toContain('const [cramps, setCramps] = useState<number | undefined>(cur?.cramps);');
    expect(cycle).toContain('descriptions={getScaleDesc(data, "pain")}');
    expect(cycle).toContain('legendTitle="Cramp pain scale"');
    expect((cycle.match(/const \[cramps, setCramps\]/g) ?? [])).toHaveLength(1);
    expect((registry.match(/id: "cramps"/g) ?? [])).toHaveLength(1);
  });

  it("shows a dedicated mobile-accessible legend for that existing scale", () => {
    expect(primitives).toContain('const ownsCrampLegend = legendTitle === "Cramp pain scale" && Boolean(descriptions);');
    expect(primitives).toContain('aria-label={t("Cramp pain scale")}');
    expect(primitives).toContain('title="Cramp pain scale"');
    expect(slovak).toContain('"Cramp pain scale": "Stupnica bolesti pri kŕčoch"');
  });
});

describe("Month Summary wording", () => {
  it("uses a clearer label without removing historical custom entries", () => {
    expect(summary).toContain('month.customLogCount ?');
    expect(summary).toContain('label: t("Other saved entries")');
    expect(slovak).toContain('"Other saved entries": "Ďalšie uložené záznamy"');
  });
});
