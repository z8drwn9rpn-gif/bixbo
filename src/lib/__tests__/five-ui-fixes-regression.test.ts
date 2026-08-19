import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const painLayoutCss = readFileSync("src/pain-log-layout-fixes.css", "utf8");
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

describe("Pain log explanation readability and spacing", () => {
  it("reserves the sticky header offset on Pain pages 2–5 without changing page 1", () => {
    expect(appShellCss).toContain('@import "./pain-log-layout-fixes.css";');
    expect(painLayoutCss).toContain('[data-bixbo-log-field-id="parts"]');
    expect(painLayoutCss).toContain('[data-bixbo-log-field-id="quality"]');
    expect(painLayoutCss).toContain('[data-bixbo-log-field-id="symptoms"]');
    expect(painLayoutCss).toContain(':has(> div.space-y-4.pt-1)');
    expect(painLayoutCss).toContain('margin-bottom: calc(var(--bixbo-log-date-offset, 0px) + 12px) !important;');
    expect(painLayoutCss).not.toContain('padding-top: 1rem !important;');
    expect(painLayoutCss).not.toContain('data-bixbo-log-field-id="score"');
  });

  it("puts scale explanation sheets above the fixed date control", () => {
    expect(painLayoutCss).toContain('[role="dialog"][aria-modal="true"]');
    expect(painLayoutCss).toContain('z-index: 320 !important;');
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
