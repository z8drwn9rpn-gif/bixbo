from pathlib import Path

# 1) Registry type: separate stable stored option values from display labels.
p = Path('src/lib/appRegistry.ts')
s = p.read_text()
old = '''  enabled?: boolean;\n  options?: string[];\n  scale?: RegistryScaleDefinition;\n}'''
new = '''  enabled?: boolean;\n  /** Stable stored option values. Renaming an option must not change these keys. */\n  options?: string[];\n  /** Optional display labels keyed by the stable stored option value. */\n  optionLabels?: Record<string, string>;\n  scale?: RegistryScaleDefinition;\n}'''
if old not in s:
    raise SystemExit('RegistryFieldDefinition marker missing')
s = s.replace(old, new, 1)
p.write_text(s)

# 2) Builder: edit display label only, preserve stable option value.
p = Path('src/components/CoreFeatureCustomFieldBuilder.tsx')
s = p.read_text()

marker = '''function sanitizeScale(scale: RegistryFieldDefinition["scale"]): NonNullable<RegistryFieldDefinition["scale"]> {'''
helper = '''function sanitizeOptionLabels(options: string[] | undefined, labels: Record<string, string> | undefined): Record<string, string> | undefined {\n  const allowed = new Set(options ?? []);\n  const out = Object.fromEntries(\n    Object.entries(labels ?? {})\n      .filter(([value]) => allowed.has(value))\n      .map(([value, label]) => [value, label.trim()])\n      .filter(([value, label]) => Boolean(label) && label !== value),\n  );\n  return Object.keys(out).length ? out : undefined;\n}\n\nfunction displayOptionLabel(field: RegistryFieldDefinition, option: string): string {\n  return field.optionLabels?.[option] ?? option;\n}\n\n'''
if marker not in s:
    raise SystemExit('sanitizeScale marker missing')
s = s.replace(marker, helper + marker, 1)

old_return = '''        ...(next.kind === "chips" ? { options: sanitizeOptions(next.options) } : { options: undefined }),\n        ...(next.kind === "scale" ? { scale: sanitizeScale(next.scale) } : { scale: undefined }),'''
new_return = '''        ...(next.kind === "chips"\n          ? (() => {\n              const options = sanitizeOptions(next.options);\n              return { options, optionLabels: sanitizeOptionLabels(options, next.optionLabels) };\n            })()\n          : { options: undefined, optionLabels: undefined }),\n        ...(next.kind === "scale" ? { scale: sanitizeScale(next.scale) } : { scale: undefined }),'''
if old_return not in s:
    raise SystemExit('patchField sanitizer marker missing')
s = s.replace(old_return, new_return, 1)

old_kind = '''                              options: kind === "chips" ? (field.options?.length ? field.options : [t("Option 1")]) : undefined,\n                              scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined,'''
new_kind = '''                              options: kind === "chips" ? (field.options?.length ? field.options : [t("Option 1")]) : undefined,\n                              optionLabels: kind === "chips" ? field.optionLabels : undefined,\n                              scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined,'''
if old_kind not in s:
    raise SystemExit('kind switch marker missing')
s = s.replace(old_kind, new_kind, 1)

old_input = '''                              <input value={option} onChange={(event) => { const options = [...(field.options ?? [])]; options[index] = event.target.value; patchField(feature.id, field.id, { options }); }} className="h-7 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" />'''
new_input = '''                              <input\n                                value={displayOptionLabel(field, option)}\n                                onChange={(event) => patchField(feature.id, field.id, {\n                                  optionLabels: { ...(field.optionLabels ?? {}), [option]: event.target.value },\n                                })}\n                                className="h-7 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border"\n                              />'''
if old_input not in s:
    raise SystemExit('option input marker missing')
s = s.replace(old_input, new_input, 1)

old_delete = '''disabled={(field.options?.length ?? 0) <= 1} onClick={() => patchField(feature.id, field.id, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })}'''
new_delete = '''disabled={(field.options?.length ?? 0) <= 1} onClick={() => {\n                                const options = (field.options ?? []).filter((_, optionIndex) => optionIndex !== index);\n                                const optionLabels = { ...(field.optionLabels ?? {}) };\n                                delete optionLabels[option];\n                                patchField(feature.id, field.id, { options, optionLabels });\n                              }}'''
if old_delete not in s:
    raise SystemExit('option delete marker missing')
s = s.replace(old_delete, new_delete, 1)

p.write_text(s)

# 3) Runtime form: show display label, save/click stable value.
p = Path('src/components/CoreFeatureCustomFieldsForm.tsx')
s = p.read_text()
old_button = '''              {t(option)}'''
new_button = '''              {t(field.optionLabels?.[option] ?? option)}'''
if old_button not in s:
    raise SystemExit('runtime option label marker missing')
s = s.replace(old_button, new_button, 1)
p.write_text(s)

# 4) Correlation selector: stable encoded option ID, renamed display label.
p = Path('src/routes/patterns.tsx')
s = p.read_text()
old_corr = '''          id: `admin-choice:${featureBase.id}:${field.id}:${encodeURIComponent(option)}`,\n          label: `${feature.label} · ${field.label}: ${option}`,'''
new_corr = '''          id: `admin-choice:${featureBase.id}:${field.id}:${encodeURIComponent(option)}`,\n          label: `${feature.label} · ${field.label}: ${field.optionLabels?.[option] ?? option}`,'''
if old_corr not in s:
    raise SystemExit('correlation option label marker missing')
s = s.replace(old_corr, new_corr, 1)
p.write_text(s)

print('stable admin option labels patched')
