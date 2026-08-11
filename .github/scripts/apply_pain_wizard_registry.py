from pathlib import Path

registry = Path('src/lib/appRegistry.ts')
text = registry.read_text()
old = '''  pain: [
    { id: "score", label: "Pain scale", kind: "scale", order: 10, scale: { min: 0, max: 10, step: 1 } },
    { id: "parts", label: "Where does it hurt?", kind: "chips", order: 20, options: ["Head", "Neck", "Shoulder", "Chest", "Upper back", "Lower back", "Abdomen", "Pelvis", "Hip", "Arm", "Hand", "Leg", "Knee", "Foot"] },
    { id: "quality", label: "How does it hurt?", kind: "chips", order: 30, options: ["Sharp", "Dull", "Throbbing", "Burning", "Cramping", "Pressure", "Stabbing", "Aching"] },
    { id: "symptoms", label: "Other symptoms", kind: "chips", order: 40 },
  ],'''
new = '''  pain: [
    { id: "score", label: "Pain scale", kind: "scale", order: 10, scale: { min: 0, max: 10, step: 1 } },
    { id: "parts", label: "Where does it hurt?", kind: "chips", order: 20, options: ["Head", "Neck", "Shoulder", "Chest", "Upper back", "Lower back", "Abdomen", "Pelvis", "Hip", "Arm", "Hand", "Leg", "Knee", "Foot"] },
    { id: "quality", label: "How does it hurt?", kind: "chips", order: 30, options: ["Sharp", "Dull", "Throbbing", "Burning", "Cramping", "Pressure", "Stabbing", "Aching"] },
    { id: "symptoms", label: "Other symptoms", kind: "chips", order: 40 },
    { id: "details", label: "Details", kind: "text", order: 50 },
  ],'''
assert old in text, 'pain registry block not found'
registry.write_text(text.replace(old, new))

admin = Path('src/components/AdminEditOverlay.tsx')
text = admin.read_text()
old = '''                                  {(featureId === "panic" || featureId === "tetany") ? ('''
new = '''                                  {(featureId === "pain" || featureId === "panic" || featureId === "tetany") ? ('''
assert old in text, 'admin drag gate not found'
admin.write_text(text.replace(old, new))

log = Path('src/components/LogSheet.tsx')
text = log.read_text()
old = '''import { getRegistryFeature, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";'''
new = '''import { getRegistryFeature, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryFieldsForFeature, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";'''
assert old in text, 'appRegistry import not found'
text = text.replace(old, new)

old = '''  const [step, setStep] = useState(0);
  const [score, setScore] = useState(initialEntry?.score ?? 0);'''
new = '''  const [step, setStep] = useState(0);
  const painSteps = useMemo(() => {
    const configured = registryFieldsForFeature(data, "pain");
    return configured.length ? configured : [
      { id: "score", label: "Pain scale" },
      { id: "parts", label: "Where does it hurt?" },
      { id: "quality", label: "How does it hurt?" },
      { id: "symptoms", label: "Other symptoms" },
      { id: "details", label: "Details" },
    ];
  }, [data]);
  const safeStep = Math.min(step, Math.max(0, painSteps.length - 1));
  const activePainStep = painSteps[safeStep];
  const activePainStepId = activePainStep?.id ?? "score";
  const symptomsStepIndex = painSteps.findIndex((field) => field.id === "symptoms");
  const [score, setScore] = useState(initialEntry?.score ?? 0);'''
assert old in text, 'pain step state anchor not found'
text = text.replace(old, new)

old = '''    setQuickSymptomUpdate(true);
    setStep(3);'''
new = '''    setQuickSymptomUpdate(true);
    setStep(symptomsStepIndex >= 0 ? symptomsStepIndex : 0);'''
assert old in text, 'quick symptom fixed step not found'
text = text.replace(old, new)

text = text.replace('''    if (dx < 0 && step < 4) setStep(step + 1);
    else if (dx > 0 && step > 0) setStep(step - 1);''', '''    if (dx < 0 && safeStep < painSteps.length - 1) setStep(safeStep + 1);
    else if (dx > 0 && safeStep > 0) setStep(safeStep - 1);''')

text = text.replace('''          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}''', '''          {safeStep > 0 ? (
            <button
              type="button"
              onClick={() => setStep(safeStep - 1)}''')

old = '''              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-tint"}`}
                />
              ))}
            </div>
            <span className="shrink-0 text-xs font-semibold text-foreground/75">{step + 1}/5</span>'''
new = '''              {painSteps.map((painStep, i) => (
                <span
                  key={painStep.id}
                  className={`h-1.5 w-5 rounded-full transition-colors ${i <= safeStep ? "bg-primary" : "bg-tint"}`}
                />
              ))}
            </div>
            <span className="min-w-0 truncate text-xs font-semibold text-foreground/75">{t(activePainStep?.label ?? "")}</span>
            <span className="shrink-0 text-xs font-semibold text-foreground/75">{safeStep + 1}/{painSteps.length}</span>'''
assert old in text, 'pain progress block not found'
text = text.replace(old, new)

old = '''            onClick={step < 4 ? () => setStep(step + 1) : save}'''
new = '''            onClick={safeStep < painSteps.length - 1 ? () => setStep(safeStep + 1) : save}'''
assert old in text, 'next click not found'
text = text.replace(old, new)
old = '''            <span className="text-sm font-semibold leading-none">{t(step < 4 ? "Next" : "Save")}</span>
            <span aria-hidden="true" className="mt-0.5 text-base leading-none">{step < 4 ? "→" : "✓"}</span>'''
new = '''            <span className="text-sm font-semibold leading-none">{t(safeStep < painSteps.length - 1 ? "Next" : "Save")}</span>
            <span aria-hidden="true" className="mt-0.5 text-base leading-none">{safeStep < painSteps.length - 1 ? "→" : "✓"}</span>'''
assert old in text, 'next label block not found'
text = text.replace(old, new)

text = text.replace('{step === 0 && (', '{activePainStepId === "score" && (', 1)
text = text.replace('{step === 1 && (', '{activePainStepId === "parts" && (', 1)
text = text.replace('{step === 2 && (', '{activePainStepId === "quality" && (', 1)
text = text.replace('{step === 3 && (', '{activePainStepId === "symptoms" && (', 1)
text = text.replace('{step === 4 && (', '{activePainStepId === "details" && (', 1)
text = text.replace('quickSymptomUpdate && step === 3', 'quickSymptomUpdate && activePainStepId === "symptoms"')

old = '''          {latestPain && !initialEntry && ('''
new = '''          {latestPain && !initialEntry && symptomsStepIndex >= 0 && ('''
assert old in text, 'quick update card gate not found'
text = text.replace(old, new, 1)

log.write_text(text)

# Focused contract test.
test = Path('src/lib/__tests__/pain-wizard-step-order.test.ts')
test.write_text('''import { describe, expect, it } from "vitest";\n\nimport { BIXBO_LOG_FIELDS, registryFieldsForFeature } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\ndescribe("Pain wizard admin step order", () => {\n  it("registers all five wizard steps with stable IDs", () => {\n    expect((BIXBO_LOG_FIELDS.pain ?? []).map((field) => field.id)).toEqual([\n      "score", "parts", "quality", "symptoms", "details",\n    ]);\n  });\n\n  it("uses admin order without changing stable IDs", () => {\n    const data = {\n      ...EMPTY,\n      settings: {\n        ...EMPTY.settings,\n        adminConfig: {\n          enabled: true,\n          features: { pain: { fields: { details: { order: 1 }, score: { order: 999 } } } },\n        },\n      },\n    };\n    expect(registryFieldsForFeature(data, "pain").map((field) => field.id)).toEqual([\n      "details", "parts", "quality", "symptoms", "score",\n    ]);\n  });\n});\n''')
