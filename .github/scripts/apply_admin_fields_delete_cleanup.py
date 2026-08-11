from pathlib import Path

storage = Path('src/lib/storage.ts')
text = storage.read_text()
old = '''/* ------------------- Day helpers ------------------- */
export function updateDayLog(
  update: (u: (d: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
    console.error("BIXBO rejected an invalid day-log date key:", date);
    return;
  }

  update((d) => ({
    ...d,
    dayLogs: {
      ...d.dayLogs,
      [date]: patch(d.dayLogs[date] ?? {}),
    },
  }));
}
'''
new = '''/* ------------------- Day helpers ------------------- */
function linkedCoreEntryIds(log: DayLog, featureId: string): Set<string> | null {
  const ids = (entries: Array<{ id: string }> | undefined) => new Set((entries ?? []).map((entry) => entry.id));
  switch (featureId) {
    case "pain": return ids(log.pain);
    case "tetany": return ids(log.tetany);
    case "panic": return ids(log.panic);
    case "heat": return ids(log.heat);
    case "food": return ids(log.food);
    case "bowel": return ids(log.bowel);
    case "sex": return ids(log.sex);
    case "workout": return ids(log.workout);
    case "meds": return ids(log.extraMeds);
    case "temp": return new Set([
      ...(log.temperatureEntries ?? []).map((entry) => entry.id),
      ...(log.weightEntries ?? []).map((entry) => entry.id),
    ]);
    default: return null;
  }
}

/** Remove only ID-linked supplementary records whose concrete core entry no longer exists. */
export function pruneOrphanedAdminFields(log: DayLog): DayLog {
  if (!log.adminFields) return log;
  let changed = false;
  const nextAdminFields: NonNullable<DayLog["adminFields"]> = {};

  Object.entries(log.adminFields).forEach(([featureId, entries]) => {
    const coreIds = linkedCoreEntryIds(log, featureId);
    if (coreIds == null) {
      nextAdminFields[featureId] = entries;
      return;
    }
    const kept = entries.filter((entry) => !entry.sourceEntryId || coreIds.has(entry.sourceEntryId));
    if (kept.length !== entries.length) changed = true;
    nextAdminFields[featureId] = kept;
  });

  return changed ? { ...log, adminFields: nextAdminFields } : log;
}

export function updateDayLog(
  update: (u: (d: BixboData) => BixboData) => void,
  date: string,
  patch: (log: DayLog) => DayLog,
) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
    console.error("BIXBO rejected an invalid day-log date key:", date);
    return;
  }

  update((d) => ({
    ...d,
    dayLogs: {
      ...d.dayLogs,
      [date]: pruneOrphanedAdminFields(patch(d.dayLogs[date] ?? {})),
    },
  }));
}
'''
if old not in text:
    raise SystemExit('updateDayLog block not found exactly')
storage.write_text(text.replace(old, new, 1))

test = Path('src/lib/__tests__/admin-entry-cleanup.test.ts')
test.write_text('''import { describe, expect, it } from "bun:test";\nimport { pruneOrphanedAdminFields, type DayLog } from "../storage";\n\ndescribe("supplementary admin entry cleanup", () => {\n  it("removes linked records when their core entry was deleted", () => {\n    const log: DayLog = {\n      pain: [{ id: "pain-kept", time: "09:00", score: 2, parts: [], quality: [], symptoms: [], note: "" }],\n      adminFields: {\n        pain: [\n          { id: "a", time: "09:00", sourceEntryId: "pain-kept", values: { custom: 2 } },\n          { id: "b", time: "10:00", sourceEntryId: "pain-deleted", values: { custom: 8 } },\n          { id: "legacy", time: "11:00", values: { custom: 4 } },\n        ],\n      },\n    };\n    const cleaned = pruneOrphanedAdminFields(log);\n    expect(cleaned.adminFields?.pain.map((entry) => entry.id)).toEqual(["a", "legacy"]);\n  });\n\n  it("does not prune day-level or unknown-feature supplementary values", () => {\n    const log: DayLog = { adminFields: { period: [{ id: "p", time: "09:00", sourceEntryId: "legacy-day-link", values: { custom: true } }] } };\n    expect(pruneOrphanedAdminFields(log).adminFields?.period).toEqual(log.adminFields?.period);\n  });\n});\n''')
