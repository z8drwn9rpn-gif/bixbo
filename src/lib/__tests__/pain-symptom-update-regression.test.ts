import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { avgDayPain, type DayLog, type PainEntry } from "../storage";

const pain = (overrides: Partial<PainEntry>): PainEntry => ({ id: "p", time: "12:00", score: 8, parts: [], quality: [], symptoms: [], note: "", ...overrides });

describe("Pain symptom-only follow-ups", () => {
  it("does not count symptom updates as a second pain measurement", () => {
    const log: DayLog = { pain: [pain({ id: "real" }), pain({ id: "update", entryKind: "symptom-update", nausea: true, nauseaSeverity: 5 })] };
    expect(avgDayPain(log)).toBe(8);
  });

  it("keeps symptom-only data separate but nests linked updates under source pain", () => {
    const sheet = [readFileSync(resolve(process.cwd(), "src/components/LogSheet.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/LogSheetRoot.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/PainWizard.tsx"), "utf8")].join("\n");
    const home = [
      readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8"),
      readFileSync(resolve(process.cwd(), "src/components/home/DayOverview.tsx"), "utf8"),
    ].join("\n");
    expect(sheet).toContain('entryKind: quickSymptomUpdate || editingSymptomUpdate ? "symptom-update" : undefined');
    expect(sheet).toContain('setSymptoms([])');
    expect(sheet).toContain('setNauseaSymptoms([])');
    expect(sheet).toContain('nauseaSymptoms.map(stripEmoji)');
    expect(sheet).toContain('activePainStepId === "symptoms" ? "Next" : "Save"');
    expect(home).toContain('<Card title="Add symptoms" icon="➕">');
    expect(home).toContain('entry.sourcePainId === p.id');
    expect(home).toContain('p.symptoms.map(t).join(", ")');
    expect(home).toContain('{t("Nausea")} {t("symptoms")}:');
    expect(home).toContain('entry.entryKind === "symptom-update" && !entry.sourcePainId');
  });
});


it("repeated Add symptoms entries always attach to the latest real pain entry", () => {
  const source = [readFileSync(resolve(process.cwd(), "src/components/LogSheet.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/LogSheetRoot.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/PainWizard.tsx"), "utf8")].join("\n");
  expect(source).toContain('(data.dayLogs[date]?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update")');
  expect(source).toContain('setCopiedFromId(latestPain.id)');
});

it("quick Add symptoms keeps an optional note field", () => {
  const source = [readFileSync(resolve(process.cwd(), "src/components/LogSheet.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/LogSheetRoot.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/PainWizard.tsx"), "utf8")].join("\n");
  expect(source).toContain('quickSymptomUpdate && activePainStepId === "symptoms"');
  expect(source).toContain('placeholder={t("Add a note about what changed, what you were doing, or anything else…")}');
  expect(source).toContain('note: note.trim()');
});

it("PainWizard no longer contains hidden duplicate Tetany/Panic forms", () => {
  const source = [readFileSync(resolve(process.cwd(), "src/components/LogSheet.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/LogSheetRoot.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/PainWizard.tsx"), "utf8")].join("\n");
  expect(source).not.toContain('<div className="hidden" aria-hidden="true">\n          <Field label="Tetany episode?">');
  expect(source).not.toContain('// Panic (full inline log — under Tetany)');
});


it("editing an Add symptoms entry preserves symptom-update identity", () => {
  const source = [readFileSync(resolve(process.cwd(), "src/components/LogSheet.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/LogSheetRoot.tsx"), "utf8"), readFileSync(resolve(process.cwd(), "src/features/logging/PainWizard.tsx"), "utf8")].join("\n");
  expect(source).toContain('const editingSymptomUpdate = initialEntry?.entryKind === "symptom-update";');
  expect(source).toContain('useState(editingSymptomUpdate)');
  expect(source).toContain('if (editingSymptomUpdate && symptomsStepIndex >= 0) setStep(symptomsStepIndex);');
  expect(source).toContain('entryKind: quickSymptomUpdate || editingSymptomUpdate ? "symptom-update" : undefined');
  expect(source).toContain('(copiedFromId ?? initialEntry?.sourcePainId)');
});
