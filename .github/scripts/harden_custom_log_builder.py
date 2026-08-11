from pathlib import Path

# Builder: same validation + stable option-label semantics as core custom fields.
p = Path('src/components/CustomLogBuilder.tsx')
s = p.read_text()
marker = 'const ICONS = ['
helpers = '''function sanitizeOptions(options: string[] | undefined): string[] {\n  const seen = new Set<string>();\n  return (options ?? [])\n    .map((option) => option.trim())\n    .filter((option) => option.length > 0 && !seen.has(option) && Boolean(seen.add(option)));\n}\n\nfunction sanitizeOptionLabels(options: string[] | undefined, labels: Record<string, string> | undefined): Record<string, string> | undefined {\n  const allowed = new Set(options ?? []);\n  const out = Object.fromEntries(\n    Object.entries(labels ?? {})\n      .filter(([value]) => allowed.has(value))\n      .map(([value, label]) => [value, label.trim()])\n      .filter(([value, label]) => Boolean(label) && label !== value),\n  );\n  return Object.keys(out).length ? out : undefined;\n}\n\nfunction sanitizeScale(scale: RegistryFieldDefinition["scale"]): NonNullable<RegistryFieldDefinition["scale"]> {\n  const rawMin = Number(scale?.min);\n  const rawMax = Number(scale?.max);\n  const rawStep = Number(scale?.step);\n  const min = Number.isFinite(rawMin) ? rawMin : 1;\n  const maxCandidate = Number.isFinite(rawMax) ? rawMax : 10;\n  const max = maxCandidate > min ? maxCandidate : min + 1;\n  const stepCandidate = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;\n  return { min, max, step: Math.min(stepCandidate, max - min) };\n}\n\nfunction displayOptionLabel(field: RegistryFieldDefinition, option: string): string {\n  return field.optionLabels?.[option] ?? option;\n}\n\n'''
if marker not in s:
    raise SystemExit('ICONS marker missing')
s = s.replace(marker, helpers + marker, 1)

old_patch = '''  const patchField = (log: CustomLogDefinition, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {\n    patchLog(log.id, { fields: log.fields.map((field) => (field.id === fieldId ? { ...field, ...patch, id: field.id } : field)) });\n  };'''
new_patch = '''  const patchField = (log: CustomLogDefinition, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {\n    patchLog(log.id, {\n      fields: log.fields.map((field) => {\n        if (field.id !== fieldId) return field;\n        const next = { ...field, ...patch, id: field.id };\n        if (next.kind === "chips") {\n          const options = sanitizeOptions(next.options);\n          return { ...next, options, optionLabels: sanitizeOptionLabels(options, next.optionLabels), scale: undefined };\n        }\n        if (next.kind === "scale") return { ...next, options: undefined, optionLabels: undefined, scale: sanitizeScale(next.scale) };\n        return { ...next, options: undefined, optionLabels: undefined, scale: undefined };\n      }),\n    });\n  };'''
if old_patch not in s:
    raise SystemExit('patchField marker missing')
s = s.replace(old_patch, new_patch, 1)

old_kind = '''patchField(log, field.id, { kind, options: kind === "chips" ? (field.options?.length ? field.options : [t("Option 1")]) : undefined, scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined });'''
new_kind = '''patchField(log, field.id, { kind, options: kind === "chips" ? (field.options?.length ? field.options : [t("Option 1")]) : undefined, optionLabels: kind === "chips" ? field.optionLabels : undefined, scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined });'''
if old_kind not in s:
    raise SystemExit('kind switch marker missing')
s = s.replace(old_kind, new_kind, 1)

old_options = '''{(field.options ?? []).map((option, optionIndex) => <div key={`${field.id}-${optionIndex}`} className="flex gap-2"><input value={option} onChange={(event) => { const options = [...(field.options ?? [])]; options[optionIndex] = event.target.value; patchField(log, field.id, { options }); }} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] ring-1 ring-border"/><button type="button" onClick={() => patchField(log, field.id, { options: (field.options ?? []).filter((_, i) => i !== optionIndex) })} className="rounded-full bg-background px-2 text-[10px] ring-1 ring-border">×</button></div>)}\n                    <button type="button" onClick={() => patchField(log, field.id, { options: [...(field.options ?? []), `${t("Option")} ${(field.options?.length ?? 0) + 1}`] })} className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border">+ {t("Add option")}</button>'''
new_options = '''{(field.options ?? []).map((option, optionIndex) => (\n                      <div key={`${field.id}-${option}`} className="flex gap-2">\n                        <input\n                          value={displayOptionLabel(field, option)}\n                          onChange={(event) => patchField(log, field.id, { optionLabels: { ...(field.optionLabels ?? {}), [option]: event.target.value } })}\n                          className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] ring-1 ring-border"\n                        />\n                        <button\n                          type="button"\n                          disabled={(field.options?.length ?? 0) <= 1}\n                          onClick={() => {\n                            const options = (field.options ?? []).filter((_, i) => i !== optionIndex);\n                            const optionLabels = { ...(field.optionLabels ?? {}) };\n                            delete optionLabels[option];\n                            patchField(log, field.id, { options, optionLabels });\n                          }}\n                          className="rounded-full bg-background px-2 text-[10px] ring-1 ring-border disabled:opacity-30"\n                        >×</button>\n                      </div>\n                    ))}\n                    <button type="button" onClick={() => {\n                      const existing = sanitizeOptions(field.options);\n                      let optionNumber = existing.length + 1;\n                      let option = `${t("Option")} ${optionNumber}`;\n                      while (existing.includes(option)) { optionNumber += 1; option = `${t("Option")} ${optionNumber}`; }\n                      patchField(log, field.id, { options: [...existing, option] });\n                    }} className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border">+ {t("Add option")}</button>'''
if old_options not in s:
    raise SystemExit('chips editor marker missing')
s = s.replace(old_options, new_options, 1)
p.write_text(s)

# Runtime: defensive scale/options normalization + stable display labels.
p = Path('src/components/CustomLogForm.tsx')
s = p.read_text()
old_scale = '''function scaleValues(field: RegistryFieldDefinition): number[] {\n  const min = field.scale?.min ?? 0;\n  const max = field.scale?.max ?? 10;\n  const step = field.scale?.step && field.scale.step > 0 ? field.scale.step : 1;\n  const count = Math.max(1, Math.min(101, Math.floor((max - min) / step) + 1));\n  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(4)));\n}'''
new_scale = '''function scaleValues(field: RegistryFieldDefinition): number[] {\n  const rawMin = Number(field.scale?.min);\n  const rawMax = Number(field.scale?.max);\n  const rawStep = Number(field.scale?.step);\n  const min = Number.isFinite(rawMin) ? rawMin : 0;\n  const maxCandidate = Number.isFinite(rawMax) ? rawMax : 10;\n  const max = maxCandidate > min ? maxCandidate : min + 1;\n  const stepCandidate = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;\n  const step = Math.min(stepCandidate, max - min);\n  const count = Math.max(1, Math.min(101, Math.floor((max - min) / step) + 1));\n  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(4)));\n}\n\nfunction safeOptions(field: RegistryFieldDefinition): string[] {\n  const seen = new Set<string>();\n  return (field.options ?? [])\n    .map((option) => option.trim())\n    .filter((option) => option.length > 0 && !seen.has(option) && Boolean(seen.add(option)));\n}'''
if old_scale not in s:
    raise SystemExit('CustomLogForm scale marker missing')
s = s.replace(old_scale, new_scale, 1)
s = s.replace('const options = field.options ?? [];', 'const options = safeOptions(field);', 1)
s = s.replace('{t(option)}', '{t(field.optionLabels?.[option] ?? option)}', 1)
p.write_text(s)

print('custom log builder/form hardened')
