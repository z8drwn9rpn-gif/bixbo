from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  bowel: [
    { id: "bristol", label: "Bristol type", kind: "scale", order: 10, scale: { min: 0, max: 7, step: 1 } },
    { id: "urinary", label: "Urinary", kind: "chips", order: 20 },
  ],'''
new = '''  bowel: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "bristol", label: "Bristol stool scale", kind: "scale", order: 20, scale: { min: 0, max: 7, step: 1 } },
    { id: "urinary", label: "Urinary", kind: "chips", order: 30 },
    { id: "feelings", label: "How do you feel?", kind: "chips", order: 40 },
    { id: "symptoms", label: "Symptoms", kind: "chips", order: 50 },
    { id: "note", label: "Note (optional)", kind: "text", order: 60 },
  ],'''
assert old in text, 'bowel registry block not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''                                  {(featureId === "pain" || featureId === "panic" || featureId === "tetany") ? ('''
new = '''                                  {(featureId === "pain" || featureId === "panic" || featureId === "tetany" || featureId === "bowel") ? ('''
assert old in text, 'admin drag gate not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()
repls = [
('''    <div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Time">\n        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />\n      </Field>\n      <Field label="Bristol stool scale">''', '''    <div className="flex flex-col gap-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Time" schemaFieldId="time">\n        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />\n      </Field>\n      <Field label="Bristol stool scale" schemaFieldId="bristol">'''),
('''      <Field label="Urinary">\n        <CustomChipList''', '''      <Field label="Urinary" schemaFieldId="urinary">\n        <CustomChipList'''),
('''      <Field label="How do you feel?">\n        <CustomChipList''', '''      <Field label="How do you feel?" schemaFieldId="feelings">\n        <CustomChipList'''),
('''      <Field label="Symptoms">\n        <CustomChipList''', '''      <Field label="Symptoms" schemaFieldId="symptoms">\n        <CustomChipList'''),
('''      <Field label="Note (optional)">\n        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />\n      </Field>\n    </div>\n  );\n}\n\n/* ------------------- TEMP / WEIGHT / SLEEP ------------------- */''', '''      <Field label="Note (optional)" schemaFieldId="note">\n        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />\n      </Field>\n    </div>\n  );\n}\n\n/* ------------------- TEMP / WEIGHT / SLEEP ------------------- */'''),
]
for old, new in repls:
    assert old in text, f'bowel form anchor not found: {old[:60]!r}'
    text = text.replace(old, new, 1)
log.write_text(text)

Path('src/lib/__tests__/bowel-field-order.test.ts').write_text('''import { describe, expect, it } from "vitest";\n\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Bowel built-in admin field order", () => {\n  it("registers every linear bowel field with a stable ID", () => {\n    expect((BIXBO_LOG_FIELDS.bowel ?? []).map((field) => field.id)).toEqual([\n      "time", "bristol", "urinary", "feelings", "symptoms", "note",\n    ]);\n  });\n\n  it("sorts bowel presentation order without changing stable IDs", () => {\n    const data = {\n      ...EMPTY,\n      settings: {\n        ...EMPTY.settings,\n        adminConfig: { enabled: true, features: { bowel: { fields: { note: { order: 1 }, time: { order: 999 } } } } },\n      },\n    };\n    expect(registryFieldsForFeature(data, "bowel").map((field) => field.id)).toEqual([\n      "note", "bristol", "urinary", "feelings", "symptoms", "time",\n    ]);\n  });\n});\n''')
