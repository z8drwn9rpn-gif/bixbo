from pathlib import Path


def r(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

r(
    'src/lib/appRegistry.ts',
    '  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Cycle. */\n  cycleFieldIds?: string[];\n}',
    '  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Cycle. */\n  cycleFieldIds?: string[];\n  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Treatment. */\n  treatmentFieldIds?: string[];\n}'
)

r(
    'src/lib/appRegistry.ts',
    'export function registryAdminCycleFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.cycleFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n',
    'export function registryAdminCycleFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.cycleFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryAdminTreatmentFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.treatmentFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '    const cycleFieldIds = (feature.cycleFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({',
    '    const cycleFieldIds = (feature.cycleFieldIds ?? []).filter((id) => id !== fieldId);\n    const treatmentFieldIds = (feature.treatmentFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({'
)
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds },',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds, treatmentFieldIds },'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '  const setCycleFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.cycleFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, cycleFieldIds: [...selected] } } });\n  };\n',
    '  const setCycleFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.cycleFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, cycleFieldIds: [...selected] } } });\n  };\n\n  const setTreatmentFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.treatmentFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, treatmentFieldIds: [...selected] } } });\n  };\n'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                            <button type="button" onClick={() => setCycleFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                              Cycle {(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                          </>',
    '                            <button type="button" onClick={() => setCycleFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                              Cycle {(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                            <button type="button" onClick={() => setTreatmentFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                              Treatment {(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                          </>'
)

r(
    'src/lib/layoutRegistry.ts',
    '  "patterns.treatment": [\n    { id: "comparison", label: "Treatment comparison", order: 10 },\n    { id: "history", label: "Treatment history", order: 20 },\n  ],',
    '  "patterns.treatment": [\n    { id: "comparison", label: "Treatment comparison", order: 10 },\n    { id: "customMetrics", label: "Custom metrics", order: 20 },\n    { id: "history", label: "Treatment history", order: 30 },\n  ],'
)

r(
    'src/routes/patterns.tsx',
    'import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature } from "@/lib/appRegistry";',
    'import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature } from "@/lib/appRegistry";'
)

r(
    'src/routes/patterns.tsx',
    '  const treatmentHeadacheIntensity = treatmentMetric(dayHeadacheIntensity);\n\n  const treatmentHotFlash = treatmentMetric(dayHotFlash);',
    '  const treatmentHeadacheIntensity = treatmentMetric(dayHeadacheIntensity);\n\n  const adminTreatmentMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {\n    const feature = getRegistryFeature(view, featureBase.id);\n    return registryAdminTreatmentFieldsForFeature(view, featureBase.id).map((field) => {\n      const metric = treatmentMetric((log) => {\n        const values = (log.adminFields?.[featureBase.id] ?? [])\n          .map((entry) => Number(entry.values[field.id]))\n          .filter((value) => Number.isFinite(value));\n        return avg(values);\n      });\n      return {\n        id: `${featureBase.id}:${field.id}`,\n        title: `${feature.label} · ${field.label}`,\n        metric,\n        max: field.kind === "scale" ? field.scale?.max : undefined,\n        unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "",\n      };\n    });\n  });\n\n  const treatmentHotFlash = treatmentMetric(dayHotFlash);'
)

r(
    'src/routes/patterns.tsx',
    '                <CollapsibleSection\n                  title="Detailed treatment summary"',
    '                {adminTreatmentMetrics.length > 0 ? (\n                  <CollapsibleSection\n                    layoutOrderValue={layoutOrder(view, "patterns.treatment", "customMetrics", 20)}\n                    title="Custom metrics"\n                    subtitle="Admin-created values before versus after treatment"\n                    defaultOpen={false}\n                  >\n                    <div className="space-y-3">\n                      {adminTreatmentMetrics.map((item) => (\n                        <ComparisonMetric\n                          key={item.id}\n                          title={item.title}\n                          subtitle="Average supplementary value · 4 weeks before vs 4 weeks after"\n                          previous={item.metric.before}\n                          current={item.metric.after}\n                          max={item.max}\n                          decimals={1}\n                          unit={item.unit}\n                          color="green"\n                          neutralTrend\n                          previousLabel="Before"\n                          currentLabel="After"\n                          icon={<Activity className="h-5 w-5" />}\n                        />\n                      ))}\n                    </div>\n                  </CollapsibleSection>\n                ) : null}\n\n                <CollapsibleSection\n                  title="Detailed treatment summary"'
)

Path('src/lib/__tests__/admin-treatment-fields.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryAdminTreatmentFieldsForFeature, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nconst data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });\n\ndescribe("admin Treatment fields", () => {\n  it("exposes only explicitly selected visible Number/Scale fields", () => {\n    const view = data({ features: { pain: { treatmentFieldIds: ["number", "text", "hidden"], customFields: [\n      { id: "number", label: "Number", kind: "number", order: 10, enabled: true },\n      { id: "text", label: "Text", kind: "text", order: 20, enabled: true },\n      { id: "hidden", label: "Hidden", kind: "scale", order: 30, enabled: false, scale: { min: 1, max: 5, step: 1 } },\n    ] } } });\n    expect(registryAdminTreatmentFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["number"]);\n  });\n});\n''')
