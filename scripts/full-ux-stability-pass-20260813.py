from pathlib import Path

ROOT = Path('.')

def read(path: str) -> str:
    return (ROOT / path).read_text()

def write(path: str, text: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing patch anchor: {label}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# P0 — one medication/adherence rule shared by Insights + PDF.
# -----------------------------------------------------------------------------
write('src/lib/medicationAdherence.ts', '''import { medScheduleItems, toKey, type Med } from "./storage";

export type MedicationLog = Record<string, Record<string, boolean>>;
export type MedicationLogItems = Record<string, Record<string, string[]>>;

export type ScheduledDoseState = {
  key: string;
  eligible: boolean;
  allItems: string[];
  selectedItems: string[];
  missedItems: string[];
};

export function scheduledTimeMinutes(time: string): number | null {
  if (!time) return null;
  const match = /^(\\d{1,2}):(\\d{2})/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function isMedicationDoseEligibleNow(
  dateKey: string,
  time: string,
  taken: boolean,
  now: Date,
): boolean {
  const today = toKey(now);
  if (dateKey < today) return true;
  if (dateKey > today) return false;
  if (taken) return true;

  const scheduled = scheduledTimeMinutes(time);
  if (scheduled == null) return false;
  return scheduled <= now.getHours() * 60 + now.getMinutes();
}

/**
 * Canonical grouped-scheduled-med resolver.
 * Legacy records that only have medLog=true mean the entire group was taken.
 * Modern medLogItems records mean only the explicitly selected items were taken.
 */
export function resolveScheduledDose(
  med: Med,
  dateKey: string,
  time: string,
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
  now: Date,
): ScheduledDoseState {
  const key = `${med.id}@${time}`;
  const allItems = medScheduleItems(med);
  const legacyTaken = medLog[dateKey]?.[key] === true;
  const rawSelected = medLogItems[dateKey]?.[key] ?? (legacyTaken ? allItems : []);
  const rawSet = new Set(rawSelected.filter((item) => allItems.includes(item)));
  const selectedItems = allItems.filter((item) => rawSet.has(item));
  const missedItems = allItems.filter((item) => !rawSet.has(item));

  return {
    key,
    eligible: isMedicationDoseEligibleNow(dateKey, time, legacyTaken || selectedItems.length > 0, now),
    allItems,
    selectedItems,
    missedItems,
  };
}

export function summarizeMedicationAdherence(
  med: Med,
  dates: string[],
  medLog: MedicationLog,
  medLogItems: MedicationLogItems,
  now: Date,
): { taken: number; expected: number; pct: number } | null {
  let expected = 0;
  let taken = 0;

  dates.forEach((dateKey) => {
    (med.times ?? []).forEach((time) => {
      const state = resolveScheduledDose(med, dateKey, time, medLog, medLogItems, now);
      if (!state.eligible) return;
      expected += state.allItems.length;
      taken += state.selectedItems.length;
    });
  });

  return expected
    ? { taken, expected, pct: Math.round((taken / expected) * 100) }
    : null;
}
''')

# Insights uses the canonical grouped-dose resolver.
path = 'src/routes/insights.tsx'
s = read(path)
s = s.replace('  medScheduleItems,\n', '', 1)
s = replace_once(
    s,
    '} from "@/lib/storage";\n',
    '} from "@/lib/storage";\nimport { resolveScheduledDose } from "@/lib/medicationAdherence";\n',
    'Insights medication adherence import',
)
if 'function scheduledTimeMinutes(' in s:
    start = s.index('function scheduledTimeMinutes(')
    end = s.index('function InsightPeriodSelect(', start)
    s = s[:start] + s[end:]
old = '''        scheduled.forEach((med) => {
          const scheduleItems = medScheduleItems(med);
          med.times.forEach((time) => {
            const key = `${med.id}@${time}`;
            const isTaken = !!data.medLog[date]?.[key];

            if (!isDoseEligibleNow(date, time, isTaken, adherenceNow)) return;

            expected += scheduleItems.length;
            const storedItems = data.medLogItems?.[date]?.[key];
            const selectedItems = storedItems ?? (isTaken ? scheduleItems : []);
            const selectedSet = new Set(selectedItems.filter((item) => scheduleItems.includes(item)));

            scheduleItems.forEach((item) => {
              if (selectedSet.has(item)) {
                taken += 1;
                takenList.push({ medName: item, time, key, item });
              } else {
                missed.push({ medName: item, time, key, item });
              }
            });
          });
        });'''
new = '''        scheduled.forEach((med) => {
          med.times.forEach((time) => {
            const state = resolveScheduledDose(
              med,
              date,
              time,
              data.medLog,
              data.medLogItems ?? {},
              adherenceNow,
            );
            if (!state.eligible) return;

            expected += state.allItems.length;
            taken += state.selectedItems.length;
            state.selectedItems.forEach((item) =>
              takenList.push({ medName: item, time, key: state.key, item }),
            );
            state.missedItems.forEach((item) =>
              missed.push({ medName: item, time, key: state.key, item }),
            );
          });
        });'''
s = replace_once(s, old, new, 'Insights per-day grouped adherence')
old = '''              days.forEach((date) => {
                const key = `${med.id}@${time}`;
                const isTaken = !!data.medLog[date]?.[key];

                if (!isDoseEligibleNow(date, time, isTaken, adherenceNow)) return;

                expected += 1;
                const allItems = medScheduleItems(med);
                const storedItems = data.medLogItems?.[date]?.[key];
                const selectedItems = storedItems ?? (isTaken ? allItems : []);
                if (selectedItems.includes(item)) taken += 1;
              });'''
new = '''              days.forEach((date) => {
                const state = resolveScheduledDose(
                  med,
                  date,
                  time,
                  data.medLog,
                  data.medLogItems ?? {},
                  adherenceNow,
                );
                if (!state.eligible) return;

                expected += 1;
                if (state.selectedItems.includes(item)) taken += 1;
              });'''
s = replace_once(s, old, new, 'Insights per-med grouped adherence')
write(path, s)

# PDF uses the exact same resolver/summary as Insights.
path = 'src/components/HealthReportPageV3.tsx'
s = read(path)
s = s.replace('BRISTOL, EMPTY, medScheduleItems, useBixbo, type DayLog, type Med', 'BRISTOL, EMPTY, useBixbo, type DayLog, type Med', 1)
s = replace_once(
    s,
    'import { useI18n } from "@/hooks/useI18n";\n',
    'import { useI18n } from "@/hooks/useI18n";\nimport { resolveScheduledDose, summarizeMedicationAdherence } from "@/lib/medicationAdherence";\n',
    'PDF medication adherence import',
)
if 'function scheduledTimeMinutes(' in s:
    start = s.index('function scheduledTimeMinutes(')
    end = s.index('function doseSummary(', start)
    s = s[:start] + s[end:]
start = s.index('function doseSummary(')
end = s.index('function takenText(', start)
s = s[:start] + '''function doseSummary(m:Med,days:RDay[],medLog:MedLog,medLogItems:MedLogItems,now:Date) {
  return summarizeMedicationAdherence(m, days.map(d=>d.key), medLog, medLogItems, now);
}
''' + s[end:]
start = s.index('function takenText(')
end = s.index('function extraText(', start)
s = s[:start] + '''function takenText(d:RDay,meds:Med[],medLog:MedLog,medLogItems:MedLogItems) {
  const counts=new Map<string,number>(),now=new Date(`${d.key}T23:59:59`);
  meds.filter(m=>!m.asNeeded).forEach(m=>(m.times??[]).forEach(time=>{
    const state=resolveScheduledDose(m,d.key,time,medLog,medLogItems,now);
    state.selectedItems.forEach(item=>counts.set(item,(counts.get(item)??0)+1));
  }));
  return [...counts].map(([name,count])=>`${name}${count>1?` ${count}x`:""}`).join(", ")||"—";
}
''' + s[end:]
write(path, s)

# -----------------------------------------------------------------------------
# P2/P3 — keep every field, but make the common save path much shorter.
# Existing DayPreview already uses tap-to-edit + separate trash for the core logs;
# add consistent quick-save affordances to the three longest symptom flows.
# -----------------------------------------------------------------------------
path = 'src/components/LogSheet.tsx'
s = read(path)
anchor = '''function SaveBar({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {'''
idx = s.index(anchor)
end_marker = '\n}\n\nfunction CustomChipList'
end = s.index(end_marker, idx) + 2
quick_component = '''

function QuickSaveAction({ label, onSave }: { label: string; onSave: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onSave}
      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 text-sm font-semibold text-primary ring-1 ring-primary/25 transition active:scale-[0.99]"
    >
      <span aria-hidden="true">✓</span>
      <span>{t(label)}</span>
    </button>
  );
}
'''
if 'function QuickSaveAction(' not in s:
    s = s[:end] + quick_component + s[end:]

# Pain: one-tap save after intensity; details remain available through Next.
pain_anchor = '''          <div className="w-full px-2">
            <ScaleLegend
              max={10}
              from={0}
              descriptions={getScaleDesc(data, "pain")}
              value={Math.round(score)}
              title={t("Pain scale (Mankosky)")}
            />
          </div>'''
pain_new = pain_anchor + '''
          {!initialEntry && !quickSymptomUpdate ? (
            <div className="w-full px-2">
              <QuickSaveAction label="Save pain now — add details later" onSave={save} />
            </div>
          ) : null}'''
s = replace_once(s, pain_anchor, pain_new, 'Pain quick save')

# Panic: save the basic episode immediately after intensity; all remaining fields stay below.
panic_anchor = '''      <Field label={`Intensity ${intensity}/10`} schemaFieldId="intensity">
        <IntensityScale
          value={intensity}
          onChange={setIntensity}
          max={10}
          descriptions={getScaleDesc(data, "panic")}
          legendTitle="Panic intensity scale" schemaFieldId="intensity"
        />
      </Field>'''
panic_new = panic_anchor + '''
      <QuickSaveAction label="Save basic panic episode" onSave={save} />'''
s = replace_once(s, panic_anchor, panic_new, 'Panic quick save')

# Tetany: same interaction grammar as Panic.
tetany_anchor = '''      <Field label={`Intensity ${intensity}/5`} schemaFieldId="intensity">
        <IntensityScale
          value={intensity}
          onChange={setIntensity}
          max={5}
          descriptions={getScaleDesc(data, "tetany")}
          legendTitle="Tetany intensity scale" schemaFieldId="intensity"
        />
      </Field>'''
tetany_new = tetany_anchor + '''
      <QuickSaveAction label="Save basic tetany episode" onSave={save} />'''
s = replace_once(s, tetany_anchor, tetany_new, 'Tetany quick save')
write(path, s)

# -----------------------------------------------------------------------------
# P4 — Profile was already a hub/subpage architecture. Clarify its hierarchy
# without changing routes, data or controls.
# -----------------------------------------------------------------------------
path = 'src/routes/profile.tsx'
s = read(path)
s = s.replace('{t("Health Hub")}', '{t("Health & progress")}', 1)
s = s.replace('{t("Preferences")}', '{t("Preferences & app")}', 1)
write(path, s)

# -----------------------------------------------------------------------------
# Regression coverage: shared adherence, cloud merge, and edit contract.
# -----------------------------------------------------------------------------
write('src/lib/__tests__/medication-adherence.test.ts', '''import { describe, expect, it } from "bun:test";

import { resolveScheduledDose, summarizeMedicationAdherence } from "../medicationAdherence";
import type { Med } from "../storage";

const med: Med = {
  id: "evening",
  name: "Omega-3 2x, Iron",
  times: ["18:00"],
};

describe("grouped scheduled medication adherence", () => {
  it("counts only the selected item in a partially taken group", () => {
    const medLog = { "2026-08-12": { "evening@18:00": true } };
    const medLogItems = { "2026-08-12": { "evening@18:00": ["Iron"] } };
    const now = new Date("2026-08-13T12:00:00");

    const state = resolveScheduledDose(med, "2026-08-12", "18:00", medLog, medLogItems, now);
    expect(state.selectedItems).toEqual(["Iron"]);
    expect(state.missedItems).toEqual(["Omega-3 2x"]);

    expect(summarizeMedicationAdherence(med, ["2026-08-12"], medLog, medLogItems, now)).toEqual({
      taken: 1,
      expected: 2,
      pct: 50,
    });
  });

  it("keeps old whole-group taken records backward compatible", () => {
    const medLog = { "2026-08-12": { "evening@18:00": true } };
    const now = new Date("2026-08-13T12:00:00");
    const state = resolveScheduledDose(med, "2026-08-12", "18:00", medLog, {}, now);
    expect(state.selectedItems).toEqual(["Omega-3 2x", "Iron"]);
  });

  it("excludes a not-yet-due dose today", () => {
    const now = new Date("2026-08-12T12:00:00");
    expect(summarizeMedicationAdherence(med, ["2026-08-12"], {}, {}, now)).toBeNull();
  });
});
''')

# Add sync tests without changing existing cases.
path = 'src/lib/__tests__/merge.test.ts'
s = read(path)
insert = '''

  it("syncs granular grouped-med selections from cloud to a fresh device", () => {
    const local = clone();
    const remote = clone();
    remote.medLog["2026-08-12"] = { "evening@18:00": true };
    remote.medLogItems = { "2026-08-12": { "evening@18:00": ["Iron"] } };
    remote.medLogNotes = { "2026-08-12": { "evening@18:00": "Skipped omega-3" } };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: false });
    expect(merged.medLogItems?.["2026-08-12"]?.["evening@18:00"]).toEqual(["Iron"]);
    expect(merged.medLogNotes?.["2026-08-12"]?.["evening@18:00"]).toBe("Skipped omega-3");
  });

  it("does not replace an existing device's granular grouped-med selection with stale legacy group data", () => {
    const local = clone();
    const remote = clone();
    local.medLog["2026-08-12"] = { "evening@18:00": true };
    local.medLogItems = { "2026-08-12": { "evening@18:00": ["Iron"] } };
    remote.medLog["2026-08-12"] = { "evening@18:00": true };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    expect(merged.medLogItems?.["2026-08-12"]?.["evening@18:00"]).toEqual(["Iron"]);
  });
'''
last = s.rfind('\n});')
if last < 0:
    raise SystemExit('merge.test.ts describe ending not found')
s = s[:last] + insert + s[last:]
write(path, s)

write('src/lib/__tests__/day-preview-edit-contract.test.ts', '''import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf8");

describe("DayPreview edit interaction contract", () => {
  it("keeps tap-to-edit wiring for every editable health log shown in the daily overview", () => {
    for (const category of ["panic", "tetany", "sex", "heat", "food", "bowel", "workout", "task", "event"]) {
      expect(source).toContain(`onEdit?.("${category}"`);
    }
    expect(source).toContain("onEditPain?.(p)");
    expect(source).toContain('onEdit?.("temp", undefined)');
    expect(source).toContain('onEdit?.("meds", e)');
    expect(source).toContain('onEdit?.(`custom:${definition.id}`, entry)');
  });

  it("keeps delete controls separate from entry edit buttons", () => {
    expect(source).toContain("function DeleteBtn");
    expect(source).toContain('aria-label={t("Delete")}');
  });
});
''')
