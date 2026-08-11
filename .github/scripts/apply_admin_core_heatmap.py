from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# Registry: allow specific supplementary fields to be exposed to Heatmap.
replace_once(
    'src/lib/appRegistry.ts',
    '  /** Admin-created supplementary fields. Core calculations never depend on these. */\n  customFields?: RegistryFieldDefinition[];\n}',
    '  /** Admin-created supplementary fields. Core calculations never depend on these. */\n  customFields?: RegistryFieldDefinition[];\n  /** Supplementary numeric/scale field IDs explicitly exposed to Heatmap. */\n  heatmapFieldIds?: string[];\n}'
)

replace_once(
    'src/lib/appRegistry.ts',
    'export function registryCustomFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  return [...(activeAdminConfig(data)?.features?.[featureId]?.customFields ?? [])]\n    .filter((field) => field.enabled !== false)\n    .sort((a, b) => a.order - b.order);\n}\n',
    'export function registryCustomFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  return [...(activeAdminConfig(data)?.features?.[featureId]?.customFields ?? [])]\n    .filter((field) => field.enabled !== false)\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryAdminHeatmapFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.heatmapFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n'
)

# Builder: opt-in Heatmap toggle on numeric/scale supplementary fields.
replace_once(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '  const deleteField = (featureId: RegistryFeatureId, fieldId: string) => {\n    const current = getDeviceAdminConfig();\n    const fields = current.features?.[featureId]?.customFields ?? [];\n    writeFields(featureId, fields.filter((field) => field.id !== fieldId));\n  };\n',
    '  const deleteField = (featureId: RegistryFeatureId, fieldId: string) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const fields = feature.customFields ?? [];\n    const heatmapFieldIds = (feature.heatmapFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({\n      ...current,\n      enabled: true,\n      features: {\n        ...(current.features ?? {}),\n        [featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds },\n      },\n    });\n  };\n\n  const setHeatmapFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.heatmapFieldIds ?? []);\n    if (enabled) selected.add(fieldId);\n    else selected.delete(fieldId);\n    setDeviceAdminConfig({\n      ...current,\n      enabled: true,\n      features: {\n        ...(current.features ?? {}),\n        [featureId]: { ...feature, heatmapFieldIds: [...selected] },\n      },\n    });\n  };\n'
)

replace_once(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                      <div className="mt-2 flex items-center justify-between">\n                        <span className="text-[8px] text-muted-foreground">ID: {field.id}</span>\n                        <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className="rounded-full bg-tint px-2 py-1 text-[8px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>\n                      </div>',
    '                      <div className="mt-2 flex items-center justify-between gap-2">\n                        <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">ID: {field.id}</span>\n                        {(field.kind === "number" || field.kind === "scale") ? (\n                          <button\n                            type="button"\n                            onClick={() => setHeatmapFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id))}\n                            className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${\n                              (config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id)\n                                ? "bg-primary text-primary-foreground ring-primary/30"\n                                : "bg-tint text-muted-foreground ring-border"\n                            }`}\n                          >\n                            Heatmap {(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                          </button>\n                        ) : null}\n                        <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className="rounded-full bg-tint px-2 py-1 text-[8px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>\n                      </div>'
)

# Insights: expose selected core supplementary numeric fields as Heatmap metrics.
replace_once(
    'src/routes/insights.tsx',
    'import { customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";',
    'import { BIXBO_REGISTRY, customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, registryAdminHeatmapFieldsForFeature, type RegistryFeatureId } from "@/lib/appRegistry";'
)

replace_once(
    'src/routes/insights.tsx',
    'type HeatmapMetric = "pain" | "period" | "bowel" | "panic" | "tetany" | "hotFlashes" | "sleep" | "sex" | `custom:${string}:${string}`;',
    'type HeatmapMetric = "pain" | "period" | "bowel" | "panic" | "tetany" | "hotFlashes" | "sleep" | "sex" | `custom:${string}:${string}` | `admin:${RegistryFeatureId}:${string}`;'
)

replace_once(
    'src/routes/insights.tsx',
    '    const customs = customLogDefinitions(data).flatMap((log) => {\n      if (!log.heatmapFieldId) return [];\n      const field = log.fields.find((item) => item.id === log.heatmapFieldId && item.enabled !== false && (item.kind === "number" || item.kind === "scale"));\n      if (!field) return [];\n      return [{ id: `custom:${log.id}:${field.id}` as HeatmapMetric, label: `${log.label} · ${field.label}` }];\n    });\n    return [...builtins, ...customs];',
    '    const customs = customLogDefinitions(data).flatMap((log) => {\n      if (!log.heatmapFieldId) return [];\n      const field = log.fields.find((item) => item.id === log.heatmapFieldId && item.enabled !== false && (item.kind === "number" || item.kind === "scale"));\n      if (!field) return [];\n      return [{ id: `custom:${log.id}:${field.id}` as HeatmapMetric, label: `${log.label} · ${field.label}` }];\n    });\n    const adminFields = BIXBO_REGISTRY.flatMap((featureBase) => {\n      const feature = getRegistryFeature(data, featureBase.id);\n      return registryAdminHeatmapFieldsForFeature(data, featureBase.id).map((field) => ({\n        id: `admin:${featureBase.id}:${field.id}` as HeatmapMetric,\n        label: `${feature.label} · ${field.label}`,\n      }));\n    });\n    return [...builtins, ...adminFields, ...customs];'
)

replace_once(
    'src/routes/insights.tsx',
    '      if (selectedMetric.startsWith("custom:")) {\n        const [, logId, fieldId] = selectedMetric.split(":");',
    '      if (selectedMetric.startsWith("admin:")) {\n        const [, rawFeatureId, fieldId] = selectedMetric.split(":");\n        const featureId = rawFeatureId as RegistryFeatureId;\n        const feature = getRegistryFeature(data, featureId);\n        const field = registryAdminHeatmapFieldsForFeature(data, featureId).find((item) => item.id === fieldId);\n        const entries = log.adminFields?.[featureId] ?? [];\n        const values = entries.map((entry) => Number(entry.values[fieldId])).filter((value) => Number.isFinite(value));\n        if (!field || !values.length) return null;\n        const value = values.reduce((sum, item) => sum + item, 0) / values.length;\n        const min = field.scale?.min ?? 0;\n        const max = field.scale?.max ?? Math.max(10, ...values);\n        const span = Math.max(0.0001, max - min);\n        const normalized = Math.max(0, Math.min(10, ((value - min) / span) * 10));\n        const shownValue = Number.isInteger(value) ? String(value) : value.toFixed(1);\n        return {\n          color: vividPainChartColor(normalized),\n          tooltipColor: vividPainChartColor(normalized),\n          value: shownValue,\n          popupValue: `${field.label} · ${shownValue}`,\n          description: feature.label,\n          entryCount: values.length,\n        };\n      }\n\n      if (selectedMetric.startsWith("custom:")) {\n        const [, logId, fieldId] = selectedMetric.split(":");'
)

# Regression tests for explicit opt-in and type filtering.
Path('src/lib/__tests__/admin-core-heatmap.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryAdminHeatmapFieldsForFeature, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nfunction withConfig(config: AdminConfig) {\n  return { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } };\n}\n\ndescribe("admin core Heatmap fields", () => {\n  it("exposes only explicitly selected numeric/scale supplementary fields", () => {\n    const data = withConfig({\n      features: {\n        pain: {\n          heatmapFieldIds: ["pressure", "note", "hidden"],\n          customFields: [\n            { id: "pressure", label: "Pressure", kind: "scale", order: 10, enabled: true, scale: { min: 1, max: 5, step: 1 } },\n            { id: "note", label: "Note", kind: "text", order: 20, enabled: true },\n            { id: "hidden", label: "Hidden number", kind: "number", order: 30, enabled: false },\n            { id: "not_selected", label: "Other number", kind: "number", order: 40, enabled: true },\n          ],\n        },\n      },\n    });\n    expect(registryAdminHeatmapFieldsForFeature(data, "pain").map((field) => field.id)).toEqual(["pressure"]);\n  });\n});\n''')
