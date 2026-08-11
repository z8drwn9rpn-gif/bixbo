from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  food: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "what", label: "What did you eat?", kind: "text", order: 20 },
    { id: "quickAdd", label: "Quick add", kind: "chips", order: 30 },
    { id: "reaction", label: "Reaction?", kind: "toggle", order: 40 },
    { id: "feelings", label: "How do I feel after food?", kind: "chips", order: 50 },
    { id: "symptomsAfter", label: "Symptoms after food", kind: "chips", order: 60 },
    { id: "highHistamine", label: "High histamine food?", kind: "toggle", order: 70 },
    { id: "histamineFlare", label: "Histamine flare?", kind: "toggle", order: 80 },
    { id: "allergens", label: "Allergens in this meal", kind: "chips", order: 90 },
    { id: "intake", label: "Water / caffeine / alcohol", kind: "number", order: 100 },
    { id: "note", label: "Additional note (optional)", kind: "text", order: 110 },
  ],
};'''
new = '''  food: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "what", label: "What did you eat?", kind: "text", order: 20 },
    { id: "quickAdd", label: "Quick add", kind: "chips", order: 30 },
    { id: "reaction", label: "Reaction?", kind: "toggle", order: 40 },
    { id: "feelings", label: "How do I feel after food?", kind: "chips", order: 50 },
    { id: "symptomsAfter", label: "Symptoms after food", kind: "chips", order: 60 },
    { id: "highHistamine", label: "High histamine food?", kind: "toggle", order: 70 },
    { id: "histamineFlare", label: "Histamine flare?", kind: "toggle", order: 80 },
    { id: "allergens", label: "Allergens in this meal", kind: "chips", order: 90 },
    { id: "intake", label: "Water / caffeine / alcohol", kind: "number", order: 100 },
    { id: "note", label: "Additional note (optional)", kind: "text", order: 110 },
  ],
  temp: [
    { id: "temperature", label: "New temperature measurement", kind: "number", order: 10 },
    { id: "weight", label: "New weight measurement", kind: "number", order: 20 },
    { id: "sleepHours", label: "Sleep (hours)", kind: "number", order: 30 },
    { id: "sleepQuality", label: "How I slept", kind: "chips", order: 40 },
  ],
};'''
assert old in text, 'food registry tail not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''featureId === "task" || featureId === "food") ? ('''
new = '''featureId === "task" || featureId === "food" || featureId === "temp") ? ('''
assert old in text, 'admin temp gate anchor not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()
start = text.index('function TempForm({')
end = text.index('function MedsForm({')
pre = text[:start]
section = text[start:end]
post = text[end:]
section = section.replace('<div className="space-y-5">', '<div className="flex flex-col gap-5">', 1)
repls = [
  ('<Field label="New temperature measurement">', '<Field label="New temperature measurement" schemaFieldId="temperature">'),
  ('<Field label="New weight measurement">', '<Field label="New weight measurement" schemaFieldId="weight">'),
  ('<Field label="Sleep (hours)">', '<Field label="Sleep (hours)" schemaFieldId="sleepHours">'),
  ('<Field label="How I slept">', '<Field label="How I slept" schemaFieldId="sleepQuality">'),
]
for old_s, new_s in repls:
    assert old_s in section, f'missing temp anchor {old_s}'
    section = section.replace(old_s, new_s, 1)
log.write_text(pre + section + post)

test = Path('src/lib/__tests__/temp-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Temp/Sleep/Weight admin field order", () => {\n  it("registers stable logical blocks", () => {\n    expect((BIXBO_LOG_FIELDS.temp ?? []).map((f) => f.id)).toEqual(["temperature", "weight", "sleepHours", "sleepQuality"]);\n  });\n  it("respects admin order", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: { temp: { fields: { sleepQuality: { order: 1 }, temperature: { order: 999 } } } } } } };\n    expect(registryFieldsForFeature(data, "temp").map((f) => f.id)[0]).toBe("sleepQuality");\n  });\n});\n''')
