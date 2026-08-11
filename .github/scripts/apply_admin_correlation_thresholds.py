from pathlib import Path


def r(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:140]!r}')
    p.write_text(text.replace(old, new, 1))

# Registry threshold metadata and helpers.
r(
    'src/lib/appRegistry.ts',
    'export interface RegistryFeatureOverride {',
    'export type RegistryCorrelationThreshold = { operator: "gte" | "lte"; value: number };\n\nexport interface RegistryFeatureOverride {'
)
r(
    'src/lib/appRegistry.ts',
    '  /** Supplementary Yes/No or Choices field IDs explicitly exposed to Patterns → Triggers/Correlations. */\n  correlationFieldIds?: string[];\n}',
    '  /** Supplementary fields explicitly exposed to Patterns → Triggers/Correlations. */\n  correlationFieldIds?: string[];\n  /** Explicit daily-average thresholds required before Number/Scale fields can act as correlation events. */\n  correlationThresholds?: Record<string, RegistryCorrelationThreshold>;\n}'
)
r(
    'src/lib/appRegistry.ts',
    'export function registryAdminCorrelationFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.correlationFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => field.enabled !== false && (field.kind === "toggle" || field.kind === "chips") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n',
    'export function registryAdminCorrelationThreshold(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n  fieldId: string,\n): RegistryCorrelationThreshold | undefined {\n  const threshold = activeAdminConfig(data)?.features?.[featureId]?.correlationThresholds?.[fieldId];\n  if (!threshold || !Number.isFinite(threshold.value) || (threshold.operator !== "gte" && threshold.operator !== "lte")) return undefined;\n  return threshold;\n}\n\nexport function registryAdminCorrelationFieldsForFeature(\n  data: Pick<BixboData, "settings">,\n  featureId: RegistryFeatureId,\n): RegistryFieldDefinition[] {\n  const feature = activeAdminConfig(data)?.features?.[featureId];\n  const selected = new Set(feature?.correlationFieldIds ?? []);\n  return [...(feature?.customFields ?? [])]\n    .filter((field) => {\n      if (field.enabled === false || !selected.has(field.id)) return false;\n      if (field.kind === "toggle" || field.kind === "chips") return true;\n      if (field.kind === "number" || field.kind === "scale") return Boolean(registryAdminCorrelationThreshold(data, featureId, field.id));\n      return false;\n    })\n    .sort((a, b) => a.order - b.order);\n}\n'
)

# Builder: clean thresholds on delete and add threshold editor.
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '    const correlationFieldIds = (feature.correlationFieldIds ?? []).filter((id) => id !== fieldId);\n    setDeviceAdminConfig({',
    '    const correlationFieldIds = (feature.correlationFieldIds ?? []).filter((id) => id !== fieldId);\n    const correlationThresholds = { ...(feature.correlationThresholds ?? {}) };\n    delete correlationThresholds[fieldId];\n    setDeviceAdminConfig({'
)
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds, treatmentFieldIds, correlationFieldIds },',
    '[featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds, treatmentFieldIds, correlationFieldIds, correlationThresholds },'
)
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '  const setCorrelationFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.correlationFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, correlationFieldIds: [...selected] } } });\n  };\n',
    '  const setCorrelationFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const selected = new Set(feature.correlationFieldIds ?? []);\n    if (enabled) selected.add(fieldId); else selected.delete(fieldId);\n    const thresholds = { ...(feature.correlationThresholds ?? {}) };\n    if (enabled && !thresholds[fieldId]) thresholds[fieldId] = { operator: "gte", value: 0 };\n    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, correlationFieldIds: [...selected], correlationThresholds: thresholds } } });\n  };\n\n  const setCorrelationThreshold = (featureId: RegistryFeatureId, fieldId: string, patch: { operator?: "gte" | "lte"; value?: number }) => {\n    const current = getDeviceAdminConfig();\n    const feature = current.features?.[featureId] ?? {};\n    const previous = feature.correlationThresholds?.[fieldId] ?? { operator: "gte" as const, value: 0 };\n    setDeviceAdminConfig({\n      ...current,\n      enabled: true,\n      features: {\n        ...(current.features ?? {}),\n        [featureId]: { ...feature, correlationThresholds: { ...(feature.correlationThresholds ?? {}), [fieldId]: { ...previous, ...patch } } },\n      },\n    });\n  };\n'
)
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '<div className="mt-2 flex items-center justify-between gap-2">\n                        <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">ID: {field.id}</span>',
    '<div className="mt-2 flex flex-wrap items-center gap-2">\n                        <span className="w-full min-w-0 truncate text-[8px] text-muted-foreground">ID: {field.id}</span>'
)
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                            <button type="button" onClick={() => setTreatmentFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                              Treatment {(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                          </>',
    '                            <button type="button" onClick={() => setTreatmentFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                              Treatment {(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                            <button type="button" onClick={() => setCorrelationFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>\n                              Correlations {(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}\n                            </button>\n                            {(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? (\n                              <>\n                                <select value={config.features?.[feature.id]?.correlationThresholds?.[field.id]?.operator ?? "gte"} onChange={(event) => setCorrelationThreshold(feature.id, field.id, { operator: event.target.value as "gte" | "lte" })} className="h-7 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" aria-label={t("Correlation threshold operator")}>\n                                  <option value="gte">≥</option><option value="lte">≤</option>\n                                </select>\n                                <input type="number" step={field.kind === "scale" ? field.scale?.step ?? 1 : "any"} value={config.features?.[feature.id]?.correlationThresholds?.[field.id]?.value ?? 0} onChange={(event) => setCorrelationThreshold(feature.id, field.id, { value: Number(event.target.value) })} className="h-7 w-16 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" aria-label={t("Correlation threshold value")} />\n                              </>\n                            ) : null}\n                          </>'
)

# Patterns: import threshold helper; create threshold options and evaluate daily average.
r(
    'src/routes/patterns.tsx',
    'import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCorrelationFieldsForFeature, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature } from "@/lib/appRegistry";',
    'import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCorrelationFieldsForFeature, registryAdminCorrelationThreshold, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature, type RegistryFeatureId } from "@/lib/appRegistry";'
)
r(
    'src/routes/patterns.tsx',
    '      return (field.options ?? []).filter((option) => option.trim()).map((option) => ({\n        id: `admin-choice:${featureBase.id}:${field.id}:${encodeURIComponent(option)}`,\n        label: `${feature.label} · ${field.label}: ${option}`,\n      }));',
    '      if (field.kind === "chips") {\n        return (field.options ?? []).filter((option) => option.trim()).map((option) => ({\n          id: `admin-choice:${featureBase.id}:${field.id}:${encodeURIComponent(option)}`,\n          label: `${feature.label} · ${field.label}: ${option}`,\n        }));\n      }\n      const threshold = registryAdminCorrelationThreshold(view, featureBase.id, field.id);\n      if (!threshold) return [];\n      return [{\n        id: `admin-threshold:${featureBase.id}:${field.id}`,\n        label: `${feature.label} · ${field.label}: daily avg ${threshold.operator === "gte" ? "≥" : "≤"} ${threshold.value}`,\n      }];'
)
r(
    'src/routes/patterns.tsx',
    '  const hasAdminChoice = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId, encodedOption] = id.split(":");\n    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;\n    const option = decodeURIComponent(encodedOption ?? "");\n    return (log.adminFields?.[featureId] ?? []).some((entry) => {\n      const value = entry.values[fieldId];\n      return Array.isArray(value) && value.includes(option);\n    });\n  };\n',
    '  const hasAdminChoice = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId, encodedOption] = id.split(":");\n    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;\n    const option = decodeURIComponent(encodedOption ?? "");\n    return (log.adminFields?.[featureId] ?? []).some((entry) => {\n      const value = entry.values[fieldId];\n      return Array.isArray(value) && value.includes(option);\n    });\n  };\n\n  const hasAdminThreshold = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId] = id.split(":");\n    const featureId = rawFeatureId as RegistryFeatureId;\n    const threshold = registryAdminCorrelationThreshold(view, featureId, fieldId);\n    if (!threshold) return false;\n    const values = (log.adminFields?.[featureId] ?? [])\n      .map((entry) => Number(entry.values[fieldId]))\n      .filter((value) => Number.isFinite(value));\n    const dailyAverage = avg(values);\n    if (dailyAverage == null) return false;\n    return threshold.operator === "gte" ? dailyAverage >= threshold.value : dailyAverage <= threshold.value;\n  };\n'
)
r(
    'src/routes/patterns.tsx',
    '    if (trigger.startsWith("admin-choice:")) return hasAdminChoice(log, trigger);\n',
    '    if (trigger.startsWith("admin-choice:")) return hasAdminChoice(log, trigger);\n    if (trigger.startsWith("admin-threshold:")) return hasAdminThreshold(log, trigger);\n'
)
r(
    'src/routes/patterns.tsx',
    '    if (outcome.startsWith("admin-choice:")) return hasAdminChoice(log, outcome);\n',
    '    if (outcome.startsWith("admin-choice:")) return hasAdminChoice(log, outcome);\n    if (outcome.startsWith("admin-threshold:")) return hasAdminThreshold(log, outcome);\n'
)

Path('src/lib/__tests__/admin-correlation-thresholds.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryAdminCorrelationFieldsForFeature, registryAdminCorrelationThreshold, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nconst data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });\n\ndescribe("admin correlation thresholds", () => {\n  it("requires a valid threshold for selected Number/Scale fields", () => {\n    const view = data({ features: { pain: {\n      correlationFieldIds: ["number", "scale", "no_threshold"],\n      correlationThresholds: { number: { operator: "gte", value: 7 }, scale: { operator: "lte", value: 2 } },\n      customFields: [\n        { id: "number", label: "Stress", kind: "number", order: 10, enabled: true },\n        { id: "scale", label: "Pressure", kind: "scale", order: 20, enabled: true, scale: { min: 1, max: 5, step: 1 } },\n        { id: "no_threshold", label: "No threshold", kind: "number", order: 30, enabled: true },\n      ],\n    } } });\n    expect(registryAdminCorrelationFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["number", "scale"]);\n    expect(registryAdminCorrelationThreshold(view, "pain", "number")).toEqual({ operator: "gte", value: 7 });\n    expect(registryAdminCorrelationThreshold(view, "pain", "scale")).toEqual({ operator: "lte", value: 2 });\n  });\n});\n''')
