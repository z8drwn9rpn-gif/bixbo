from pathlib import Path
import re

# Builder validation/sanitization
p = Path('src/components/CoreFeatureCustomFieldBuilder.tsx')
s = p.read_text()

marker = 'const FIELD_KINDS: RegistryFieldKind[] = ["text", "number", "toggle", "chips", "scale"];\n'
insert = '''const FIELD_KINDS: RegistryFieldKind[] = ["text", "number", "toggle", "chips", "scale"];\n\nfunction sanitizeOptions(options: string[] | undefined): string[] {\n  const seen = new Set<string>();\n  return (options ?? [])\n    .map((option) => option.trim())\n    .filter((option) => option.length > 0 && !seen.has(option) && Boolean(seen.add(option)));\n}\n\nfunction sanitizeScale(scale: RegistryFieldDefinition["scale"]): NonNullable<RegistryFieldDefinition["scale"]> {\n  const rawMin = Number(scale?.min);\n  const rawMax = Number(scale?.max);\n  const rawStep = Number(scale?.step);\n  const min = Number.isFinite(rawMin) ? rawMin : 1;\n  const maxCandidate = Number.isFinite(rawMax) ? rawMax : 10;\n  const max = maxCandidate > min ? maxCandidate : min + 1;\n  const stepCandidate = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;\n  const span = max - min;\n  const step = Math.min(stepCandidate, span);\n  return { min, max, step };\n}\n'''
if marker not in s:
    raise SystemExit('FIELD_KINDS marker missing')
s = s.replace(marker, insert, 1)

old = '''  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {\n    const current = getDeviceAdminConfig();\n    const fields = current.features?.[featureId]?.customFields ?? [];\n    writeFields(featureId, fields.map((field) => field.id === fieldId ? { ...field, ...patch, id: field.id } : field));\n  };'''
new = '''  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {\n    const current = getDeviceAdminConfig();\n    const fields = current.features?.[featureId]?.customFields ?? [];\n    writeFields(featureId, fields.map((field) => {\n      if (field.id !== fieldId) return field;\n      const next = { ...field, ...patch, id: field.id };\n      return {\n        ...next,\n        label: next.label.trimStart(),\n        ...(next.kind === "chips" ? { options: sanitizeOptions(next.options) } : { options: undefined }),\n        ...(next.kind === "scale" ? { scale: sanitizeScale(next.scale) } : { scale: undefined }),\n      };\n    }));\n  };'''
if old not in s:
    raise SystemExit('patchField marker missing')
s = s.replace(old, new, 1)

# Keep at least one chips option when deleting the last remaining option.
old_remove = 'onClick={() => patchField(feature.id, field.id, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })}'
new_remove = 'disabled={(field.options?.length ?? 0) <= 1} onClick={() => patchField(feature.id, field.id, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })}'
if old_remove in s:
    s = s.replace(old_remove, new_remove, 1)

# Avoid duplicate add labels by generating a unique default option label.
old_add = '''onClick={() => patchField(feature.id, field.id, { options: [...(field.options ?? []), `${t("Option")} ${(field.options?.length ?? 0) + 1}`] })}'''
new_add = '''onClick={() => {\n                            const existing = sanitizeOptions(field.options);\n                            let index = existing.length + 1;\n                            let label = `${t("Option")} ${index}`;\n                            while (existing.includes(label)) { index += 1; label = `${t("Option")} ${index}`; }\n                            patchField(feature.id, field.id, { options: [...existing, label] });\n                          }}'''
if old_add in s:
    s = s.replace(old_add, new_add, 1)

p.write_text(s)
print('builder validation patched')

# Runtime defensive normalization
p = Path('src/components/CoreFeatureCustomFieldsForm.tsx')
s = p.read_text()
old_scale = '''function scaleValues(field: RegistryFieldDefinition): number[] {\n  const min = field.scale?.min ?? 0;\n  const max = field.scale?.max ?? 10;\n  const step = field.scale?.step && field.scale.step > 0 ? field.scale.step : 1;\n  const count = Math.max(1, Math.min(101, Math.floor((max - min) / step) + 1));\n  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(4)));\n}'''
new_scale = '''function scaleValues(field: RegistryFieldDefinition): number[] {\n  const rawMin = Number(field.scale?.min);\n  const rawMax = Number(field.scale?.max);\n  const rawStep = Number(field.scale?.step);\n  const min = Number.isFinite(rawMin) ? rawMin : 0;\n  const maxCandidate = Number.isFinite(rawMax) ? rawMax : 10;\n  const max = maxCandidate > min ? maxCandidate : min + 1;\n  const stepCandidate = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;\n  const step = Math.min(stepCandidate, max - min);\n  const count = Math.max(1, Math.min(101, Math.floor((max - min) / step) + 1));\n  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(4)));\n}\n\nfunction safeOptions(field: RegistryFieldDefinition): string[] {\n  const seen = new Set<string>();\n  return (field.options ?? [])\n    .map((option) => option.trim())\n    .filter((option) => option.length > 0 && !seen.has(option) && Boolean(seen.add(option)));\n}'''
if old_scale not in s:
    raise SystemExit('runtime scaleValues marker missing')
s = s.replace(old_scale, new_scale, 1)
s = s.replace('(field.options ?? []).map((option) => {', 'safeOptions(field).map((option) => {', 1)
p.write_text(s)
print('runtime validation patched')
