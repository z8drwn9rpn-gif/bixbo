from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

replace_once(
    'src/lib/appRegistry.ts',
    '  /** Supplementary numeric/scale field IDs explicitly exposed to Heatmap. */\n  heatmapFieldIds?: string[];\n}',
    '  /** Supplementary numeric/scale field IDs explicitly exposed to Heatmap. */\n  heatmapFieldIds?: string[];\n  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Monthly. */\n  monthlyFieldIds?: string[];\n}'
)

replace_once(
    'src/lib/appRegistry.ts',
    'export function registryAdminHeatmapFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.heatmapFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n',
    'export function registryAdminHeatmapFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.heatmapFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryAdminMonthlyFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.monthlyFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n'
)

replace_once(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '    const heatmapFieldIds = (feature.heatmapFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({',
    '    const heatmapFieldIds = (feature.heatmapFieldIds ?? []).filter((id) => id !== fieldId);\n    const monthlyFieldIds = (feature.monthlyFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({'
)
replace_once(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds },',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds },'
)

replace_once(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '  const setHeatmapFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.heatmapFieldIds ?? []);\n    if (enabled) selected.add(fieldId);\n    else selected.delete(fieldId);\n    setDeviceAdminConfig({\n      ...current,\n      enabled: true,\n      features: {\n        ...(current.features ?? {}),\n        [featureId]: { ...feature, heatmapFieldIds: [...selected] },\n      },\n    });\n  };\n',
    '  const setHeatmapFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.heatmapFieldIds ?? []);\n    if (enabled) selected.add(fieldId);\n    else selected.delete(fieldId);\n    setDeviceAdminConfig({\n      ...current,\n      enabled: true,\n      features: {\n        ...(current.features ?? {}),\n        [featureId]: { ...feature, heatmapFieldIds: [...selected] },\n      },\n    });\n  };\n\n  const setMonthlyFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.monthlyFieldIds ?? []);\n    if (enabled) selected.add(fieldId);\n    else selected.delete(fieldId);\n    setDeviceAdminConfig({\n      ...current,\n      enabled: true,\n      features: {\n        ...(current.features ?? {}),\n        [featureId]: { ...feature, monthlyFieldIds: [...selected] },\n      },\n    });\n  };\n'
)

replace_once(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                        {(field.kind === "number" || field.kind === "scale") ? (\n                          <button\n                            type="button"\n                            onClick={() => setHeatmapFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id))}\n                            className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${\n                              (config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id)\n                                ? "bg-primary text-primary-foreground ring-primary/30"\n                                : "bg-tint text-muted-foreground ring-border"\n                            }`}\n                          >\n                            Heatmap {(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                          </button>\n                        ) : null}',
    '                        {(field.kind === "number" || field.kind === "scale") ? (\n                          <>\n                            <button\n                              type="button"\n                              onClick={() => setHeatmapFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id))}\n                              className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${\n                                (config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id)\n                                  ? "bg-primary text-primary-foreground ring-primary/30"\n                                  : "bg-tint text-muted-foreground ring-border"\n                              }`}\n                            >\n                              Heatmap {(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                            <button\n                              type="button"\n                              onClick={() => setMonthlyFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.monthlyFieldIds ?? []).includes(field.id))}\n                              className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${\n                                (config.features?.[feature.id]?.monthlyFieldIds ?? []).includes(field.id)\n                                  ? "bg-primary text-primary-foreground ring-primary/30"\n                                  : "bg-tint text-muted-foreground ring-border"\n                              }`}\n                            >\n                              Monthly {(config.features?.[feature.id]?.monthlyFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                          </>\n                        ) : null}'
)

# Layout registry: make the generated section reorderable/renameable like other Monthly blocks.
replace_once(
    'src/lib/layoutRegistry.ts',
    '    { id: "hormones", label: "Hormones", order: 50 },\n  ],',
    '    { id: "hormones", label: "Hormones", order: 50 },\n    { id: "customMetrics", label: "Custom metrics", order: 60 },\n  ],'
)

# Patterns imports and generic monthly calculations.
replace_once(
    'src/routes/patterns.tsx',
    'import { useI18n } from "@/hooks/useI18n";\nimport { layoutOrder } from "@/lib/layoutRegistry";',
    'import { useI18n } from "@/hooks/useI18n";\nimport { BIXBO_REGISTRY, getRegistryFeature, registryAdminMonthlyFieldsForFeature } from "@/lib/appRegistry";\nimport { layoutOrder } from "@/lib/layoutRegistry";'
)

replace_once(
    'src/routes/patterns.tsx',
    '  const weightAverage = (days: string[]) =>\n    avg(days.map((day) => latestWeightForDay(dayLogs[day])).filter((value): value is number => value != null));\n',
    '  const weightAverage = (days: string[]) =>\n    avg(days.map((day) => latestWeightForDay(dayLogs[day])).filter((value): value is number => value != null));\n\n  const adminMonthlyMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {\n    const feature = getRegistryFeature(view, featureBase.id);\n    return registryAdminMonthlyFieldsForFeature(view, featureBase.id).map((field) => {\n      const averageForDays = (days: string[]) => {\n        const values = days.flatMap((day) =>\n          (dayLogs[day]?.adminFields?.[featureBase.id] ?? [])\n            .map((entry) => Number(entry.values[field.id]))\n            .filter((value) => Number.isFinite(value)),\n        );\n        return avg(values);\n      };\n      return {\n        id: `${featureBase.id}:${field.id}`,\n        title: `${feature.label} · ${field.label}`,\n        previous: averageForDays(previousMonthDays),\n        current: averageForDays(currentMonthDays),\n        max: field.kind === "scale" ? field.scale?.max : undefined,\n        unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "",\n      };\n    });\n  });\n'
)

replace_once(
    'src/routes/patterns.tsx',
    '            <SummaryPanel\n              title="Monthly Summary"',
    '            {adminMonthlyMetrics.length > 0 ? (\n              <CollapsibleSection\n                layoutOrderValue={layoutOrder(view, "patterns.monthly", "customMetrics", 60)}\n                title="Custom metrics"\n                subtitle="Admin-created numeric and scale fields"\n                defaultOpen={false}\n              >\n                <Card\n                  title="Monthly comparison — custom metrics"\n                  description={`${monthlyComparisonLabel} · same number of elapsed days in each month.`}\n                >\n                  <div className="mt-3 space-y-2.5">\n                    {adminMonthlyMetrics.map((metric) => (\n                      <ComparisonMetric\n                        key={metric.id}\n                        title={metric.title}\n                        subtitle="Average of saved supplementary values"\n                        previous={metric.previous}\n                        current={metric.current}\n                        max={metric.max}\n                        decimals={1}\n                        unit={metric.unit}\n                        color="green"\n                        neutralTrend\n                        icon={<Activity className="h-5 w-5" />}\n                      />\n                    ))}\n                  </div>\n                </Card>\n              </CollapsibleSection>\n            ) : null}\n\n            <SummaryPanel\n              title="Monthly Summary"'
)

Path('src/lib/__tests__/admin-monthly-fields.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryAdminMonthlyFieldsForFeature, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nfunction withConfig(config: AdminConfig) {\n  return { ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } };\n}\n\ndescribe("admin Monthly fields", () => {\n  it("exposes only explicitly selected visible numeric or scale fields", () => {\n    const data = withConfig({\n      features: {\n        pain: {\n          monthlyFieldIds: ["scale", "text", "hidden"],\n          customFields: [\n            { id: "scale", label: "Pressure", kind: "scale", order: 10, enabled: true, scale: { min: 1, max: 5, step: 1 } },\n            { id: "text", label: "Text", kind: "text", order: 20, enabled: true },\n            { id: "hidden", label: "Hidden", kind: "number", order: 30, enabled: false },\n            { id: "other", label: "Other", kind: "number", order: 40, enabled: true },\n          ],\n        },\n      },\n    });\n    expect(registryAdminMonthlyFieldsForFeature(data, "pain").map((field) => field.id)).toEqual(["scale"]);\n  });\n});\n''')
