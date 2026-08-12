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

  it("keeps symptom-only updates separate in editor and Today preview", () => {
    const sheet = readFileSync(resolve(process.cwd(), "src/components/LogSheet.tsx"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
    expect(sheet).toContain('entryKind: quickSymptomUpdate ? "symptom-update" : undefined');
    expect(sheet).toContain('setSymptoms([])');
    expect(sheet).toContain('Save symptoms ✓');
    expect(home).toContain('<Card title="Add symptoms" icon="➕">');
  });
});
