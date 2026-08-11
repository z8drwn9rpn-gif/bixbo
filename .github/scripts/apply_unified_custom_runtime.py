from pathlib import Path
import re

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

s = s.replace('import { CoreFeatureCustomFieldsForm } from "@/components/CoreFeatureCustomFieldsForm";', 'import { CoreFeatureCustomFieldInput } from "@/components/CoreFeatureCustomFieldsForm";')
s = s.replace('import { getRegistryFeature, getRegistryField, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryFieldsForFeature, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";', 'import { BIXBO_LOG_FIELDS, getRegistryFeature, getRegistryField, isRegistrySurfaceEnabled, registryCustomFieldsForFeature, registryFieldLabel, registryFieldOptions, registryFieldScale, registryFieldsForFeature, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";')

old_bottom = '''              {activeRegistryFeature && activeAdminFields.length ? (\n                <CoreFeatureCustomFieldsForm\n                  fields={activeAdminFields}\n                  values={adminFieldValues}\n                  onChange={(fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value }))}\n                />\n              ) : null}\n'''
if old_bottom not in s:
    raise SystemExit('custom bottom block not found')
s = s.replace(old_bottom, '')

marker = '''/* ------------------- Primitives ------------------- */\nfunction Field({ label, children, schemaFieldId }: { label: string; children: ReactNode; schemaFieldId?: string }) {'''
replacement = '''/* ------------------- Primitives ------------------- */\nfunction InlineAdminCustomFields({ anchorFieldId }: { anchorFieldId?: string }) {\n  const schema = useLogSchema();\n  if (!schema || schema.featureId === "pain" || !anchorFieldId || !schema.adminFields.length) return null;\n  const firstCoreFieldId = BIXBO_LOG_FIELDS[schema.featureId]?.[0]?.id;\n  if (firstCoreFieldId !== anchorFieldId) return null;\n  return (\n    <>\n      {schema.adminFields.map((field) => (\n        <CoreFeatureCustomFieldInput\n          key={field.id}\n          field={field}\n          value={schema.adminFieldValues[field.id]}\n          onChange={(value) => schema.setAdminFieldValue(field.id, value)}\n          style={{ order: field.order }}\n        />\n      ))}\n    </>\n  );\n}\n\nfunction Field({ label, children, schemaFieldId }: { label: string; children: ReactNode; schemaFieldId?: string }) {'''
if marker not in s:
    raise SystemExit('Field marker not found')
s = s.replace(marker, replacement)

old_field_return = '''  return (\n    <div className={configuredField?.enabled === false ? "hidden" : "block"} style={configuredField ? { order: configuredField.order } : undefined} data-bixbo-log-field-id={fieldId || undefined}>\n      <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>\n      <div className="mt-1">{children}</div>\n    </div>\n  );\n}\nfunction RegistryFieldBlock'''
new_field_return = '''  return (\n    <>\n      <InlineAdminCustomFields anchorFieldId={fieldId} />\n      <div className={configuredField?.enabled === false ? "hidden" : "block"} style={configuredField ? { order: configuredField.order } : undefined} data-bixbo-log-field-id={fieldId || undefined}>\n        <span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>\n        <div className="mt-1">{children}</div>\n      </div>\n    </>\n  );\n}\nfunction RegistryFieldBlock'''
if old_field_return not in s:
    raise SystemExit('Field return not found')
s = s.replace(old_field_return, new_field_return)

old_block = '''  return (\n    <div\n      className={configuredField?.enabled === false ? "hidden" : "block"}\n      style={configuredField ? { order: configuredField.order } : undefined}\n      data-bixbo-log-field-id={fieldId}\n    >\n      {children}\n    </div>\n  );\n}\n\nfunction Chip'''
new_block = '''  return (\n    <>\n      <InlineAdminCustomFields anchorFieldId={fieldId} />\n      <div\n        className={configuredField?.enabled === false ? "hidden" : "block"}\n        style={configuredField ? { order: configuredField.order } : undefined}\n        data-bixbo-log-field-id={fieldId}\n      >\n        {children}\n      </div>\n    </>\n  );\n}\n\nfunction Chip'''
if old_block not in s:
    raise SystemExit('RegistryFieldBlock return not found')
s = s.replace(old_block, new_block)

old_steps = '''  const painSteps = useMemo(() => {\n    const configured = registryFieldsForFeature(data, "pain");\n    return configured.length ? configured : [\n      { id: "score", label: "Pain scale" },\n      { id: "parts", label: "Where does it hurt?" },\n      { id: "quality", label: "How does it hurt?" },\n      { id: "symptoms", label: "Other symptoms" },\n      { id: "details", label: "Details" },\n    ];\n  }, [data]);'''
new_steps = '''  const schema = useLogSchema();\n  const painSteps = useMemo(() => {\n    const configured = [\n      ...registryFieldsForFeature(data, "pain"),\n      ...registryCustomFieldsForFeature(data, "pain"),\n    ].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));\n    return configured.length ? configured : [\n      { id: "score", label: "Pain scale", kind: "scale" as const, order: 10 },\n      { id: "parts", label: "Where does it hurt?", kind: "chips" as const, order: 20 },\n      { id: "quality", label: "How does it hurt?", kind: "chips" as const, order: 30 },\n      { id: "symptoms", label: "Other symptoms", kind: "chips" as const, order: 40 },\n      { id: "details", label: "Details", kind: "text" as const, order: 50 },\n    ];\n  }, [data]);'''
if old_steps not in s:
    raise SystemExit('pain steps not found')
s = s.replace(old_steps, new_steps)

needle = '''  const activePainStep = painSteps[safeStep];\n  const activePainStepId = activePainStep?.id ?? "score";'''
rep = '''  const activePainStep = painSteps[safeStep];\n  const activePainStepId = activePainStep?.id ?? "score";\n  const activePainStepIsCustom = !!activePainStep && !(BIXBO_LOG_FIELDS.pain ?? []).some((field) => field.id === activePainStep.id);'''
if needle not in s:
    raise SystemExit('active pain step marker not found')
s = s.replace(needle, rep)

# Render a custom field as its own Pain wizard step, before built-in step content.
render_marker = '''      {activePainStepId === "score" && (\n        <div className="flex flex-col items-center gap-4 py-6">'''
render_replacement = '''      {activePainStepIsCustom && activePainStep && schema ? (\n        <CoreFeatureCustomFieldInput\n          field={activePainStep}\n          value={schema.adminFieldValues[activePainStep.id]}\n          onChange={(value) => schema.setAdminFieldValue(activePainStep.id, value)}\n          className="mx-1"\n        />\n      ) : null}\n\n      {activePainStepId === "score" && (\n        <div className="flex flex-col items-center gap-4 py-6">'''
if render_marker not in s:
    raise SystemExit('pain render marker not found')
s = s.replace(render_marker, render_replacement)

# Pain has its own wizard Save button rather than SaveBar, so persist admin fields there too.
# Inject immediately before onDone in the PainWizard save function only.
pain_start = s.index('function PainWizard(')
pain_end = s.index('/* ------------------- PANIC', pain_start) if '/* ------------------- PANIC' in s[pain_start:] else s.index('function PanicForm', pain_start)
pain_chunk = s[pain_start:pain_end]
last = pain_chunk.rfind('    onDone();')
if last < 0:
    raise SystemExit('Pain onDone not found')
pain_chunk = pain_chunk[:last] + '    schema?.saveAdminCustomFields();\n' + pain_chunk[last:]
s = s[:pain_start] + pain_chunk + s[pain_end:]

# CSS order only works for flex/grid children. Convert each core form's top-level spacing container to flex-column.
form_names = [
    'PostpartumSymptomsForm', 'PanicForm', 'TetanyForm', 'PeriodForm', 'SexForm', 'ThermoForm',
    'BowelForm', 'TempForm', 'MedsForm', 'TaskForm', 'EventForm', 'NoteForm'
]
for name in form_names:
    start = s.find(f'function {name}(')
    if start < 0:
        continue
    next_fn = s.find('\nfunction ', start + 10)
    if next_fn < 0:
        next_fn = len(s)
    chunk = s[start:next_fn]
    m = re.search(r'className="space-y-(\d+)"', chunk)
    if m:
        n = m.group(1)
        chunk = chunk[:m.start()] + f'className="flex flex-col gap-{n}"' + chunk[m.end():]
        s = s[:start] + chunk + s[next_fn:]

p.write_text(s)
print('patched LogSheet unified core/custom runtime')
