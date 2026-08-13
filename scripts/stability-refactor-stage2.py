from pathlib import Path


def must_replace(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'Expected block not found in {path}: {old[:120]!r}')
    s2 = s.replace(old, new, count)
    p.write_text(s2)

# 1) Security/release hygiene: .env must not be tracked. .env.example remains.
env = Path('.env')
if env.exists():
    env.unlink()

# 2) Move stable pure helpers out of storage.ts while keeping compatibility exports.
storage = Path('src/lib/storage.ts')
s = storage.read_text()
old_period = '''export type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "very-heavy";\nexport function periodLabel(level?: PeriodLevel | null): string {\n  switch (level) {\n    case "spotting":\n      return "Spotting";\n    case "light":\n      return "Light";\n    case "medium":\n      return "Medium";\n    case "heavy":\n      return "Heavy";\n    case "very-heavy":\n      return "Very heavy";\n    default:\n      return "";\n  }\n}\n'''
new_period = '''export type { PeriodLevel } from "./domain/cycle";\nexport { periodLabel } from "./domain/cycle";\nimport type { PeriodLevel } from "./domain/cycle";\n'''
if old_period not in s:
    raise SystemExit('PeriodLevel/periodLabel block not found in storage.ts')
s = s.replace(old_period, new_period, 1)
old_pain_helpers = '''export function painColor(score: number): string {\n  const n = Math.max(0, Math.min(10, Math.round(score)));\n  return `var(--pain-${n})`;\n}\nexport function avgDayPain(log?: DayLog): number | undefined {\n  const measurements = (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");\n  if (!measurements.length) return undefined;\n  const sum = measurements.reduce((s, entry) => s + entry.score, 0);\n  return sum / measurements.length;\n}\n'''
new_pain_helpers = '''export { painColor, avgDayPain } from "./domain/pain";\n'''
if old_pain_helpers not in s:
    raise SystemExit('painColor/avgDayPain block not found in storage.ts')
s = s.replace(old_pain_helpers, new_pain_helpers, 1)
storage.write_text(s)

Path('src/lib/domain/cycle.ts').write_text('''/** Cycle-domain primitives that do not depend on persisted storage. */\nexport type PeriodLevel = "" | "spotting" | "light" | "medium" | "heavy" | "very-heavy";\n\nexport function periodLabel(level?: PeriodLevel | null): string {\n  switch (level) {\n    case "spotting": return "Spotting";\n    case "light": return "Light";\n    case "medium": return "Medium";\n    case "heavy": return "Heavy";\n    case "very-heavy": return "Very heavy";\n    default: return "";\n  }\n}\n''')

Path('src/lib/domain/pain.ts').write_text('''/** Pain-domain calculations. Persisted data remains owned by storage.ts. */\nexport type PainEntryLike = { entryKind?: "pain" | "symptom-update"; score: number };\nexport type PainDayLike = { pain?: PainEntryLike[] };\n\nexport function painColor(score: number): string {\n  const n = Math.max(0, Math.min(10, Math.round(score)));\n  return `var(--pain-${n})`;\n}\n\nexport function avgDayPain(log?: PainDayLike): number | undefined {\n  const measurements = (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");\n  if (!measurements.length) return undefined;\n  const sum = measurements.reduce((total, entry) => total + entry.score, 0);\n  return sum / measurements.length;\n}\n''')

# 3) All medication calculations flow through the meds domain facade.
must_replace('src/routes/insights.tsx', 'import { resolveScheduledDose } from "@/lib/medicationAdherence";', 'import { resolveScheduledDose } from "@/lib/domain/meds";')
must_replace('src/components/HealthReportPage.tsx', 'import { resolveScheduledDose, summarizeMedicationAdherence } from "@/lib/medicationAdherence";', 'import { resolveScheduledDose, summarizeMedicationAdherence } from "@/lib/domain/meds";')

# ScheduledDosePopup: shared legacy/granular resolver for initial selected items.
p = Path('src/components/home/ScheduledDosePopup.tsx')
s = p.read_text()
s = s.replace('  medScheduleItems,\n', '', 1)
insert_after = 'import { useI18n } from "@/hooks/useI18n";\n'
if insert_after not in s:
    raise SystemExit('ScheduledDosePopup import anchor not found')
s = s.replace(insert_after, insert_after + 'import { getTakenScheduledItems, medScheduleItems } from "@/lib/domain/meds";\n', 1)
old = '''  const allItems = medScheduleItems(target.med);\n  const alreadyTaken = !!data.medLog[date]?.[target.key];\n  const initialItems = data.medLogItems?.[date]?.[target.key] ?? (alreadyTaken ? allItems : []);\n'''
new = '''  const allItems = medScheduleItems(target.med);\n  const initialItems = getTakenScheduledItems(\n    target.med,\n    date,\n    target.time,\n    data.medLog,\n    data.medLogItems ?? {},\n  );\n'''
if old not in s:
    raise SystemExit('ScheduledDosePopup initial meds block not found')
s = s.replace(old, new, 1)
p.write_text(s)

# 4) Extract Home header status into its own component and make meds item-granular.
Path('src/components/home/TodayHeaderSummary.tsx').write_text('''import { Ico, PillIcon } from "@/components/icons/BixboIcons";\nimport { useI18n } from "@/hooks/useI18n";\nimport { avgDayPain } from "@/lib/domain/pain";\nimport { resolveScheduledDose } from "@/lib/domain/meds";\nimport { todayKey, type BixboData } from "@/lib/storage";\n\nexport function TodayHeaderSummary({ data, onOpen }: { data: BixboData; onOpen: () => void }) {\n  const { t } = useI18n();\n  const dateKey = todayKey();\n  const todayPain = avgDayPain(data.dayLogs[dateKey]);\n  const now = new Date();\n\n  let takenItems = 0;\n  let expectedItems = 0;\n  data.meds.filter((med) => !med.asNeeded).forEach((med) => {\n    (med.times ?? []).forEach((time) => {\n      const state = resolveScheduledDose(med, dateKey, time, data.medLog, data.medLogItems ?? {}, now);\n      // The Home header describes today's full plan, so future items remain in the denominator.\n      expectedItems += state.allItems.length;\n      takenItems += state.selectedItems.length;\n    });\n  });\n\n  return (\n    <button\n      type="button"\n      onClick={onOpen}\n      className="flex min-w-[82px] flex-col items-end justify-center rounded-2xl px-2 py-1 transition hover:bg-tint"\n      aria-label={t("Open today's summary")}\n    >\n      <span className="text-[10px] font-semibold leading-none text-muted-foreground">{t("Today")}</span>\n      <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none text-foreground">\n        <Ico name="flame" size={14} /> {todayPain != null ? todayPain.toFixed(1) : "—"}\n        <span className="text-muted-foreground">·</span>\n        <PillIcon size={14} /> {takenItems}/{expectedItems}\n      </span>\n    </button>\n  );\n}\n''')

idx = Path('src/routes/index.tsx')
s = idx.read_text()
s = s.replace('  avgDayPain,\n', '', 1)
anchor = 'import { DayPreview, ShareDayButton } from "@/components/home/DayOverview";\n'
if anchor not in s:
    raise SystemExit('index Home import anchor not found')
s = s.replace(anchor, anchor + 'import { TodayHeaderSummary } from "@/components/home/TodayHeaderSummary";\n', 1)
old_calc = '''  const todayDateKey = todayKey();\n  const todayLog = view.dayLogs[todayDateKey];\n  const todayPain = avgDayPain(todayLog);\n  const todayScheduled = view.meds\n    .filter((med) => !med.asNeeded)\n    .flatMap((med) => med.times.map((time) => `${med.id}@${time}`));\n  const todayMedsTaken = todayScheduled.filter((key) => view.medLog[todayDateKey]?.[key]).length;\n\n'''
if old_calc not in s:
    raise SystemExit('index today summary calculation block not found')
s = s.replace(old_calc, '', 1)
old_button = '''          <button\n            type="button"\n            onClick={() => {\n              setSummaryMode("today");\n              setSummaryMonthAnchor(new Date());\n              setTodayOpen(true);\n            }}\n            className="flex min-w-[82px] flex-col items-end justify-center rounded-2xl px-2 py-1 transition hover:bg-tint"\n            aria-label={t("Open today's summary")}\n          >\n            <span className="text-[10px] font-semibold leading-none text-muted-foreground">{t("Today")}</span>\n            <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none text-foreground">\n              <Ico name="flame" size={14} /> {todayPain != null ? todayPain.toFixed(1) : "—"}\n              <span className="text-muted-foreground">·</span>\n              <PillIcon size={14} /> {todayMedsTaken}/{todayScheduled.length}\n            </span>\n          </button>\n'''
new_button = '''          <TodayHeaderSummary\n            data={view}\n            onOpen={() => {\n              setSummaryMode("today");\n              setSummaryMonthAnchor(new Date());\n              setTodayOpen(true);\n            }}\n          />\n'''
if old_button not in s:
    raise SystemExit('index Today header button block not found')
s = s.replace(old_button, new_button, 1)
idx.write_text(s)

# Add a regression test using the existing bun:test style and the actual Med type.
test = Path('src/lib/__tests__/medication-adherence.test.ts')
t = test.read_text()
if 'domain meds facade preserves partial grouped doses' not in t:
    t += '''\n\nit("domain meds facade preserves partial grouped doses", async () => {\n  const { resolveScheduledDose: resolveFromDomain } = await import("../domain/meds");\n  const domainMed: Med = { id: "supplements", name: "Omega-3 2x, Iron", times: ["15:00"] };\n  const state = resolveFromDomain(\n    domainMed,\n    "2026-08-12",\n    "15:00",\n    { "2026-08-12": { "supplements@15:00": true } },\n    { "2026-08-12": { "supplements@15:00": ["Iron"] } },\n    new Date("2026-08-13T12:00:00"),\n  );\n  expect(state.allItems).toEqual(["Omega-3 2x", "Iron"]);\n  expect(state.selectedItems).toEqual(["Iron"]);\n  expect(state.missedItems).toEqual(["Omega-3 2x"]);\n});\n'''
    test.write_text(t)
