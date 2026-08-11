from pathlib import Path


def r(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {\n    const current = getDeviceAdminConfig();\n    const fields = current.features?.[featureId]?.customFields ?? [];\n    writeFields(featureId, fields.map((field) => field.id === fieldId ? { ...field, ...patch, id: field.id } : field));\n  };\n',
    '  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {\n    const current = getDeviceAdminConfig();\n    const fields = current.features?.[featureId]?.customFields ?? [];\n    writeFields(featureId, fields.map((field) => field.id === fieldId ? { ...field, ...patch, id: field.id } : field));\n  };\n\n  const moveField = (featureId: RegistryFeatureId, fieldId: string, delta: -1 | 1) => {\n    const current = getDeviceAdminConfig();\n    const ordered = [...(current.features?.[featureId]?.customFields ?? [])].sort((a, b) => a.order - b.order);\n    const from = ordered.findIndex((field) => field.id === fieldId);\n    const to = from + delta;\n    if (from < 0 || to < 0 || to >= ordered.length) return;\n    const [item] = ordered.splice(from, 1);\n    ordered.splice(to, 0, item);\n    writeFields(featureId, ordered.map((field, index) => ({ ...field, order: (index + 1) * 10 })));\n  };\n'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                  {fields.map((field) => (\n                    <div key={field.id} className="rounded-xl bg-background p-2 ring-1 ring-border">',
    '                  {fields.map((field, fieldIndex) => (\n                    <div key={field.id} className="rounded-xl bg-background p-2 ring-1 ring-border">'
)

r(
    'src/components/CoreFeatureCustomFieldBuilder.tsx',
    '                        <button type="button" onClick={() => deleteField(feature.id, field.id)} className="rounded-full px-2 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>\n                      </div>',
    '                        <button type="button" disabled={fieldIndex === 0} onClick={() => moveField(feature.id, field.id, -1)} aria-label={t("Move field up")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-bold ring-1 ring-border disabled:opacity-30">↑</button>\n                        <button type="button" disabled={fieldIndex === fields.length - 1} onClick={() => moveField(feature.id, field.id, 1)} aria-label={t("Move field down")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-bold ring-1 ring-border disabled:opacity-30">↓</button>\n                        <button type="button" onClick={() => deleteField(feature.id, field.id)} className="rounded-full px-2 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>\n                      </div>'
)

Path('src/lib/__tests__/admin-custom-field-order.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryCustomFieldsForFeature, type AdminConfig } from "../appRegistry";\nimport { EMPTY } from "../storage";\n\nconst data = (config: AdminConfig) => ({ ...EMPTY, settings: { ...EMPTY.settings, adminConfig: config } });\n\ndescribe("admin supplementary field ordering", () => {\n  it("renders fields by persisted order rather than array insertion order", () => {\n    const view = data({ features: { pain: { customFields: [\n      { id: "third", label: "Third", kind: "text", order: 30 },\n      { id: "first", label: "First", kind: "text", order: 10 },\n      { id: "second", label: "Second", kind: "text", order: 20 },\n    ] } } });\n    expect(registryCustomFieldsForFeature(view, "pain").map((field) => field.id)).toEqual(["first", "second", "third"]);\n  });\n});\n''')
