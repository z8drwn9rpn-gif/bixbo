from pathlib import Path
p = Path('src/components/AdminEditOverlay.tsx')
text = p.read_text()
needle = '''  const deleteCustomFieldOption = (featureId: RegistryFeatureId, fieldId: string, value: string) => {
    if (!value.startsWith("custom:")) return;
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const field = feature.fields?.[fieldId] ?? {};
    const options = { ...(field.options ?? {}) };
    delete options[value];
    persist({
      ...config,
      enabled: true,
      features: {
        ...(config.features ?? {}),
        [featureId]: {
          ...feature,
          fields: { ...(feature.fields ?? {}), [fieldId]: { ...field, options } },
        },
      },
    });
  };

'''
insert = needle + '''  const orderedFieldOptionValues = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => {
    const overrides = getDeviceAdminConfig().features?.[featureId]?.fields?.[fieldId]?.options ?? {};
    const values = [...new Set([...baseOptions, ...Object.keys(overrides)])];
    return values.sort((a, b) => (overrides[a]?.order ?? values.indexOf(a)) - (overrides[b]?.order ?? values.indexOf(b)));
  };

  const moveFieldOption = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], value: string, delta: number) => {
    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);
    const from = values.indexOf(value);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= values.length) return;
    [values[from], values[to]] = [values[to], values[from]];

    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const field = feature.fields?.[fieldId] ?? {};
    const options = { ...(field.options ?? {}) };
    values.forEach((option, index) => {
      options[option] = { ...(options[option] ?? {}), order: (index + 1) * 10 };
    });
    patchField(featureId, fieldId, { options });
  };

'''
if needle not in text: raise SystemExit('delete option block not found')
text = text.replace(needle, insert, 1)
needle = '''                            const field = getRegistryField(adminView, featureId, baseField.id) ?? baseField;
                            const localField = localConfig.features?.[featureId]?.fields?.[baseField.id];
                            return (
'''
replace = '''                            const field = getRegistryField(adminView, featureId, baseField.id) ?? baseField;
                            const localField = localConfig.features?.[featureId]?.fields?.[baseField.id];
                            const optionValues = orderedFieldOptionValues(featureId, baseField.id, baseField.options ?? []);
                            return (
'''
if needle not in text: raise SystemExit('field render marker not found')
text = text.replace(needle, replace, 1)
needle = '''                                    {[...new Set([...(baseField.options ?? []), ...Object.keys(localField?.options ?? {})])].map((option, optionIndex) => {
'''
replace = '''                                    {optionValues.map((option, optionIndex) => {
'''
if needle not in text: raise SystemExit('option map marker not found')
text = text.replace(needle, replace, 1)
needle = '''                                        <div key={option} className="flex items-center gap-1.5">
                                          <input value={label} onChange={(event) => patchField(featureId, baseField.id, { options: { [option]: { ...override, label: event.target.value, order: override?.order ?? optionIndex } } })} className="h-7 min-w-0 flex-1 rounded-lg bg-background px-2 text-[10px] ring-1 ring-border" />
                                          {custom ? (
'''
replace = '''                                        <div key={option} className="flex items-center gap-1.5">
                                          <button type="button" disabled={optionIndex === 0} onClick={() => moveFieldOption(featureId, baseField.id, baseField.options ?? [], option, -1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move up")} ${label}`}>↑</button>
                                          <button type="button" disabled={optionIndex === optionValues.length - 1} onClick={() => moveFieldOption(featureId, baseField.id, baseField.options ?? [], option, 1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${label}`}>↓</button>
                                          <input value={label} onChange={(event) => patchField(featureId, baseField.id, { options: { [option]: { ...override, label: event.target.value, order: override?.order ?? (optionIndex + 1) * 10 } } })} className="h-7 min-w-0 flex-1 rounded-lg bg-background px-2 text-[10px] ring-1 ring-border" />
                                          {custom ? (
'''
if needle not in text: raise SystemExit('option row marker not found')
text = text.replace(needle, replace, 1)
p.write_text(text)

Path('src/lib/__tests__/admin-option-order.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { registryFieldOptions } from "../appRegistry";\nimport type { BixboData } from "../storage";\n\ndescribe("admin option order", () => {\n  it("uses stable option values while applying registry order", () => {\n    const data = { settings: { adminConfig: { features: { pain: { fields: { parts: { options: { Head: { order: 20 }, Back: { order: 10 }, \"custom:test\": { label: \"Mine\", order: 15 } } } } } } } } } as unknown as Pick<BixboData, \"settings\">;\n    expect(registryFieldOptions(data, \"pain\", \"parts\", [\"Head\", \"Back\"])).toEqual([\"Back\", \"custom:test\", \"Head\"]);\n  });\n});\n''')
