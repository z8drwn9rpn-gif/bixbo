from pathlib import Path
import re

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

# Extend schema context with one effective stable source id.
s = s.replace('''  saveAdminCustomFields: () => void;\n} | null;''', '''  saveAdminCustomFields: () => void;\n  sourceEntryId: string;\n} | null;''', 1)

# Add stable source-id model after edit source extraction.
old = '''  const editSourceId = typeof editSource?.id === "string" ? editSource.id : undefined;\n  const editSourceTime = typeof editSource?.time === "string" ? editSource.time : undefined;\n  const [adminFieldValues, setAdminFieldValues] = useState<Record<string, CustomLogValue>>({});\n\n  const activeRegistryFeature = active && !active.startsWith("custom:") ? active as RegistryFeatureId : null;\n  const activeAdminFields = activeRegistryFeature ? registryCustomFieldsForFeature(data, activeRegistryFeature) : [];'''
new = '''  const editSourceId = typeof editSource?.id === "string" ? editSource.id : undefined;\n  const editSourceTime = typeof editSource?.time === "string" ? editSource.time : undefined;\n  const [adminFieldValues, setAdminFieldValues] = useState<Record<string, CustomLogValue>>({});\n\n  const activeRegistryFeature = active && !active.startsWith("custom:") ? active as RegistryFeatureId : null;\n  const dayLevelAdminFeatures = new Set<RegistryFeatureId>(["period", "temp", "meds", "postpartum"]);\n  const draftSourceEntryId = useMemo(\n    () => globalThis.crypto?.randomUUID?.() ?? `core-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,\n    [active, date, openToken],\n  );\n  const activeSourceEntryId = activeRegistryFeature\n    ? editSourceId ?? (dayLevelAdminFeatures.has(activeRegistryFeature) ? `day:${activeRegistryFeature}:${date}` : draftSourceEntryId)\n    : draftSourceEntryId;\n  const activeAdminFields = activeRegistryFeature ? registryCustomFieldsForFeature(data, activeRegistryFeature) : [];'''
if old not in s:
    raise SystemExit('source extraction marker not found')
s = s.replace(old, new, 1)

# Load by effective stable source id. Preserve legacy fallback by edit time, or one old unlinked day-level record.
old_effect = '''  useEffect(() => {\n    if (!activeRegistryFeature || !editSourceId) {\n      setAdminFieldValues({});\n      return;\n    }\n    const entries = data.dayLogs[date]?.adminFields?.[activeRegistryFeature] ?? [];\n    const linked = entries.find((entry) => entry.sourceEntryId === editSourceId);\n    const legacy = linked ?? (editSourceTime ? [...entries].reverse().find((entry) => !entry.sourceEntryId && entry.time === editSourceTime) : undefined);\n    setAdminFieldValues(legacy?.values ?? {});\n  }, [active, activeRegistryFeature, data.dayLogs, date, editSourceId, editSourceTime, openToken]);'''
new_effect = '''  useEffect(() => {\n    if (!activeRegistryFeature) {\n      setAdminFieldValues({});\n      return;\n    }\n    const entries = data.dayLogs[date]?.adminFields?.[activeRegistryFeature] ?? [];\n    const linked = entries.find((entry) => entry.sourceEntryId === activeSourceEntryId);\n    const legacyByTime = editSourceTime\n      ? [...entries].reverse().find((entry) => !entry.sourceEntryId && entry.time === editSourceTime)\n      : undefined;\n    const legacyDayLevel = dayLevelAdminFeatures.has(activeRegistryFeature)\n      ? [...entries].reverse().find((entry) => !entry.sourceEntryId)\n      : undefined;\n    setAdminFieldValues((linked ?? legacyByTime ?? legacyDayLevel)?.values ?? {});\n  }, [active, activeRegistryFeature, activeSourceEntryId, data.dayLogs, date, editSourceTime, openToken]);'''
if old_effect not in s:
    raise SystemExit('load effect marker not found')
s = s.replace(old_effect, new_effect, 1)

# saveAdminCustomFields: link by effective id; migrate legacy edit-time/day-level record to stable id.
s = s.replace('''      const linkedIndex = editSourceId ? existing.findIndex((entry) => entry.sourceEntryId === editSourceId) : -1;\n      let legacyIndex = -1;\n      if (linkedIndex < 0 && editSourceId && editSourceTime) {\n        for (let index = existing.length - 1; index >= 0; index -= 1) {\n          const entry = existing[index];\n          if (!entry.sourceEntryId && entry.time === editSourceTime) {\n            legacyIndex = index;\n            break;\n          }\n        }\n      }\n      const matchIndex = linkedIndex >= 0 ? linkedIndex : legacyIndex;''', '''      const linkedIndex = existing.findIndex((entry) => entry.sourceEntryId === activeSourceEntryId);\n      let legacyIndex = -1;\n      if (linkedIndex < 0) {\n        for (let index = existing.length - 1; index >= 0; index -= 1) {\n          const entry = existing[index];\n          const legacyTimeMatch = Boolean(editSourceTime && !entry.sourceEntryId && entry.time === editSourceTime);\n          const legacyDayMatch = dayLevelAdminFeatures.has(activeRegistryFeature) && !entry.sourceEntryId;\n          if (legacyTimeMatch || legacyDayMatch) {\n            legacyIndex = index;\n            break;\n          }\n        }\n      }\n      const matchIndex = linkedIndex >= 0 ? linkedIndex : legacyIndex;''', 1)

s = s.replace('''        else if (!editSourceId) return current;''', '''        else return current;''', 1)
s = s.replace('''          ? { ...entry, values, sourceEntryId: editSourceId ?? entry.sourceEntryId }''', '''          ? { ...entry, values, sourceEntryId: activeSourceEntryId }''', 1)
s = s.replace('''          ...(editSourceId ? { sourceEntryId: editSourceId } : {}),''', '''          sourceEntryId: activeSourceEntryId,''', 1)

# Provide source ID through context.
old_provider = '''              setAdminFieldValue: (fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value })),\n              saveAdminCustomFields,\n            } : null}>'''
new_provider = '''              setAdminFieldValue: (fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value })),\n              saveAdminCustomFields,\n              sourceEntryId: activeSourceEntryId,\n            } : null}>'''
if old_provider not in s:
    raise SystemExit('provider marker not found')
s = s.replace(old_provider, new_provider, 1)

# Patch multi-entry core forms to use same new-entry ID as adminFields.
form_names = ['PainWizard','PanicForm','TetanyForm','SexForm','ThermoForm','FoodForm','BowelForm','WorkoutForm','EventForm','TaskForm']
for name in form_names:
    start = s.find(f'function {name}(')
    if start < 0:
        raise SystemExit(f'{name} not found')
    next_fn = s.find('\nfunction ', start + 10)
    if next_fn < 0:
        next_fn = len(s)
    chunk = s[start:next_fn]
    if 'const schema = useLogSchema();' not in chunk:
        # put after useI18n declaration when present
        marker = '  const { t } = useI18n();\n'
        if marker not in chunk:
            raise SystemExit(f'useI18n marker missing in {name}')
        chunk = chunk.replace(marker, marker + '  const schema = useLogSchema();\n', 1)
    old_id = 'initialEntry?.id ?? crypto.randomUUID()'
    if old_id not in chunk:
        raise SystemExit(f'main id marker missing in {name}')
    chunk = chunk.replace(old_id, 'initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID()', 1)
    s = s[:start] + chunk + s[next_fn:]

# Note is multi-entry but historically lacked an id. Add stable id to new note object.
note_start = s.find('function NoteForm(')
note_end = s.find('\nfunction ', note_start + 10)
chunk = s[note_start:note_end]
old_note_type = '(string | { text: string; time?: string })[]'
chunk = chunk.replace(old_note_type, '(string | { id?: string; text: string; time?: string })[]', 1)
chunk = chunk.replace('const next: { text: string; time?: string }[] = list.map', 'const next: { id?: string; text: string; time?: string }[] = list.map', 1)
chunk = chunk.replace('next.push({ text: text.trim(), time: time || undefined });', 'next.push({ id: schema?.sourceEntryId, text: text.trim(), time: time || undefined });', 1)
s = s[:note_start] + chunk + s[note_end:]

# Meds uses Done instead of SaveBar: persist admin custom values before closing.
meds_start = s.find('function MedsForm(')
meds_end = s.find('\nfunction ', meds_start + 10)
chunk = s[meds_start:meds_end]
if 'const schema = useLogSchema();' not in chunk:
    chunk = chunk.replace('  const { t } = useI18n();\n', '  const { t } = useI18n();\n  const schema = useLogSchema();\n', 1)
old_done = 'onClick={onDone}'
if old_done not in chunk:
    raise SystemExit('Meds Done marker not found')
chunk = chunk.replace(old_done, 'onClick={() => { schema?.saveAdminCustomFields(); onDone(); }}', 1)
s = s[:meds_start] + chunk + s[meds_end:]

p.write_text(s)
print('patched stable admin source links and Meds custom save')

# Add optional ID to DayNote for backwards-compatible stable note identities.
p = Path('src/lib/storage.ts')
s = p.read_text()
old = '''export interface DayNote {\n  text: string;\n  time?: string;\n}'''
new = '''export interface DayNote {\n  /** Stable ID for notes created by current versions; legacy notes may omit it. */\n  id?: string;\n  text: string;\n  time?: string;\n}'''
if old not in s:
    raise SystemExit('DayNote type marker not found')
s = s.replace(old, new, 1)
p.write_text(s)
print('added backwards-compatible DayNote id')
