from pathlib import Path

# 1) Canonical meds progress helper used by every UI summary.
p = Path('src/lib/medicationAdherence.ts')
s = p.read_text()
anchor = 'export const calculateMedicationAdherence = summarizeMedicationAdherence;\n'
addition = '''\nexport type MedicationProgressSummary = { taken: number; expected: number; pct?: number };\n\n/**\n * Canonical cross-medication progress summary. Counts individual items inside grouped\n * scheduled doses via medLogItems and preserves legacy whole-group records.\n * Set includeFutureScheduled=true for a full-day plan (for example the Home header);\n * otherwise only eligible/due doses are counted.\n */\nexport function summarizeMedicationProgress(\n  meds: Med[],\n  dates: string[],\n  medLog: MedicationLog,\n  medLogItems: MedicationLogItems,\n  now: Date,\n  includeFutureScheduled = false,\n): MedicationProgressSummary {\n  let taken = 0;\n  let expected = 0;\n\n  meds.filter((med) => !med.asNeeded).forEach((med) => {\n    dates.forEach((dateKey) => {\n      (med.times ?? []).forEach((time) => {\n        const state = resolveScheduledDose(med, dateKey, time, medLog, medLogItems, now);\n        if (!includeFutureScheduled && !state.eligible) return;\n        expected += state.allItems.length;\n        taken += state.selectedItems.length;\n      });\n    });\n  });\n\n  return {\n    taken,\n    expected,\n    pct: expected > 0 ? Math.round((taken / expected) * 100) : undefined,\n  };\n}\n'''
if 'export function summarizeMedicationProgress(' not in s:
    if anchor not in s: raise SystemExit('medicationAdherence anchor missing')
    s = s.replace(anchor, anchor + addition)
p.write_text(s)

# 2) Domain facade exports shared helper.
p = Path('src/lib/domain/meds.ts')
s = p.read_text()
if 'summarizeMedicationProgress,' not in s:
    s = s.replace('  calculateMedicationAdherence,\n', '  calculateMedicationAdherence,\n  summarizeMedicationProgress,\n')
if 'MedicationProgressSummary' not in s:
    s = s.replace('export type { MedicationLog, MedicationLogItems, ScheduledDoseState } from "@/lib/medicationAdherence";',
                  'export type { MedicationLog, MedicationLogItems, ScheduledDoseState, MedicationProgressSummary } from "@/lib/medicationAdherence";')
p.write_text(s)

# 3) Home header uses canonical helper.
p = Path('src/components/home/TodayHeaderSummary.tsx')
s = p.read_text()
s = s.replace('import { resolveScheduledDose } from "@/lib/domain/meds";', 'import { summarizeMedicationProgress } from "@/lib/domain/meds";')
old = '''  const now = new Date();\n\n  let takenItems = 0;\n  let expectedItems = 0;\n  data.meds.filter((med) => !med.asNeeded).forEach((med) => {\n    (med.times ?? []).forEach((time) => {\n      const state = resolveScheduledDose(med, dateKey, time, data.medLog, data.medLogItems ?? {}, now);\n      // The Home header describes today's full plan, so future items remain in the denominator.\n      expectedItems += state.allItems.length;\n      takenItems += state.selectedItems.length;\n    });\n  });\n'''
new = '''  const progress = summarizeMedicationProgress(\n    data.meds,\n    [dateKey],\n    data.medLog,\n    data.medLogItems ?? {},\n    new Date(),\n    true,\n  );\n'''
if old in s:
    s = s.replace(old,new)
s = s.replace('{takenItems}/{expectedItems}', '{progress.taken}/{progress.expected}')
p.write_text(s)

# 4) Home tiles: remove copied monolithic imports and use item-level meds progress.
p = Path('src/components/home/HomeTiles.tsx')
s = p.read_text()
marker = 'export function VitalTile({'
pos = s.find(marker)
if pos < 0: raise SystemExit('HomeTiles marker missing')
body = s[pos:]
header = '''import { Ico, PillIcon } from "@/components/icons/BixboIcons";\nimport { useI18n } from "@/hooks/useI18n";\nimport { summarizeMedicationProgress } from "@/lib/domain/meds";\nimport { todayKey, type BixboData } from "@/lib/storage";\n\n'''
s = header + body
old = '''  const k = todayKey();\n  const scheduled = data.meds.filter((m) => !m.asNeeded);\n  const total = scheduled.reduce((s, m) => s + m.times.length, 0);\n  const taken = scheduled.reduce(\n    (s, m) => s + m.times.filter((t) => isScheduledDoseTaken(m, k, t, data.medLog, data.medLogItems ?? {})).length,\n    0,\n  );\n'''
new = '''  const progress = summarizeMedicationProgress(\n    data.meds,\n    [todayKey()],\n    data.medLog,\n    data.medLogItems ?? {},\n    new Date(),\n    true,\n  );\n'''
if old not in s: raise SystemExit('HomeTiles meds block missing')
s = s.replace(old,new)
s = s.replace('{taken}/{total || 0}', '{progress.taken}/{progress.expected}')
p.write_text(s)

# 5) ScheduledDosePopup: strip accidental copied Home/index imports.
p = Path('src/components/home/ScheduledDosePopup.tsx')
s = p.read_text()
marker = 'export type ScheduledDoseTarget = {'
pos = s.find(marker)
if pos < 0: raise SystemExit('ScheduledDosePopup marker missing')
body = s[pos:]
header = '''import { createPortal } from "react-dom";\nimport { useState } from "react";\nimport { useI18n } from "@/hooks/useI18n";\nimport { getTakenScheduledItems, medScheduleItems } from "@/lib/domain/meds";\nimport { todayKey, type BixboData } from "@/lib/storage";\n\n'''
p.write_text(header + body)

# 6) Home index: remove local whole-group adherence calculations and use canonical item-level helper.
p = Path('src/routes/index.tsx')
s = p.read_text()
if 'import { summarizeMedicationProgress } from "@/lib/domain/meds";' not in s:
    s = s.replace('import { useI18n } from "@/hooks/useI18n";\n', 'import { useI18n } from "@/hooks/useI18n";\nimport { summarizeMedicationProgress } from "@/lib/domain/meds";\n')
s = s.replace('  medScheduleItems,\n', '')
old = '''  const todayScheduled = view.meds\n    .filter((med) => !med.asNeeded)\n    .flatMap((med) => med.times.map((time) => `${med.id}@${time}`));\n  const todayMedsTaken = todayScheduled.filter((key) => view.medLog[todayDateKey]?.[key]).length;\n'''
new = '''  const todayMedicationProgress = summarizeMedicationProgress(\n    view.meds,\n    [todayDateKey],\n    view.medLog,\n    view.medLogItems ?? {},\n    new Date(),\n    true,\n  );\n'''
if old not in s: raise SystemExit('index today meds block missing')
s=s.replace(old,new)
s=s.replace('`${todayMedsTaken} ${t("of")} ${todayScheduled.length} ${t("taken")}`', '`${todayMedicationProgress.taken} ${t("of")} ${todayMedicationProgress.expected} ${t("taken")}`')
old_month = '''          const summaryNow = new Date();\n          const summaryTodayKey = toKey(summaryNow);\n          const summaryNowMinutes = summaryNow.getHours() * 60 + summaryNow.getMinutes();\n\n          let monthScheduledTotal = 0;\n          let monthMedsTaken = 0;\n\n          monthKeys.forEach((dateKey) => {\n            todayScheduled.forEach((medKey) => {\n              const atIndex = medKey.lastIndexOf("@");\n              const time = atIndex >= 0 ? medKey.slice(atIndex + 1) : "";\n              const isTaken = !!view.medLog[dateKey]?.[medKey];\n\n              // Never count future dates.\n              if (dateKey > summaryTodayKey) return;\n\n              // Today counts only doses whose scheduled time already passed,\n              // unless the dose was already marked taken.\n              if (dateKey === summaryTodayKey && !isTaken) {\n                const match = /^(\\d{1,2}):(\\d{2})/.exec(time);\n                if (!match) return;\n\n                const scheduledMinutes = Number(match[1]) * 60 + Number(match[2]);\n                if (scheduledMinutes > summaryNowMinutes) return;\n              }\n\n              monthScheduledTotal += 1;\n              if (isTaken) monthMedsTaken += 1;\n            });\n          });\n\n          const monthMedsPct =\n            monthScheduledTotal > 0 ? Math.round((monthMedsTaken / monthScheduledTotal) * 100) : undefined;\n'''
new_month = '''          const monthMedicationProgress = summarizeMedicationProgress(\n            view.meds,\n            monthKeys,\n            view.medLog,\n            view.medLogItems ?? {},\n            new Date(),\n          );\n          const monthMedsPct = monthMedicationProgress.pct;\n'''
if old_month not in s: raise SystemExit('index month meds block missing')
s=s.replace(old_month,new_month)
p.write_text(s)

# 7) Add regression test for cross-med grouped progress.
p = Path('src/lib/__tests__/medication-adherence.test.ts')
s = p.read_text()
s = s.replace('import { resolveScheduledDose, summarizeMedicationAdherence } from "../medicationAdherence";',
              'import { resolveScheduledDose, summarizeMedicationAdherence, summarizeMedicationProgress } from "../medicationAdherence";')
if 'counts grouped items consistently across the whole medication plan' not in s:
    s += '''\n\nit("counts grouped items consistently across the whole medication plan", () => {\n  const meds: Med[] = [\n    { id: "morning", name: "HAK, Probiotic", times: ["09:00"] },\n    { id: "evening", name: "Omega-3 2x, Iron", times: ["18:00"] },\n  ];\n  const medLog = {\n    "2026-08-12": { "morning@09:00": true, "evening@18:00": true },\n  };\n  const medLogItems = {\n    "2026-08-12": {\n      "morning@09:00": ["HAK", "Probiotic"],\n      "evening@18:00": ["Iron"],\n    },\n  };\n  expect(summarizeMedicationProgress(meds, ["2026-08-12"], medLog, medLogItems, new Date("2026-08-13T12:00:00"))).toEqual({\n    taken: 3,\n    expected: 4,\n    pct: 75,\n  });\n});\n'''
p.write_text(s)

# 8) Harden CI: environment hygiene and obvious server-secret guards.
p = Path('.github/workflows/ci.yml')
s = p.read_text()
needle = '      - name: Install dependencies\n        run: bun install --frozen-lockfile\n'
security = '''      - name: Repository security hygiene\n        shell: bash\n        run: |\n          set -euo pipefail\n          tracked_env="$(git ls-files | grep -E '^\\.env($|\\.)' | grep -v '^\\.env\\.example$' || true)"\n          if [ -n "$tracked_env" ]; then\n            echo "Tracked environment file(s) are forbidden:"\n            echo "$tracked_env"\n            exit 1\n          fi\n          if git grep -nE 'SUPABASE_SERVICE_ROLE(_KEY)?|VAPID_PRIVATE_KEY|VITE_[A-Z0-9_]*(SECRET|PRIVATE_KEY)' -- ':!*.example' ':!.github/workflows/ci.yml'; then\n            echo "Potential server secret reference found in tracked application files."\n            exit 1\n          fi\n'''
if 'Repository security hygiene' not in s:
    if needle not in s: raise SystemExit('ci anchor missing')
    s=s.replace(needle, security+needle)
p.write_text(s)

# 9) Remove obsolete one-off patch/apply assets. Keep reusable ci.yml and audit workflow.
obsolete = [
  '.github/workflows/apply-nav-vitals-tooltip-assets.yml',
  '.github/workflows/apply-notes-edge-tooltip-inline-admin-fix.yml',
  '.github/workflows/fix-notes-textarea-remount-20260812.yml',
  '.github/workflows/fix-pdf-preview-overlap-20260812.yml',
  '.github/workflows/fix-pdf-pwa-safe-area-20260812.yml',
  'scripts/apply-nav-vitals-tooltip-assets.py',
  'scripts/apply_notes_edge_tooltip_inline_admin_fix.py',
  'scripts/fix_notes_textarea_remount_20260812.py',
  'scripts/fix_pdf_preview_overlap_20260812.py',
  'scripts/fix_pdf_pwa_safe_area_20260812.py',
  'scripts/.keep-nav-assets',
  'scripts/README-nav-vitals.txt',
  'scripts/nav-vitals-non-destructive.txt',
  'scripts/nav-vitals-plan.txt',
  'scripts/nav-vitals-preservation-notes.txt',
  'scripts/nav-vitals-preserve.txt',
]
for name in obsolete:
    q=Path(name)
    if q.exists(): q.unlink()
