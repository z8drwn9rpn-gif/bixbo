from pathlib import Path


def r(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# Correlation registry now supports Yes/No and Choices fields.
r(
    'src/lib/appRegistry.ts',
    '  /** Supplementary Yes/No field IDs explicitly exposed to Patterns → Triggers/Correlations. */\n  correlationFieldIds?: string[];',
    '  /** Supplementary Yes/No or Choices field IDs explicitly exposed to Patterns → Triggers/Correlations. */\n  correlationFieldIds?: string[];'
)
r(
    'src/lib/appRegistry.ts',
    '.filter((field) => field.enabled !== false && field.kind === "toggle" && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryFieldLabel',
    '.filter((field) => field.enabled !== false && (field.kind === "toggle" || field.kind === "chips") && selected.has(field.id))\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryFieldLabel'
)

# Show Correlations toggle for Choices as well.
r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '{field.kind === "toggle" ? (\n                          <button type="button" onClick={() => setCorrelationFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id))}',
    '{(field.kind === "toggle" || field.kind === "chips") ? (\n                          <button type="button" onClick={() => setCorrelationFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id))}'
)

# Expand custom correlation options: one item per toggle, one item per choice.
r(
    'src/routes/patterns.tsx',
    '  const customCorrelationOptions: SelectOption[] = BIXBO_REGISTRY.flatMap((featureBase) => {\n    const feature = getRegistryFeature(view, featureBase.id);\n    return registryAdminCorrelationFieldsForFeature(view, featureBase.id).map((field) => ({\n      id: `admin-toggle:${featureBase.id}:${field.id}`,\n      label: `${feature.label} · ${field.label}`,\n    }));\n  });',
    '  const customCorrelationOptions: SelectOption[] = BIXBO_REGISTRY.flatMap((featureBase) => {\n    const feature = getRegistryFeature(view, featureBase.id);\n    return registryAdminCorrelationFieldsForFeature(view, featureBase.id).flatMap((field) => {\n      if (field.kind === "toggle") {\n        return [{ id: `admin-toggle:${featureBase.id}:${field.id}`, label: `${feature.label} · ${field.label}` }];\n      }\n      return (field.options ?? []).filter((option) => option.trim()).map((option) => ({\n        id: `admin-choice:${featureBase.id}:${field.id}:${encodeURIComponent(option)}`,\n        label: `${feature.label} · ${field.label}: ${option}`,\n      }));\n    });\n  });'
)

# Add choice-value evaluator next to toggle evaluator.
r(
    'src/routes/patterns.tsx',
    '  const hasAdminToggle = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId] = id.split(":");\n    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;\n    return (log.adminFields?.[featureId] ?? []).some((entry) => entry.values[fieldId] === true);\n  };\n',
    '  const hasAdminToggle = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId] = id.split(":");\n    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;\n    return (log.adminFields?.[featureId] ?? []).some((entry) => entry.values[fieldId] === true);\n  };\n\n  const hasAdminChoice = (log: DayLog, id: string): boolean => {\n    const [, rawFeatureId, fieldId, encodedOption] = id.split(":");\n    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;\n    const option = decodeURIComponent(encodedOption ?? "");\n    return (log.adminFields?.[featureId] ?? []).some((entry) => {\n      const value = entry.values[fieldId];\n      return Array.isArray(value) && value.includes(option);\n    });\n  };\n'
)
r(
    'src/routes/patterns.tsx',
    '    if (trigger.startsWith("admin-toggle:")) return hasAdminToggle(log, trigger);\n',
    '    if (trigger.startsWith("admin-toggle:")) return hasAdminToggle(log, trigger);\n    if (trigger.startsWith("admin-choice:")) return hasAdminChoice(log, trigger);\n'
)
r(
    'src/routes/patterns.tsx',
    '    if (outcome.startsWith("admin-toggle:")) return hasAdminToggle(log, outcome);\n',
    '    if (outcome.startsWith("admin-toggle:")) return hasAdminToggle(log, outcome);\n    if (outcome.startsWith("admin-choice:")) return hasAdminChoice(log, outcome);\n'
)

# Broaden regression test for both supported categorical kinds.
Path('src/lib/__tests__/admin-correlation-fields.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryAdminCorrelationFieldsForFeature, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nconst data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });\n\ndescribe("admin Correlation fields", () => {\n  it("exposes selected visible Yes/No and Choices fields only", () => {\n    const view = data({ features: { pain: { correlationFieldIds: ["yesno", "choices", "number", "hidden"], customFields: [\n      { id: "yesno", label: "Yes no", kind: "toggle", order: 10, enabled: true },\n      { id: "choices", label: "Choices", kind: "chips", order: 20, enabled: true, options: ["A", "B"] },\n      { id: "number", label: "Number", kind: "number", order: 30, enabled: true },\n      { id: "hidden", label: "Hidden", kind: "chips", order: 40, enabled: false, options: ["X"] },\n    ] } } });\n    expect(registryAdminCorrelationFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["yesno", "choices"]);\n  });\n});\n''')
