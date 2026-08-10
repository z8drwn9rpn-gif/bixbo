from pathlib import Path

# 1) Extend registry with field schemas.
p = Path('src/lib/appRegistry.ts')
s = p.read_text()
s = s.replace('export interface RegistryFeatureDefinition {\n', '''export type RegistryFieldKind = "chips" | "scale" | "text" | "number" | "toggle";\n\nexport interface RegistryFieldDefinition {\n  id: string;\n  label: string;\n  kind: RegistryFieldKind;\n  order: number;\n  enabled?: boolean;\n  options?: string[];\n  scale?: RegistryScaleDefinition;\n}\n\nexport interface RegistryFieldOverride {\n  label?: string;\n  enabled?: boolean;\n  order?: number;\n  options?: Record<string, { label?: string; enabled?: boolean; order?: number }>;\n  scale?: Partial<RegistryScaleDefinition>;\n}\n\nexport interface RegistryFeatureDefinition {\n''')
s = s.replace('  scale?: RegistryScaleDefinition;\n}\n\nexport interface RegistryFeatureOverride {', '  scale?: RegistryScaleDefinition;\n  fields?: RegistryFieldDefinition[];\n}\n\nexport interface RegistryFeatureOverride {')
s = s.replace('  scale?: Partial<RegistryScaleDefinition>;\n}', '  scale?: Partial<RegistryScaleDefinition>;\n  fields?: Record<string, RegistryFieldOverride>;\n}')

insert = '''\n\nexport const BIXBO_LOG_FIELDS: Partial<Record<RegistryFeatureId, RegistryFieldDefinition[]>> = {\n  pain: [\n    { id: "score", label: "Pain scale", kind: "scale", order: 10, scale: { min: 0, max: 10, step: 1 } },\n    { id: "parts", label: "Where does it hurt?", kind: "chips", order: 20, options: ["Head", "Neck", "Shoulder", "Chest", "Upper back", "Lower back", "Abdomen", "Pelvis", "Hip", "Arm", "Hand", "Leg", "Knee", "Foot"] },\n    { id: "quality", label: "How does it hurt?", kind: "chips", order: 30, options: ["Sharp", "Dull", "Throbbing", "Burning", "Cramping", "Pressure", "Stabbing", "Aching"] },\n    { id: "symptoms", label: "Other symptoms", kind: "chips", order: 40 },\n  ],\n  tetany: [\n    { id: "intensity", label: "Intensity", kind: "scale", order: 10, scale: { min: 1, max: 5, step: 1 } },\n    { id: "types", label: "Type", kind: "chips", order: 20 },\n    { id: "location", label: "Location", kind: "chips", order: 30 },\n    { id: "triggers", label: "Triggers", kind: "chips", order: 40 },\n    { id: "helped", label: "What helped?", kind: "chips", order: 50 },\n  ],\n  panic: [\n    { id: "intensity", label: "Intensity", kind: "scale", order: 10, scale: { min: 1, max: 10, step: 1 } },\n    { id: "physical", label: "Physical symptoms", kind: "chips", order: 20 },\n    { id: "cognitive", label: "Cognitive symptoms", kind: "chips", order: 30 },\n    { id: "helped", label: "What helped?", kind: "chips", order: 40 },\n  ],\n  period: [\n    { id: "flow", label: "Bleeding", kind: "chips", order: 10, options: ["Spotting", "Light", "Medium", "Heavy", "Very heavy"] },\n    { id: "cramps", label: "Cramp pain", kind: "scale", order: 20, scale: { min: 1, max: 10, step: 1 } },\n    { id: "discharge", label: "Discharge (optional)", kind: "chips", order: 30 },\n  ],\n  workout: [\n    { id: "kind", label: "Type", kind: "chips", order: 10 },\n    { id: "minutes", label: "Duration (minutes)", kind: "number", order: 20 },\n    { id: "rpe", label: "Intensity (RPE)", kind: "scale", order: 30, scale: { min: 1, max: 10, step: 1 } },\n    { id: "feel", label: "How you feel", kind: "chips", order: 40, options: ["Great", "Good", "Ok", "Tired", "Sore"] },\n  ],\n  bowel: [\n    { id: "bristol", label: "Bristol type", kind: "scale", order: 10, scale: { min: 0, max: 7, step: 1 } },\n    { id: "urinary", label: "Urinary", kind: "chips", order: 20 },\n  ],\n};\n\nexport function getRegistryField(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string): RegistryFieldDefinition | undefined {\n  const base = BIXBO_LOG_FIELDS[featureId]?.find((field) => field.id === fieldId);\n  if (!base) return undefined;\n  const override = data.settings.adminConfig?.features?.[featureId]?.fields?.[fieldId];\n  return {\n    ...base,\n    ...override,\n    id: base.id,\n    options: base.options,\n    scale: base.scale ? { ...base.scale, ...(override?.scale ?? {}) } : undefined,\n  };\n}\n\nexport function registryFieldsForFeature(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId): RegistryFieldDefinition[] {\n  return (BIXBO_LOG_FIELDS[featureId] ?? [])\n    .map((field) => getRegistryField(data, featureId, field.id)!)\n    .filter((field) => field.enabled !== false)\n    .sort((a, b) => a.order - b.order);\n}\n\nexport function registryFieldLabel(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, fallback: string): string {\n  return getRegistryField(data, featureId, fieldId)?.label ?? fallback;\n}\n\nexport function registryFieldScale(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, fallback: RegistryScaleDefinition): RegistryScaleDefinition {\n  const configured = getRegistryField(data, featureId, fieldId)?.scale;\n  if (!configured) return fallback;\n  const min = Number.isFinite(configured.min) ? configured.min : fallback.min;\n  const max = Number.isFinite(configured.max) ? configured.max : fallback.max;\n  const step = Number.isFinite(configured.step) && configured.step > 0 ? configured.step : fallback.step;\n  return { min: Math.min(min, max), max: Math.max(min, max), step };\n}\n\nexport function registryFieldOptions(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, base: string[]): string[] {\n  const overrides = data.settings.adminConfig?.features?.[featureId]?.fields?.[fieldId]?.options ?? {};\n  return base\n    .filter((value) => overrides[value]?.enabled !== false)\n    .sort((a, b) => (overrides[a]?.order ?? base.indexOf(a)) - (overrides[b]?.order ?? base.indexOf(b)));\n}\n\nexport function registryOptionLabel(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, value: string): string {\n  return data.settings.adminConfig?.features?.[featureId]?.fields?.[fieldId]?.options?.[value]?.label ?? value;\n}\n'''
marker = '\nconst byId = new Map(BIXBO_REGISTRY.map((feature) => [feature.id, feature]));'
if 'export const BIXBO_LOG_FIELDS' not in s:
    s = s.replace(marker, insert + marker)
p.write_text(s)

# 2) Admin UI: add Fields tab/editor below each feature.
p = Path('src/routes/admin.tsx')
s = p.read_text()
s = s.replace('  type RegistryFeatureOverride,\n} from "@/lib/appRegistry";', '  type RegistryFeatureOverride,\n  BIXBO_LOG_FIELDS,\n  getRegistryField,\n  type RegistryFieldOverride,\n} from "@/lib/appRegistry";')
s = s.replace('type AdminTab = "logs" | "quick" | "calendar" | "insights";', 'type AdminTab = "logs" | "fields" | "quick" | "calendar" | "insights";')
s = s.replace('const TAB_SURFACE: Record<AdminTab, RegistrySurface> = {\n  logs: "log",', 'const TAB_SURFACE: Record<AdminTab, RegistrySurface> = {\n  logs: "log",\n  fields: "log",')
s = s.replace('  logs: "Logs",\n  quick:', '  logs: "Logs",\n  fields: "Log fields & scales",\n  quick:')

needle = '  const resetFeature = (id: RegistryFeatureId) => {'
helper = '''  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: RegistryFieldOverride) => {\n    update((current) => {\n      const feature = current.settings.adminConfig?.features?.[featureId] ?? {};\n      const existing = feature.fields?.[fieldId] ?? {};\n      return {\n        ...current,\n        settings: {\n          ...current.settings,\n          adminConfig: {\n            ...(current.settings.adminConfig ?? {}),\n            enabled: true,\n            features: {\n              ...(current.settings.adminConfig?.features ?? {}),\n              [featureId]: {\n                ...feature,\n                fields: { ...(feature.fields ?? {}), [fieldId]: { ...existing, ...patch, scale: patch.scale ? { ...(existing.scale ?? {}), ...patch.scale } : existing.scale } },\n              },\n            },\n          },\n        },\n      };\n    });\n  };\n\n'''
if 'const patchField =' not in s:
    s = s.replace(needle, helper + needle)

start = '          {features.map((feature, index) => {'
replacement = '''          {features.map((feature, index) => {\n            if (tab === "fields") {\n              const fields = BIXBO_LOG_FIELDS[feature.id] ?? [];\n              if (!fields.length) return null;\n              return (\n                <section key={feature.id} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">\n                  <div className="mb-3 flex items-center gap-2"><span className="text-xl">{feature.icon}</span><div><p className="text-sm font-bold">{t(feature.label)}</p><p className="text-[10px] text-muted-foreground">ID: {feature.id}</p></div></div>\n                  <div className="space-y-3">\n                    {fields.map((baseField) => {\n                      const field = getRegistryField(view, feature.id, baseField.id)!;\n                      return (\n                        <div key={field.id} className="rounded-2xl bg-tint p-3 ring-1 ring-border/70">\n                          <div className="flex items-center gap-2">\n                            <input value={field.label} onChange={(e) => patchField(feature.id, field.id, { label: e.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-background px-3 text-xs font-semibold ring-1 ring-border" />\n                            <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${field.enabled === false ? "bg-tint text-muted-foreground" : "bg-primary text-primary-foreground"}`}>{field.enabled === false ? t("Hidden") : t("Enabled")}</button>\n                          </div>\n                          <p className="mt-1 text-[10px] text-muted-foreground">Field ID: {field.id} · {field.kind}</p>\n                          {field.scale ? (\n                            <div className="mt-3 grid grid-cols-3 gap-2">\n                              {(["min", "max", "step"] as const).map((key) => (\n                                <label key={key} className="text-[10px] text-muted-foreground">{t(key === "min" ? "Minimum" : key === "max" ? "Maximum" : "Step")}<input type="number" step="0.5" value={field.scale?.[key] ?? ""} onChange={(e) => patchField(feature.id, field.id, { scale: { [key]: Number(e.target.value) } })} className="mt-1 h-9 w-full rounded-xl bg-background px-2 text-xs ring-1 ring-border" /></label>\n                              ))}\n                            </div>\n                          ) : null}\n                          {baseField.options?.length ? (\n                            <div className="mt-3 space-y-1.5">\n                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Options")}</p>\n                              {baseField.options.map((value, optionIndex) => {\n                                const option = view.settings.adminConfig?.features?.[feature.id]?.fields?.[field.id]?.options?.[value] ?? {};\n                                return <div key={value} className="flex items-center gap-2"><input defaultValue={option.label ?? value} onBlur={(e) => patchField(feature.id, field.id, { options: { ...(view.settings.adminConfig?.features?.[feature.id]?.fields?.[field.id]?.options ?? {}), [value]: { ...option, label: e.target.value, order: option.order ?? optionIndex } } })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] ring-1 ring-border"/><button type="button" onClick={() => patchField(feature.id, field.id, { options: { ...(view.settings.adminConfig?.features?.[feature.id]?.fields?.[field.id]?.options ?? {}), [value]: { ...option, enabled: option.enabled === false, order: option.order ?? optionIndex } } })} className="rounded-full bg-background px-2 py-1 text-[10px] ring-1 ring-border">{option.enabled === false ? t("Hidden") : t("Shown")}</button></div>;\n                              })}\n                            </div>\n                          ) : null}\n                        </div>\n                      );\n                    })}\n                  </div>\n                </section>\n              );\n            }'''
s = s.replace(start, replacement)
p.write_text(s)

# 3) LogSheet context + field/scale integration, designed to be minimally invasive.
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
s = s.replace('import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";', 'import { createContext, useContext, useState, useMemo, useRef, useEffect, type ReactNode } from "react";')
s = s.replace('import { getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";', 'import { getRegistryFeature, isRegistrySurfaceEnabled, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, type RegistryFeatureId } from "@/lib/appRegistry";')

ctx = '''\ntype LogSchemaContextValue = { data: BixboData; featureId: RegistryFeatureId } | null;\nconst LogSchemaContext = createContext<LogSchemaContextValue>(null);\nfunction useLogSchema() { return useContext(LogSchemaContext); }\n\n'''
if 'const LogSchemaContext' not in s:
    s = s.replace('type UpdateFn = (u: (d: BixboData) => BixboData) => void;\n', 'type UpdateFn = (u: (d: BixboData) => BixboData) => void;\n' + ctx)

# Wrap active form rendering region with provider.
s = s.replace('            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3">', '            <LogSchemaContext.Provider value={active ? { data, featureId: active as RegistryFeatureId } : null}>\n            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3">')
s = s.replace('            </div>\n          </div>\n        )}', '            </div>\n            </LogSchemaContext.Provider>\n          </div>\n        )}', 1)

# Field label lookup by stable base-label mapping. Only known schema fields override; unknown falls back.
s = s.replace('function Field({ label, children }: { label: string; children: ReactNode }) {\n  const { t } = useI18n();', 'function Field({ label, children }: { label: string; children: ReactNode }) {\n  const { t } = useI18n();\n  const schema = useLogSchema();\n  const fieldIdByLabel: Record<string, string> = { "Pain scale": "score", "Where does it hurt?": "parts", "How does it hurt?": "quality", "Other symptoms": "symptoms", "Intensity": "intensity", "Type": "types", "Location": "location", "Triggers": "triggers", "What helped?": "helped", "Bleeding": "flow", "Cramp pain": "cramps", "Discharge (optional)": "discharge", "Duration (minutes)": "minutes", "Intensity (RPE)": "rpe", "How you feel": "feel", "Urinary": "urinary" };\n  const fieldId = fieldIdByLabel[label];\n  const displayLabel = schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label;')
s = s.replace('<span className="text-xs font-medium text-muted-foreground">{t(label)}</span>', '<span className="text-xs font-medium text-muted-foreground">{t(displayLabel)}</span>', 1)

# CustomChipList: use schema override based on field label inferred from caller via optional schemaFieldId.
s = s.replace('  descriptions,\n}: {', '  descriptions,\n  schemaFieldId,\n}: {')
s = s.replace('  descriptions?: Record<string, string>;\n}) {', '  descriptions?: Record<string, string>;\n  schemaFieldId?: string;\n}) {')
s = s.replace('  const { t } = useI18n();\n  const [adding, setAdding]', '  const { t } = useI18n();\n  const schema = useLogSchema();\n  const configuredBase = schema && schemaFieldId ? registryFieldOptions(schema.data, schema.featureId, schemaFieldId, base) : base;\n  const optionLabel = (value: string) => schema && schemaFieldId ? registryOptionLabel(schema.data, schema.featureId, schemaFieldId, value) : value;\n  const [adding, setAdding]', 1)
s = s.replace('        {base.map((v) => (', '        {configuredBase.map((v) => (', 1)
s = s.replace('              {t(v)}\n            </Chip>', '              {t(optionLabel(v))}\n            </Chip>', 1)

# IntensityScale accepts schemaFieldId and resolves scale safely.
s = s.replace('  step = 0.5,\n}: {', '  step = 0.5,\n  schemaFieldId,\n}: {')
s = s.replace('  step?: number;\n}) {\n  const { t } = useI18n();\n  const nums = Array.from(\n    { length: Math.floor((max - from) / step) + 1 },\n    (_, i) => Number((from + i * step).toFixed(1)),\n  );', '  step?: number;\n  schemaFieldId?: string;\n}) {\n  const { t } = useI18n();\n  const schema = useLogSchema();\n  const effective = schema && schemaFieldId ? registryFieldScale(schema.data, schema.featureId, schemaFieldId, { min: from, max, step }) : { min: from, max, step };\n  const effectiveFrom = effective.min;\n  const effectiveMax = effective.max;\n  const effectiveStep = effective.step;\n  const nums = Array.from(\n    { length: Math.floor((effectiveMax - effectiveFrom) / effectiveStep) + 1 },\n    (_, i) => Number((effectiveFrom + i * effectiveStep).toFixed(2)),\n  );')
s = s.replace('          const bg = scaleColor(n, from, max);', '          const bg = scaleColor(n, effectiveFrom, effectiveMax);')
s = s.replace('      {descriptions && value >= from && selectedDescription && (', '      {descriptions && value >= effectiveFrom && selectedDescription && (')
s = s.replace('          max={max}\n          from={from}', '          max={effectiveMax}\n          from={effectiveFrom}', 1)

# Tag common scale calls by distinctive nearby props.
s = s.replace('legendTitle="Pain scale (Mankoski)"', 'legendTitle="Pain scale (Mankoski)" schemaFieldId="score"')
s = s.replace('legendTitle="Tetany intensity scale"', 'legendTitle="Tetany intensity scale" schemaFieldId="intensity"')
s = s.replace('legendTitle="Panic intensity scale"', 'legendTitle="Panic intensity scale" schemaFieldId="intensity"')
# Workout distinctive compact single row - first matching within WorkoutForm after label.
workout_pos = s.find('function WorkoutForm')
if workout_pos >= 0:
    tail = s[workout_pos:]
    idx = tail.find('<IntensityScale')
    if idx >= 0:
        global_idx = workout_pos + idx
        close = s.find('/>', global_idx)
        block = s[global_idx:close]
        if 'schemaFieldId=' not in block:
            s = s[:close] + ' schemaFieldId="rpe"' + s[close:]
# Period cramps: find PeriodForm then first IntensityScale.
period_pos = s.find('function PeriodForm')
if period_pos >= 0:
    tail = s[period_pos:]
    idx = tail.find('<IntensityScale')
    if idx >= 0:
        global_idx = period_pos + idx
        close = s.find('/>', global_idx)
        block = s[global_idx:close]
        if 'schemaFieldId=' not in block:
            s = s[:close] + ' schemaFieldId="cramps"' + s[close:]

# Tag CustomChipList common fields via immediate contexts.
for label, fid in [("Where does it hurt?", "parts"), ("How does it hurt?", "quality"), ("Other symptoms", "symptoms"), ("Physical symptoms", "physical"), ("Cognitive symptoms", "cognitive")]:
    pos = 0
    while True:
        pos = s.find(f'<Field label="{label}"', pos)
        if pos < 0: break
        c = s.find('<CustomChipList', pos)
        fend = s.find('</Field>', pos)
        if c >= 0 and c < fend:
            close = s.find('/>', c)
            block = s[c:close]
            if 'schemaFieldId=' not in block:
                s = s[:close] + f' schemaFieldId="{fid}"' + s[close:]
                pos = close + len(fid) + 20
            else: pos = close
        else: pos = fend if fend >= 0 else pos + 1
p.write_text(s)

# 4) Storage normalization: admin field overrides are plain settings data and already survive spread migration; add no destructive migration.
# 5) Tests for field scale preservation and stable IDs.
p = Path('src/lib/__tests__/appRegistry.test.ts')
s = p.read_text()
s = s.replace('import {', 'import {', 1)
if 'registryFieldScale' not in s:
    s = s.replace('from "../appRegistry";', 'from "../appRegistry";') if 'from "../appRegistry";' in s else s
    # Append standalone imports safely.
    s += '''\n\nimport { registryFieldScale, registryFieldOptions, registryOptionLabel } from "../appRegistry";\n\ndescribe("BIXBO log schema registry", () => {\n  it("applies dynamic scale overrides without mutating stored health values", () => {\n    const data = structuredClone(EMPTY);\n    data.dayLogs["2026-08-10"] = { pain: [{ id: "p", time: "10:00", score: 9, parts: [], quality: [], symptoms: [] }] };\n    data.settings.adminConfig = { features: { pain: { fields: { score: { scale: { min: 1, max: 5, step: 1 } } } } } };\n    expect(registryFieldScale(data, "pain", "score", { min: 0, max: 10, step: 1 })).toEqual({ min: 1, max: 5, step: 1 });\n    expect(data.dayLogs["2026-08-10"]?.pain?.[0]?.score).toBe(9);\n  });\n\n  it("can rename/hide chip options while keeping their stored stable value", () => {\n    const data = structuredClone(EMPTY);\n    data.settings.adminConfig = { features: { pain: { fields: { parts: { options: { Pelvis: { label: "Lower pelvis" }, Head: { enabled: false } } } } } } };\n    expect(registryOptionLabel(data, "pain", "parts", "Pelvis")).toBe("Lower pelvis");\n    expect(registryFieldOptions(data, "pain", "parts", ["Head", "Pelvis"])).toEqual(["Pelvis"]);\n  });\n});\n'''
p.write_text(s)
