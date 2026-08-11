from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  task: [
    { id: "title", label: "Task", kind: "text", order: 10 },
    { id: "dates", label: "Dates", kind: "text", order: 20 },
    { id: "times", label: "Times", kind: "text", order: 30 },
    { id: "note", label: "Note (optional)", kind: "text", order: 40 },
  ],
};'''
new = '''  task: [
    { id: "title", label: "Task", kind: "text", order: 10 },
    { id: "dates", label: "Dates", kind: "text", order: 20 },
    { id: "times", label: "Times", kind: "text", order: 30 },
    { id: "note", label: "Note (optional)", kind: "text", order: 40 },
  ],
  food: [
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
assert old in text, 'task registry tail not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''featureId === "event" || featureId === "task") ? ('''
new = '''featureId === "event" || featureId === "task" || featureId === "food") ? ('''
assert old in text, 'admin drag gate tail not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()
food_start = text.index('function FoodForm({')
bowel_start = text.index('function BristolIcon(')
pre = text[:food_start]
food = text[food_start:bowel_start]
post = text[bowel_start:]
food = food.replace('<div className="space-y-3">', '<div className="flex flex-col gap-3">', 1)
repls = [
  ('<Field label="Time">', '<Field label="Time" schemaFieldId="time">'),
  ('<Field label="What did you eat?">', '<Field label="What did you eat?" schemaFieldId="what">'),
  ('<Field label="Quick add">', '<Field label="Quick add" schemaFieldId="quickAdd">'),
  ('<Field label="Reaction?">', '<Field label="Reaction?" schemaFieldId="reaction">'),
  ('<Field label="How do I feel after food?">', '<Field label="How do I feel after food?" schemaFieldId="feelings">'),
  ('<Field label="Symptoms after food">', '<Field label="Symptoms after food" schemaFieldId="symptomsAfter">'),
  ('<Field label="High histamine food?">', '<Field label="High histamine food?" schemaFieldId="highHistamine">'),
  ('<Field label="Histamine flare?">', '<Field label="Histamine flare?" schemaFieldId="histamineFlare">'),
  ('<Field label="Allergens in this meal">', '<Field label="Allergens in this meal" schemaFieldId="allergens">'),
  ('<Field label="Additional note (optional)">', '<Field label="Additional note (optional)" schemaFieldId="note">'),
]
for old_s, new_s in repls:
    assert old_s in food, f'missing food anchor {old_s}'
    food = food.replace(old_s, new_s, 1)
old_grid = '''      <div className="grid grid-cols-3 gap-2">\n        <Field label="Water (ml)">'''
new_grid = '''      <RegistryFieldBlock fieldId="intake">\n      <div className="grid grid-cols-3 gap-2">\n        <Field label="Water (ml)">'''
assert old_grid in food, 'food intake grid start missing'
food = food.replace(old_grid, new_grid, 1)
old_end = '''        <Field label="Alcohol (drinks)">\n          <Input type="number" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} placeholder="0" />\n        </Field>\n      </div>\n      <Field label="Additional note (optional)" schemaFieldId="note">'''
new_end = '''        <Field label="Alcohol (drinks)">\n          <Input type="number" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} placeholder="0" />\n        </Field>\n      </div>\n      </RegistryFieldBlock>\n      <Field label="Additional note (optional)" schemaFieldId="note">'''
assert old_end in food, 'food intake grid end missing'
food = food.replace(old_end, new_end, 1)
log.write_text(pre + food + post)

test = Path('src/lib/__tests__/food-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Food admin field order", () => {\n  it("registers stable logical blocks", () => {\n    expect((BIXBO_LOG_FIELDS.food ?? []).map((f) => f.id)).toEqual([\n      "time", "what", "quickAdd", "reaction", "feelings", "symptomsAfter", "highHistamine", "histamineFlare", "allergens", "intake", "note",\n    ]);\n  });\n  it("respects admin order", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: { food: { fields: { note: { order: 1 }, time: { order: 999 } } } } } } };\n    expect(registryFieldsForFeature(data, "food").map((f) => f.id)[0]).toBe("note");\n  });\n});\n''')
