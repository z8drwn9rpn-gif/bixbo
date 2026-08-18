import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

describe("home month summary", () => {
  it("keeps critical episode and symptom categories in the monthly summary", () => {
    const source = readFileSync("src/components/home/HomeSummaryOverlay.tsx", "utf8");

    for (const expected of [
      'log?.tetany ?? []',
      'log?.panic ?? []',
      'label: t("Tetany episodes")',
      'label: t("Panic attacks")',
      'Ico e="🧠"',
      'Ico e="💢"',
      'label: `${t("Hot flashes")} (avg)`',
      'label: `${t("Nausea")} (avg)`',
      'label: t("PCOS symptoms")',
      'label: t("Histamine flares")',
    ]) {
      expect(source).toContain(expected);
    }
  });

  it("includes the rest of the core day-log categories in every selected month", () => {
    const source = readFileSync("src/components/home/HomeSummaryOverlay.tsx", "utf8");

    for (const expected of [
      "temperatureEntries",
      "weightEntries",
      "log?.mood ?? []",
      "log?.energy ?? []",
      "log?.heat ?? []",
      "log?.extraMeds ?? []",
      "log?.customLogs ?? {}",
      "log?.adminFields ?? {}",
      'label: t("Blueberry")',
      'label: t("Notes")',
    ]) {
      expect(source).toContain(expected);
    }
  });
});
