from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

old_head = '''  const saveAdminCustomFields = () => {\n    if (!activeRegistryFeature || !activeAdminFields.length) return;\n    const allowed = new Set(activeAdminFields.map((field) => field.id));\n    const values = Object.fromEntries(Object.entries(adminFieldValues).filter(([fieldId, value]) => allowed.has(fieldId) && value !== ""));\n    update((current) => {'''
new_head = '''  const saveAdminCustomFields = () => {\n    if (!activeRegistryFeature || !activeAdminFields.length) return;\n    const editableFieldIds = new Set(activeAdminFields.map((field) => field.id));\n    update((current) => {'''
if old_head not in s:
    raise SystemExit('saveAdminCustomFields head not found')
s = s.replace(old_head, new_head, 1)

old_mid = '''      const matchIndex = linkedIndex >= 0 ? linkedIndex : legacyIndex;\n\n      let nextEntries = existing;\n      if (!Object.keys(values).length) {\n        if (matchIndex >= 0) nextEntries = existing.filter((_, index) => index !== matchIndex);\n        else if (!editSourceId) return current;\n      } else if (matchIndex >= 0) {\n        nextEntries = existing.map((entry, index) => index === matchIndex\n          ? { ...entry, values, sourceEntryId: editSourceId ?? entry.sourceEntryId }\n          : entry);\n      } else {\n        const entry = {\n          id: globalThis.crypto?.randomUUID?.() ?? `admin-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,\n          time: editSourceTime ?? nowHHMM(),\n          values,\n          ...(editSourceId ? { sourceEntryId: editSourceId } : {}),\n        };\n        nextEntries = [...existing, entry];\n      }'''
new_mid = '''      const matchIndex = linkedIndex >= 0 ? linkedIndex : legacyIndex;\n\n      // Only fields currently exposed by Admin are editable in this form.\n      // Preserve values belonging to hidden, removed or legacy admin fields so\n      // "Hide" never becomes an accidental historical-data deletion on edit.\n      const previousValues = matchIndex >= 0 ? existing[matchIndex]?.values ?? {} : {};\n      const values: Record<string, CustomLogValue> = { ...previousValues };\n      editableFieldIds.forEach((fieldId) => {\n        const value = adminFieldValues[fieldId];\n        if (value === "" || value === undefined) delete values[fieldId];\n        else values[fieldId] = value;\n      });\n\n      let nextEntries = existing;\n      if (!Object.keys(values).length) {\n        if (matchIndex >= 0) nextEntries = existing.filter((_, index) => index !== matchIndex);\n        else if (!editSourceId) return current;\n      } else if (matchIndex >= 0) {\n        nextEntries = existing.map((entry, index) => index === matchIndex\n          ? { ...entry, values, sourceEntryId: editSourceId ?? entry.sourceEntryId }\n          : entry);\n      } else {\n        const entry = {\n          id: globalThis.crypto?.randomUUID?.() ?? `admin-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,\n          time: editSourceTime ?? nowHHMM(),\n          values,\n          ...(editSourceId ? { sourceEntryId: editSourceId } : {}),\n        };\n        nextEntries = [...existing, entry];\n      }'''
if old_mid not in s:
    raise SystemExit('saveAdminCustomFields body not found')
s = s.replace(old_mid, new_mid, 1)

p.write_text(s)
print('preserved hidden/legacy admin field values during edits')
