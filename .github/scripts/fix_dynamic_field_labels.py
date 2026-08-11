from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()
old = '''  const configuredField = schema && fieldId ? getRegistryField(schema.data, schema.featureId, fieldId) : undefined;
  const displayLabel = configuredField?.label ?? (schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label);'''
new = '''  const configuredField = schema && fieldId ? getRegistryField(schema.data, schema.featureId, fieldId) : undefined;
  const dynamicSuffix = fieldId === "intensity" && label.startsWith("Intensity ") ? label.slice("Intensity".length) : "";
  const displayLabel = configuredField
    ? `${configuredField.label}${dynamicSuffix}`
    : (schema && fieldId ? registryFieldLabel(schema.data, schema.featureId, fieldId, label) : label);'''
if s.count(old) != 1:
    raise SystemExit(f'expected one Field label block, got {s.count(old)}')
s = s.replace(old, new, 1)
p.write_text(s)
print('Preserved dynamic intensity value suffix while allowing registry label rename.')
