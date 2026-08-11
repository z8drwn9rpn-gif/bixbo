from pathlib import Path


def r(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

r(
    'src/lib/appRegistry.ts',
    '  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Treatment. */\n  treatmentFieldIds?: string[];\n}',
    '  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Treatment. */\n  treatmentFieldIds?: string[];\n  /** Supplementary Yes/No field IDs explicitly exposed to Patterns → Triggers/Correlations. */\n  correlationFieldIds?: string[];\n}'
)

r(
    'src/lib/appRegistry.ts',
    'export function registryAdminTreatmentFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.treatmentFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n',
    'export function registryAdminTreatmentFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.treatmentFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryAdminCorrelationFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.correlationFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && field.kind === "toggle" && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '    const treatmentFieldIds = (feature.treatmentFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({',
    '    const treatmentFieldIds = (feature.treatmentFieldIds ?? []).filter((id) => id !== fieldId);\n    const correlationFieldIds = (feature.correlationFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({'
)
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds, treatmentFieldIds },',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds, treatmentFieldIds, correlationFieldIds },'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '  const setTreatmentFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.treatmentFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, treatmentFieldIds: [...selected] } } });\n  };\n',
    '  const setTreatmentFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.treatmentFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, treatmentFieldIds: [...selected] } } });\n  };\n\n  const setCorrelationFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.correlationFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, correlationFieldIds: [...selected] } } });\n  };\n'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                        {(field.kind === "number" || field.kind === "scale") ? (\n                          <>',
    '                        {field.kind === "toggle" ? (\n                          <button type="button" onClick={() => setCorrelationFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                            Correlations {(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                          </button>\n                        ) : null}\n                        {(field.kind === "number" || field.kind === "scale") ? (\n                          <>'
)

r(
    'src/routes/patterns.tsx',
    'import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature } from "@/lib/appRegistry";',
    'import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCorrelationFieldsForFeature, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature } from "@/lib/appRegistry";'
)

r(
    'src/routes/patterns.tsx',
    '  const triggerOptions: SelectOption[] = [',
    '  const customCorrelationOptions: SelectOption[] = BIXBO_REGISTRY.flatMap((featureBase) => {\n    const feature = getRegistryFeature(view, featureBase.id);\n    return registryAdminCorrelationFieldsForFeature(view, featureBase.id).map((field) => ({\n      id: `admin-toggle:${featureBase.id}:${field.id}`,\n      label: `${feature.label} · ${field.label}`,\n    }));\n  });\n  const customCorrelationOptionKey = customCorrelationOptions.map((option) => option.id).join("|");\n\n  const triggerOptions: SelectOption[] = ['
)

r(
    'src/routes/patterns.tsx',
    '    ...view.custom.foodQuickAdd.map((food) => ({\n      id: `food:${food}`,\n      label: `Ate "${food}"`,\n    })),\n  ].filter((option) => {',
    '    ...view.custom.foodQuickAdd.map((food) => ({\n      id: `food:${food}`,\n      label: `Ate "${food}"`,\n    })),\n    ...customCorrelationOptions,\n  ].filter((option) => {'
)

r(
    'src/routes/patterns.tsx',
    '    {\n      id: "pcosSymptoms",\n      label: "PCOS symptoms",\n    },\n  ];',
    '    {\n      id: "pcosSymptoms",\n      label: "PCOS symptoms",\n    },\n    ...customCorrelationOptions,\n  ];'
)

r(
    'src/routes/patterns.tsx',
    '  }, [cycleTrackingHidden, selectedTrigger, view.custom.foodQuickAdd]);',
    '  }, [cycleTrackingHidden, customCorrelationOptionKey, selectedTrigger, view.custom.foodQuickAdd]);'
)
r(
    'src/routes/patterns.tsx',
    '  }, [selectedOutcome]);',
    '  }, [customCorrelationOptionKey, selectedOutcome]);'
)

r(
    'src/routes/patterns.tsx',
    '  const hasTrigger = (day: string, log: DayLog | undefined, trigger: string): boolean => {\n    if (!log) return false;\n',
    '  const hasAdminToggle = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId] = id.split(":");\n    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;\n    return (log.adminFields?.[featureId] ?? []).some((entry) => entry.values[fieldId] === true);\n  };\n\n  const hasTrigger = (day: string, log: DayLog | undefined, trigger: string): boolean => {\n    if (!log) return false;\n\n    if (trigger.startsWith("admin-toggle:")) return hasAdminToggle(log, trigger);\n'
)

r(
    'src/routes/patterns.tsx',
    '  const hasOutcome = (log: DayLog | undefined, outcome: string): boolean => {\n    if (!log) return false;\n',
    '  const hasOutcome = (log: DayLog | undefined, outcome: string): boolean => {\n    if (!log) return false;\n\n    if (outcome.startsWith("admin-toggle:")) return hasAdminToggle(log, outcome);\n'
)

Path('src/lib/__tests__/admin-correlation-fields.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryAdminCorrelationFieldsForFeature, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nconst data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });\n\ndescribe("admin Correlation fields", () => {\n  it("exposes only selected visible Yes/No fields", () => {\n    const view = data({ features: { pain: { correlationFieldIds: ["yesno", "number", "hidden"], customFields: [\n      { id: "yesno", label: "Yes no", kind: "toggle", order: 10, enabled: true },\n      { id: "number", label: "Number", kind: "number", order: 20, enabled: true },\n      { id: "hidden", label: "Hidden", kind: "toggle", order: 30, enabled: false },\n    ] } } });\n    expect(registryAdminCorrelationFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["yesno"]);\n  });\n});\n''')
