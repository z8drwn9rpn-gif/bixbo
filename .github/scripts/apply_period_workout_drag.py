from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  period: [
    { id: "flow", label: "Bleeding", kind: "chips", order: 10, options: ["Spotting", "Light", "Medium", "Heavy", "Very heavy"] },
    { id: "cramps", label: "Cramp pain", kind: "scale", order: 20, scale: { min: 1, max: 10, step: 1 } },
    { id: "discharge", label: "Discharge (optional)", kind: "chips", order: 30 },
  ],
  workout: [
    { id: "kind", label: "Type", kind: "chips", order: 10 },
    { id: "minutes", label: "Duration (minutes)", kind: "number", order: 20 },
    { id: "rpe", label: "Intensity (RPE)", kind: "scale", order: 30, scale: { min: 1, max: 10, step: 1 } },
    { id: "feel", label: "How you feel", kind: "chips", order: 40, options: ["Great", "Good", "Ok", "Tired", "Sore"] },
  ],'''
new = '''  period: [
    { id: "flow", label: "Flow", kind: "chips", order: 10, options: ["Spotting", "Light", "Medium", "Heavy", "Very heavy"] },
    { id: "cramps", label: "Cramp pain", kind: "scale", order: 20, scale: { min: 1, max: 10, step: 1 } },
    { id: "discharge", label: "Discharge (optional)", kind: "chips", order: 30 },
    { id: "dischargeNote", label: "Discharge note (optional)", kind: "text", order: 40 },
    { id: "note", label: "Day note (optional)", kind: "text", order: 50 },
    { id: "birthControlSince", label: "Birth control since (optional)", kind: "text", order: 60 },
    { id: "pregnant", label: "Pregnant?", kind: "toggle", order: 70 },
  ],
  workout: [
    { id: "kind", label: "Type", kind: "chips", order: 10 },
    { id: "minutes", label: "Duration (minutes)", kind: "number", order: 20 },
    { id: "distance", label: "Distance / elevation", kind: "number", order: 30 },
    { id: "exercises", label: "Exercises", kind: "text", order: 40 },
    { id: "rpe", label: "Intensity (RPE)", kind: "scale", order: 50, scale: { min: 1, max: 10, step: 1 } },
    { id: "magnesiumBefore", label: "Magnesium before workout?", kind: "toggle", order: 60 },
    { id: "triggeredSymptom", label: "Triggered a symptom? (optional)", kind: "chips", order: 70 },
    { id: "weightKg", label: "Weight after (kg, optional)", kind: "number", order: 80 },
    { id: "feel", label: "How you feel", kind: "chips", order: 90, options: ["Great", "Good", "Ok", "Tired", "Sore"] },
    { id: "note", label: "Note (optional)", kind: "text", order: 100 },
  ],'''
assert old in text, 'period/workout registry block not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''                                  {(featureId === "pain" || featureId === "panic" || featureId === "tetany" || featureId === "bowel") ? ('''
new = '''                                  {(featureId === "pain" || featureId === "panic" || featureId === "tetany" || featureId === "bowel" || featureId === "period" || featureId === "workout") ? ('''
assert old in text, 'admin field drag gate not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()
anchor = '''function Chip({\n'''
insert = '''function RegistryFieldBlock({ fieldId, children }: { fieldId: string; children: ReactNode }) {\n  const schema = useLogSchema();\n  const configuredField = schema ? getRegistryField(schema.data, schema.featureId, fieldId) : undefined;\n  return (\n    <div\n      className={configuredField?.enabled === false ? "hidden" : "block"}\n      style={configuredField ? { order: configuredField.order } : undefined}\n      data-bixbo-log-field-id={fieldId}\n    >\n      {children}\n    </div>\n  );\n}\n\n'''
assert anchor in text, 'Chip anchor not found'
text = text.replace(anchor, insert + anchor, 1)

text = text.replace('''  return (\n    <div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Flow">''', '''  return (\n    <div className="flex flex-col gap-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Flow" schemaFieldId="flow">''', 1)
text = text.replace('''      <Field label={`${t("Cramp pain")} ${cramps ?? "—"} / 10`}>''', '''      <Field label={`${t("Cramp pain")} ${cramps ?? "—"} / 10`} schemaFieldId="cramps">''', 1)
text = text.replace('''      <Field label="Discharge (optional)">''', '''      <Field label="Discharge (optional)" schemaFieldId="discharge">''', 1)
text = text.replace('''      <Field label="Discharge note (optional)">''', '''      <Field label="Discharge note (optional)" schemaFieldId="dischargeNote">''', 1)
text = text.replace('''      <Field label="Day note (optional)">''', '''      <Field label="Day note (optional)" schemaFieldId="note">''', 1)
text = text.replace('''      <Field label="Birth control since (optional)">''', '''      <Field label="Birth control since (optional)" schemaFieldId="birthControlSince">''', 1)
text = text.replace('''      <Field label="Pregnant?">''', '''      <Field label="Pregnant?" schemaFieldId="pregnant">''', 1)

workout_anchor = '''function WorkoutForm({'''
workout_pos = text.index(workout_anchor)
head = text[:workout_pos]
workout = text[workout_pos:]
workout = workout.replace('''  return (\n    <div className="space-y-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Type">''', '''  return (\n    <div className="flex flex-col gap-3">\n      <SaveBar onCancel={onDone} onSave={save} />\n      <Field label="Type" schemaFieldId="kind">''', 1)
workout = workout.replace('''      <Field label="Duration (minutes)">''', '''      <Field label="Duration (minutes)" schemaFieldId="minutes">''', 1)
workout = workout.replace('''      {workoutHasDistance(kind) && (\n        <div className="grid grid-cols-2 gap-2">''', '''      {workoutHasDistance(kind) && (\n        <RegistryFieldBlock fieldId="distance">\n        <div className="grid grid-cols-2 gap-2">''', 1)
workout = workout.replace('''        </div>\n      )}\n\n      {workoutIsStrength(kind) && (\n        <Field label="Exercises">''', '''        </div>\n        </RegistryFieldBlock>\n      )}\n\n      {workoutIsStrength(kind) && (\n        <Field label="Exercises" schemaFieldId="exercises">''', 1)
workout = workout.replace('''      <Field label={`${t("Intensity (RPE)")} ${rpe ?? "—"} / 10`}>''', '''      <Field label={`${t("Intensity (RPE)")} ${rpe ?? "—"} / 10`} schemaFieldId="rpe">''', 1)
workout = workout.replace('''      <Field label="Magnesium before workout?">''', '''      <Field label="Magnesium before workout?" schemaFieldId="magnesiumBefore">''', 1)
workout = workout.replace('''      <Field label="Triggered a symptom? (optional)">''', '''      <Field label="Triggered a symptom? (optional)" schemaFieldId="triggeredSymptom">''', 1)
workout = workout.replace('''      <Field label="Weight after (kg, optional)">''', '''      <Field label="Weight after (kg, optional)" schemaFieldId="weightKg">''', 1)
workout = workout.replace('''      <Field label="How you feel">''', '''      <Field label="How you feel" schemaFieldId="feel">''', 1)
workout = workout.replace('''      <Field label="Note (optional)">''', '''      <Field label="Note (optional)" schemaFieldId="note">''', 1)
text = head + workout
log.write_text(text)

test = Path('src/lib/__tests__/period-workout-field-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Period and Workout admin field order", () => {\n  it("registers stable Period field IDs", () => {\n    expect((BIXBO_LOG_FIELDS.period ?? []).map((f) => f.id)).toEqual([\n      "flow", "cramps", "discharge", "dischargeNote", "note", "birthControlSince", "pregnant",\n    ]);\n  });\n\n  it("registers stable Workout block IDs", () => {\n    expect((BIXBO_LOG_FIELDS.workout ?? []).map((f) => f.id)).toEqual([\n      "kind", "minutes", "distance", "exercises", "rpe", "magnesiumBefore", "triggeredSymptom", "weightKg", "feel", "note",\n    ]);\n  });\n\n  it("respects admin order without changing stable IDs", () => {\n    const data = { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: { enabled: true, features: {\n      period: { fields: { pregnant: { order: 1 }, flow: { order: 999 } } },\n      workout: { fields: { note: { order: 1 }, kind: { order: 999 } } },\n    } } } };\n    expect(registryFieldsForFeature(data, "period").map((f) => f.id)[0]).toBe("pregnant");\n    expect(registryFieldsForFeature(data, "workout").map((f) => f.id)[0]).toBe("note");\n  });\n});\n''')
