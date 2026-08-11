from pathlib import Path

for path in ['src/routes/patterns.tsx', 'src/routes/insights.tsx']:
    p = Path(path)
    s = p.read_text()
    marker = 'type VitalEntry = {' if path.endswith('patterns.tsx') else 'function TrText('
    helper = '''function strictAdminNumericValue(value: unknown): number {\n  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;\n}\n\n'''
    if 'function strictAdminNumericValue(' not in s:
        if marker not in s:
            raise SystemExit(f'helper insertion marker missing in {path}')
        s = s.replace(marker, helper + marker, 1)
    replaced = s.count('Number(entry.values[field.id])')
    s = s.replace('Number(entry.values[field.id])', 'strictAdminNumericValue(entry.values[field.id])')
    if replaced == 0:
        raise SystemExit(f'no numeric admin coercions found in {path}')
    p.write_text(s)
    print(path, 'replaced', replaced, 'numeric coercions')
