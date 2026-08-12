from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Expected block not found in {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))

# 1) Persist optional notes per scheduled medication slot.
replace_once(
    'src/lib/storage.ts',
    '  medLogTimes: Record<string, Record<string, string>>;\n  medNames?: Record<string, string>;',
    '  medLogTimes: Record<string, Record<string, string>>;\n  /** Optional user note attached to a concrete scheduled medication slot. */\n  medLogNotes?: Record<string, Record<string, string>>;\n  medNames?: Record<string, string>;'
)
replace_once(
    'src/lib/storage.ts',
    '  medLogTimes: {},\n  medNames: {},',
    '  medLogTimes: {},\n  medLogNotes: {},\n  medNames: {},'
)

# 2) Cloud merge notes exactly like actual taken times, slot-by-slot.
replace_once(
    'src/lib/merge.ts',
    '      medLogTimes: mergeMedLogTimes(effectiveLocal.medLogTimes, remote.medLogTimes),\n      medNames:',
    '      medLogTimes: mergeMedLogTimes(effectiveLocal.medLogTimes, remote.medLogTimes),\n      medLogNotes: mergeMedLogTimes(effectiveLocal.medLogNotes, remote.medLogNotes),\n      medNames:'
)

# 3) Meds form: editable optional note for each scheduled/PRN slot.
replace_once(
    'src/components/LogSheet.tsx',
    '  const takenTimes = data.medLogTimes?.[date] ?? {};\n  const toggle =',
    '  const takenTimes = data.medLogTimes?.[date] ?? {};\n  const medNotes = data.medLogNotes?.[date] ?? {};\n  const setMedNote = (key: string, note: string) =>\n    update((d) => {\n      const notes = { ...(d.medLogNotes?.[date] ?? {}) };\n      const clean = note.trimStart();\n      if (clean) notes[key] = clean;\n      else delete notes[key];\n      return { ...d, medLogNotes: { ...(d.medLogNotes ?? {}), [date]: notes } };\n    });\n  const toggle ='
)

replace_once(
    'src/components/LogSheet.tsx',
    '                  {taken[`${m.id}@asneeded`] && (\n                    <Input\n                      type="time"\n                      value={takenTimes[`${m.id}@asneeded`] ?? nowHHMM()}\n                      onChange={(e) => setTakenTime(`${m.id}@asneeded`, e.target.value)}\n                      className="h-8 w-24"\n                    />\n                  )}\n                </label>',
    '                  {taken[`${m.id}@asneeded`] && (\n                    <Input\n                      type="time"\n                      value={takenTimes[`${m.id}@asneeded`] ?? nowHHMM()}\n                      onChange={(e) => setTakenTime(`${m.id}@asneeded`, e.target.value)}\n                      className="h-8 w-24"\n                    />\n                  )}\n                  <Input\n                    value={medNotes[`${m.id}@asneeded`] ?? ""}\n                    onChange={(e) => setMedNote(`${m.id}@asneeded`, e.target.value)}\n                    onClick={(e) => e.stopPropagation()}\n                    placeholder={t("Note (optional)")}\n                    className="h-8 min-w-0 flex-[0_1_150px]"\n                  />\n                </label>'
)

replace_once(
    'src/components/LogSheet.tsx',
    '                      {isTaken && (\n                        <Input\n                          type="time"\n                          value={takenTimes[k] ?? scheduledTime}\n                          onChange={(e) => setTakenTime(k, e.target.value)}\n                          className="h-8 w-24"\n                          title={t("Actual time taken")}\n                        />\n                      )}\n                    </label>',
    '                      {isTaken && (\n                        <Input\n                          type="time"\n                          value={takenTimes[k] ?? scheduledTime}\n                          onChange={(e) => setTakenTime(k, e.target.value)}\n                          className="h-8 w-24"\n                          title={t("Actual time taken")}\n                        />\n                      )}\n                      <Input\n                        value={medNotes[k] ?? ""}\n                        onChange={(e) => setMedNote(k, e.target.value)}\n                        onClick={(e) => e.stopPropagation()}\n                        placeholder={t("Note (optional)")}\n                        className="h-8 min-w-0 flex-[0_1_150px]"\n                      />\n                    </label>'
)

# 4) Home overview: show note under Taken and Missed entries; preserve note when unchecking.
replace_once(
    'src/routes/index.tsx',
    '            {takenList.map((x) => {\n              const actual = data.medLogTimes?.[date]?.[x.key];\n              const shifted = actual && actual !== x.time;',
    '            {takenList.map((x) => {\n              const actual = data.medLogTimes?.[date]?.[x.key];\n              const medNote = data.medLogNotes?.[date]?.[x.key];\n              const shifted = actual && actual !== x.time;'
)
replace_once(
    'src/routes/index.tsx',
    '                    <span className="text-[10px] text-muted-foreground"> · {t("tap to uncheck")}</span>\n                  </button>\n                </li>',
    '                    <span className="text-[10px] text-muted-foreground"> · {t("tap to uncheck")}</span>\n                    {medNote ? (\n                      <span className="mt-0.5 block text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {medNote}</span>\n                    ) : null}\n                  </button>\n                </li>'
)
replace_once(
    'src/routes/index.tsx',
    '                  {x.med.dose ? ` (${x.med.dose})` : ""}{" "}\n                  <span className="text-[10px] text-muted-foreground">· {t("missed (tap if taken)")}</span>\n                </button>',
    '                  {x.med.dose ? ` (${x.med.dose})` : ""}{" "}\n                  <span className="text-[10px] text-muted-foreground">· {t("missed (tap if taken)")}</span>\n                  {data.medLogNotes?.[date]?.[x.key] ? (\n                    <span className="mt-0.5 block text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {data.medLogNotes[date][x.key]}</span>\n                  ) : null}\n                </button>'
)

print('Scheduled medication notes patch applied.')
