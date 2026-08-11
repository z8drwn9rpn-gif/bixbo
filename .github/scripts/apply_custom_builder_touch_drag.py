from pathlib import Path

p = Path('src/components/CoreFeatureCustomFieldBuilder.tsx')
s = p.read_text()

s = s.replace('import { useMemo } from "react";', 'import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";')

anchor = '''export function CoreFeatureCustomFieldBuilder({ data }: { data: BixboData }) {\n  const { t } = useI18n();'''
replacement = '''export function CoreFeatureCustomFieldBuilder({ data }: { data: BixboData }) {\n  const { t } = useI18n();\n  const [draggedOption, setDraggedOption] = useState<{ featureId: RegistryFeatureId; fieldId: string; value: string } | null>(null);'''
if anchor not in s:
    raise SystemExit('component anchor not found')
s = s.replace(anchor, replacement, 1)

# Add helpers before moveField.
marker = '''  const moveField = (featureId: RegistryFeatureId, fieldId: string, delta: -1 | 1) => {'''
helpers = '''  const unifiedFieldIds = (featureId: RegistryFeatureId) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const currentView = { ...data, settings: { ...data.settings, adminConfig: current } } as BixboData;\n    const builtin = (BIXBO_LOG_FIELDS[featureId] ?? []).map((base) => ({\n      id: base.id,\n      order: getRegistryField(currentView, featureId, base.id)?.order ?? base.order,\n      custom: false,\n    }));\n    const custom = (feature.customFields ?? []).map((field) => ({ id: field.id, order: field.order, custom: true }));\n    return [...builtin, ...custom]\n      .sort((a, b) => a.order - b.order || (a.custom === b.custom ? a.id.localeCompare(b.id) : a.custom ? 1 : -1))\n      .map((field) => field.id);\n  };\n\n  const canMoveField = (featureId: RegistryFeatureId, fieldId: string, delta: -1 | 1) => {\n    const ids = unifiedFieldIds(featureId);\n    const index = ids.indexOf(fieldId);\n    const target = index + delta;\n    return index >= 0 && target >= 0 && target < ids.length;\n  };\n\n  const moveCustomOption = (featureId: RegistryFeatureId, fieldId: string, sourceValue: string, targetValue: string) => {\n    if (sourceValue === targetValue) return;\n    const current = getDeviceAdminConfig();\n    const field = current.features?.[featureId]?.customFields?.find((item) => item.id === fieldId);\n    if (!field?.options?.length) return;\n    const options = [...field.options];\n    const from = options.indexOf(sourceValue);\n    const to = options.indexOf(targetValue);\n    if (from < 0 || to < 0) return;\n    const [item] = options.splice(from, 1);\n    options.splice(to, 0, item);\n    patchField(featureId, fieldId, { options });\n  };\n\n  const moveDraggedOptionByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId, fieldId: string) => {\n    if (!draggedOption || draggedOption.featureId !== featureId || draggedOption.fieldId !== fieldId) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-custom-option-value]");\n    const targetValue = target?.dataset.adminCustomOptionValue;\n    if (targetValue && target?.dataset.adminCustomOptionFeature === featureId && target?.dataset.adminCustomOptionField === fieldId && targetValue !== draggedOption.value) {\n      moveCustomOption(featureId, fieldId, draggedOption.value, targetValue);\n    }\n  };\n\n  const moveField = (featureId: RegistryFeatureId, fieldId: string, delta: -1 | 1) => {'''
if marker not in s:
    raise SystemExit('moveField marker not found')
s = s.replace(marker, helpers, 1)

# Fix arrow disabled checks to use unified order rather than custom-only visual index.
s = s.replace('disabled={fieldIndex === 0} onClick={() => moveField(feature.id, field.id, -1)}', 'disabled={!canMoveField(feature.id, field.id, -1)} onClick={() => moveField(feature.id, field.id, -1)}')
s = s.replace('disabled={fieldIndex === fields.length - 1} onClick={() => moveField(feature.id, field.id, 1)}', 'disabled={!canMoveField(feature.id, field.id, 1)} onClick={() => moveField(feature.id, field.id, 1)}')

# fieldIndex is no longer needed.
s = s.replace('{fields.map((field, fieldIndex) => (', '{fields.map((field) => (')

# Add shown/hidden toggle before delete.
needle = '''                        <button type="button" onClick={() => deleteField(feature.id, field.id)} className="rounded-full px-2 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>'''
rep = '''                        <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className={`rounded-full px-2 py-1 text-[9px] font-semibold ring-1 ring-border ${field.enabled === false ? "bg-tint text-muted-foreground" : "bg-primary/10 text-primary"}`}>{field.enabled === false ? t("Hidden") : t("Shown")}</button>\n                        <button type="button" onClick={() => deleteField(feature.id, field.id)} className="rounded-full px-2 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>'''
if needle not in s:
    raise SystemExit('delete button marker not found')
s = s.replace(needle, rep, 1)

# Replace chips option row with touch-draggable row.
old = '''                          {(field.options ?? []).map((option, index) => (\n                            <div key={`${field.id}-${index}`} className="flex gap-1">\n                              <input value={option} onChange={(event) => { const options = [...(field.options ?? [])]; options[index] = event.target.value; patchField(feature.id, field.id, { options }); }} className="h-7 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" />\n                              <button type="button" onClick={() => patchField(feature.id, field.id, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })} className="rounded-full px-2 text-[10px] ring-1 ring-border">×</button>\n                            </div>\n                          ))}'''
new = '''                          {(field.options ?? []).map((option, index) => (\n                            <div\n                              key={`${field.id}-${option}-${index}`}\n                              data-admin-custom-option-value={option}\n                              data-admin-custom-option-feature={feature.id}\n                              data-admin-custom-option-field={field.id}\n                              className={`flex gap-1 ${draggedOption?.featureId === feature.id && draggedOption.fieldId === field.id && draggedOption.value === option ? "opacity-60" : ""}`}\n                            >\n                              <button\n                                type="button"\n                                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedOption({ featureId: feature.id, fieldId: field.id, value: option }); }}\n                                onPointerMove={(event) => moveDraggedOptionByPointer(event, feature.id, field.id)}\n                                onPointerUp={() => setDraggedOption(null)}\n                                onPointerCancel={() => setDraggedOption(null)}\n                                style={{ touchAction: "none" }}\n                                className="inline-flex h-7 shrink-0 items-center rounded-lg bg-tint px-2 text-[10px] text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing"\n                                aria-label={t("Drag to reorder")}\n                              >⋮⋮</button>\n                              <input value={option} onChange={(event) => { const options = [...(field.options ?? [])]; options[index] = event.target.value; patchField(feature.id, field.id, { options }); }} className="h-7 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" />\n                              <button type="button" onClick={() => patchField(feature.id, field.id, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })} className="rounded-full px-2 text-[10px] ring-1 ring-border">×</button>\n                            </div>\n                          ))}'''
if old not in s:
    raise SystemExit('option rows marker not found')
s = s.replace(old, new, 1)

p.write_text(s)
print('patched custom field builder touch drag')
