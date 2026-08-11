from pathlib import Path

# --- CustomLogForm: support true update-in-place editing ---
p = Path('src/components/CustomLogForm.tsx')
s = p.read_text()
s = s.replace(
    'import { painColor, nowHHMM, type BixboData, type CustomLogEntry, type CustomLogValue } from "@/lib/storage";',
    'import { painColor, nowHHMM, type BixboData, type CustomLogEntry, type CustomLogValue } from "@/lib/storage";',
)
old = '''export function CustomLogForm({\n  definition,\n  date,\n  data,\n  update,\n  onDone,\n}: {\n  definition: CustomLogDefinition;\n  date: string;\n  data: BixboData;\n  update: UpdateFn;\n  onDone: () => void;\n}) {\n  const { t } = useI18n();\n  const [values, setValues] = useState<Record<string, CustomLogValue>>({});\n  const [note, setNote] = useState(\"\");'''
new = '''export function CustomLogForm({\n  definition,\n  date,\n  data,\n  update,\n  onDone,\n  initialEntry,\n}: {\n  definition: CustomLogDefinition;\n  date: string;\n  data: BixboData;\n  update: UpdateFn;\n  onDone: () => void;\n  initialEntry?: CustomLogEntry;\n}) {\n  const { t } = useI18n();\n  // Seed the complete saved values object so hidden/legacy fields survive an edit.\n  // Visible fields can overwrite their own values without deleting unrelated history.\n  const [values, setValues] = useState<Record<string, CustomLogValue>>(() => ({ ...(initialEntry?.values ?? {}) }));\n  const [note, setNote] = useState(initialEntry?.note ?? \"\");'''
if old not in s:
    raise SystemExit('CustomLogForm props/state marker missing')
s = s.replace(old, new, 1)
old = '''  const save = () => {\n    const entry: CustomLogEntry = { id: uid(), time: nowHHMM(), values, note: note.trim() || undefined };\n    update((current) => {\n      const day = current.dayLogs[date] ?? {};\n      const customLogs = day.customLogs ?? {};\n      return {\n        ...current,\n        dayLogs: {\n          ...current.dayLogs,\n          [date]: {\n            ...day,\n            customLogs: {\n              ...customLogs,\n              [definition.id]: [...(customLogs[definition.id] ?? []), entry],\n            },\n          },\n        },\n      };\n    });\n    onDone();\n  };'''
new = '''  const save = () => {\n    const entry: CustomLogEntry = {\n      id: initialEntry?.id ?? uid(),\n      // Editing must not silently move an old event to the current clock time.\n      time: initialEntry?.time ?? nowHHMM(),\n      values,\n      note: note.trim() || undefined,\n    };\n    update((current) => {\n      const day = current.dayLogs[date] ?? {};\n      const customLogs = day.customLogs ?? {};\n      const existing = customLogs[definition.id] ?? [];\n      const nextEntries = initialEntry\n        ? existing.map((saved) => (saved.id === initialEntry.id ? entry : saved))\n        : [...existing, entry];\n      return {\n        ...current,\n        dayLogs: {\n          ...current.dayLogs,\n          [date]: {\n            ...day,\n            customLogs: {\n              ...customLogs,\n              [definition.id]: nextEntries,\n            },\n          },\n        },\n      };\n    });\n    onDone();\n  };'''
if old not in s:
    raise SystemExit('CustomLogForm save marker missing')
s = s.replace(old, new, 1)
p.write_text(s)

# --- LogSheet: expose saved custom entries and route one into edit mode ---
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
old = '''  type PostpartumDayLog,\n  type CustomLogValue,\n  withCustomTombstones,'''
new = '''  type PostpartumDayLog,\n  type CustomLogEntry,\n  type CustomLogValue,\n  withCustomTombstones,'''
if old not in s:
    raise SystemExit('CustomLogEntry import marker missing')
s = s.replace(old, new, 1)
old = '''  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();'''
# This marker belongs to index.tsx, not LogSheet; intentionally ignored if absent.

old = '''  const [editingOrder, setEditingOrder] = useState(false);\n  const close = () => {\n    setCat(null);\n    setEditingOrder(false);\n    onOpenChange(false);\n  };\n  const back = () => setCat(null);'''
new = '''  const [editingOrder, setEditingOrder] = useState(false);\n  const [customEditEntry, setCustomEditEntry] = useState<CustomLogEntry | undefined>();\n  const close = () => {\n    setCat(null);\n    setEditingOrder(false);\n    setCustomEditEntry(undefined);\n    onOpenChange(false);\n  };\n  const back = () => {\n    setCustomEditEntry(undefined);\n    setCat(null);\n  };'''
if old not in s:
    raise SystemExit('LogSheet close/back marker missing')
s = s.replace(old, new, 1)
old = '''              {active?.startsWith("custom:") && (() => {\n                const id = active.slice("custom:".length);\n                const definition = customLogDefinitions(data).find((item) => item.id === id);\n                return definition ? <CustomLogForm definition={definition} date={date} data={data} update={update} onDone={close} /> : null;\n              })()}'''
new = '''              {active?.startsWith("custom:") && (() => {\n                const id = active.slice("custom:".length);\n                const definition = customLogDefinitions(data).find((item) => item.id === id);\n                if (!definition) return null;\n                const savedEntries = data.dayLogs[date]?.customLogs?.[id] ?? [];\n                const initialCustomEntry = customEditEntry ?? (edit as CustomLogEntry | undefined);\n                return (\n                  <div className="space-y-4">\n                    {savedEntries.length ? (\n                      <section className="rounded-2xl bg-tint p-3 ring-1 ring-border/70">\n                        <div className="flex items-center justify-between gap-3">\n                          <div>\n                            <p className="text-xs font-bold">{t("Saved entries")}</p>\n                            <p className="text-[10px] text-muted-foreground">{t("Tap an entry to edit it without creating a duplicate.")}</p>\n                          </div>\n                          {initialCustomEntry ? (\n                            <button\n                              type="button"\n                              onClick={() => setCustomEditEntry(undefined)}\n                              className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border"\n                            >\n                              {t("New entry")}\n                            </button>\n                          ) : null}\n                        </div>\n                        <div className="mt-2 flex flex-wrap gap-2">\n                          {savedEntries.map((entry, index) => (\n                            <button\n                              key={entry.id}\n                              type="button"\n                              onClick={() => setCustomEditEntry(entry)}\n                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border ${\n                                initialCustomEntry?.id === entry.id ? "bg-primary text-primary-foreground" : "bg-background text-foreground"\n                              }`}\n                            >\n                              <Pencil className="h-3 w-3" />\n                              {entry.time || `${t("Entry")} ${index + 1}`}\n                            </button>\n                          ))}\n                        </div>\n                      </section>\n                    ) : null}\n                    <CustomLogForm\n                      key={`${definition.id}:${initialCustomEntry?.id ?? "new"}`}\n                      definition={definition}\n                      date={date}\n                      data={data}\n                      update={update}\n                      onDone={close}\n                      initialEntry={initialCustomEntry}\n                    />\n                  </div>\n                );\n              })()}'''
if old not in s:
    raise SystemExit('LogSheet custom render marker missing')
s = s.replace(old, new, 1)
p.write_text(s)

print('custom log edit-in-place flow patched')