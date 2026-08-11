from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  postpartum: [
    { id: "symptoms", label: "Symptoms today", kind: "chips", order: 10 },
    { id: "note", label: "Recovery note (optional)", kind: "text", order: 20 },
  ],
};'''
new = '''  postpartum: [
    { id: "symptoms", label: "Symptoms today", kind: "chips", order: 10 },
    { id: "note", label: "Recovery note (optional)", kind: "text", order: 20 },
  ],
  meds: [
    { id: "scheduled", label: "Scheduled meds", kind: "text", order: 10 },
    { id: "extraDose", label: "Extra dose (one-off)", kind: "text", order: 20 },
  ],
};'''
assert old in text, 'postpartum registry tail not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''featureId === "note" || featureId === "postpartum") ? ('''
new = '''featureId === "note" || featureId === "postpartum" || featureId === "meds") ? ('''
assert old in text, 'admin meds gate anchor not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()
start = text.index('function MedsForm({')
end = text.index('function WorkoutForm({')
pre = text[:start]
section = text[start:end]
post = text[end:]

anchor = '''  const today = date === todayKey();\n  const extras = data.dayLogs[date]?.extraMeds ?? [];\n'''
replacement = '''  const today = date === todayKey();\n  const extras = data.dayLogs[date]?.extraMeds ?? [];\n  const scheduledField = getRegistryField(data, "meds", "scheduled");\n  const extraDoseField = getRegistryField(data, "meds", "extraDose");\n  const dateLabel = today ? t("Today") : date;\n  const scheduledHeading = scheduledField?.label && scheduledField.label !== "Scheduled meds"\n    ? `${t(scheduledField.label)} · ${dateLabel}`\n    : dateLabel;\n  const extraDoseHeading = t(extraDoseField?.label ?? "Extra dose (one-off)");\n'''
assert anchor in section, 'meds derived labels anchor not found'
section = section.replace(anchor, replacement, 1)

old = '''  return (\n    <div className="space-y-4">\n      {meds.length === 0 ? ('''
new = '''  return (\n    <div className="space-y-4">\n      <div className="flex flex-col gap-4">\n      <RegistryFieldBlock fieldId="scheduled">\n      {meds.length === 0 ? ('''
assert old in section, 'meds root anchor not found'
section = section.replace(old, new, 1)

old = '''          <p className="text-xs uppercase tracking-wider text-muted-foreground">{today ? t("Today") : date}</p>'''
new = '''          <p className="text-xs uppercase tracking-wider text-muted-foreground">{scheduledHeading}</p>'''
assert old in section, 'scheduled heading anchor not found'
section = section.replace(old, new, 1)

old = '''      )}\n      <div>\n        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("Extra dose (one-off)")}</p>'''
new = '''      )}\n      </RegistryFieldBlock>\n      <RegistryFieldBlock fieldId="extraDose">\n      <div>\n        <p className="text-xs uppercase tracking-wider text-muted-foreground">{extraDoseHeading}</p>'''
assert old in section, 'extra block start anchor not found'
section = section.replace(old, new, 1)

old = '''        )}\n      </div>\n      <SheetFooter className="mt-2">'''
new = '''        )}\n      </div>\n      </RegistryFieldBlock>\n      </div>\n      <SheetFooter className="mt-2">'''
assert old in section, 'extra block end anchor not found'
section = section.replace(old, new, 1)

log.write_text(pre + section + post)

test = Path('src/lib/__tests__/meds-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Meds admin block order", () => {\n  it("registers stable medication blocks", () => {\n    expect((BIXBO_LOG_FIELDS.meds ?? []).map((f) => f.id)).toEqual(["scheduled", "extraDose"]);\n  });\n  it("respects admin order", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: { meds: { fields: { extraDose: { order: 1 }, scheduled: { order: 999 } } } } } } };\n    expect(registryFieldsForFeature(data, "meds").map((f) => f.id)).toEqual(["extraDose", "scheduled"]);\n  });\n});\n''')
