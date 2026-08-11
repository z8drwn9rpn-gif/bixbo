from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  meds: [
    { id: "scheduled", label: "Scheduled meds", kind: "text", order: 10 },
    { id: "extraDose", label: "Extra dose (one-off)", kind: "text", order: 20 },
  ],
};'''
new = '''  meds: [
    { id: "scheduled", label: "Scheduled meds", kind: "text", order: 10 },
    { id: "extraDose", label: "Extra dose (one-off)", kind: "text", order: 20 },
  ],
  sex: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "type", label: "Type", kind: "chips", order: 20 },
    { id: "feelingAfter", label: "How I feel after", kind: "chips", order: 30 },
    { id: "painful", label: "Painful?", kind: "chips", order: 40 },
    { id: "note", label: "Note (optional)", kind: "text", order: 50 },
  ],
  heat: [
    { id: "type", label: "Type", kind: "chips", order: 10 },
    { id: "start", label: "Start", kind: "text", order: 20 },
    { id: "duration", label: "Duration (min)", kind: "number", order: 30 },
    { id: "note", label: "Note (optional)", kind: "text", order: 40 },
  ],
};'''
assert old in text, 'meds registry tail not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''featureId === "postpartum" || featureId === "meds") ? ('''
new = '''featureId === "postpartum" || featureId === "meds" || featureId === "sex" || featureId === "heat") ? ('''
assert old in text, 'admin sex/heat gate anchor not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()

# Sex form.
start = text.index('function SexForm({')
end = text.index('function AddCustomInline(')
pre = text[:start]
section = text[start:end]
post = text[end:]
section = section.replace('<div className="space-y-3">', '<div className="flex flex-col gap-3">', 1)
repls = [
    ('<Field label="Time">', '<Field label="Time" schemaFieldId="time">'),
    ('<Field label="Type">', '<Field label="Type" schemaFieldId="type">'),
    ('<Field label="How I feel after">', '<Field label="How I feel after" schemaFieldId="feelingAfter">'),
    ('<Field label="Painful?">', '<Field label="Painful?" schemaFieldId="painful">'),
    ('<Field label="Note (optional)">', '<Field label="Note (optional)" schemaFieldId="note">'),
]
for old_s, new_s in repls:
    assert old_s in section, f'missing sex anchor {old_s}'
    section = section.replace(old_s, new_s, 1)
old = '''          selected={feelingAfter}\n          onToggle={(v) => setFeelingAfter((a) => toggleIn(a, v))}\n        />'''
new = '''          selected={feelingAfter}\n          onToggle={(v) => setFeelingAfter((a) => toggleIn(a, v))}\n          schemaFieldId="feelingAfter"\n        />'''
assert old in section, 'sex feelings schema option anchor not found'
section = section.replace(old, new, 1)
text = pre + section + post

# Thermo form.
start = text.index('function ThermoForm({')
end = text.index('function FoodForm({')
pre = text[:start]
section = text[start:end]
post = text[end:]
section = section.replace('<div className="space-y-3">', '<div className="flex flex-col gap-3">', 1)
repls = [
    ('<Field label="Type">', '<Field label="Type" schemaFieldId="type">'),
    ('<Field label="Start">', '<Field label="Start" schemaFieldId="start">'),
    ('<Field label="Note (optional)">', '<Field label="Note (optional)" schemaFieldId="note">'),
]
for old_s, new_s in repls:
    assert old_s in section, f'missing thermo anchor {old_s}'
    section = section.replace(old_s, new_s, 1)
old = '<DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} />'
new = '<DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} schemaFieldId="duration" />'
assert old in section, 'thermo duration anchor not found'
section = section.replace(old, new, 1)
text = pre + section + post
log.write_text(text)

test = Path('src/lib/__tests__/sex-thermo-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Sex and Heat/Cold/TENS admin field order", () => {\n  it("registers stable field IDs", () => {\n    expect((BIXBO_LOG_FIELDS.sex ?? []).map((f) => f.id)).toEqual(["time", "type", "feelingAfter", "painful", "note"]);\n    expect((BIXBO_LOG_FIELDS.heat ?? []).map((f) => f.id)).toEqual(["type", "start", "duration", "note"]);\n  });\n  it("respects admin order", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {\n      sex: { fields: { note: { order: 1 }, time: { order: 999 } } },\n      heat: { fields: { note: { order: 1 }, type: { order: 999 } } },\n    } } } };\n    expect(registryFieldsForFeature(data, "sex").map((f) => f.id)[0]).toBe("note");\n    expect(registryFieldsForFeature(data, "heat").map((f) => f.id)[0]).toBe("note");\n  });\n});\n''')
