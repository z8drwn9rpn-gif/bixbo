from pathlib import Path

# trigger selective urinary-only repair
p = Path('src/components/LogSheet.tsx')
s = p.read_text()

old_state = '  const [bristol, setBristol] = useState<number>(initialEntry?.bristol ?? 4);'
new_state = '  const [bristol, setBristol] = useState<number | null>(initialEntry?.urinaryOnly ? null : (initialEntry?.bristol ?? null));'
if old_state not in s:
    raise SystemExit('Bowel Bristol state pattern not found')
s = s.replace(old_state, new_state, 1)

old_save = '''  const save = () => {\n    const editing = !!initialEntry;\n    const entry: BowelEntry = {\n      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time,\n      bristol,\n      feelings: feelings.length ? feelings : undefined,'''
new_save = '''  const save = () => {\n    if (bristol == null && urinary.length === 0) return;\n    const editing = !!initialEntry;\n    const urinaryOnly = bristol == null && urinary.length > 0;\n    const entry: BowelEntry = {\n      id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),\n      time,\n      bristol: urinaryOnly ? -2 : (bristol as number),\n      urinaryOnly: urinaryOnly || undefined,\n      feelings: feelings.length ? feelings : undefined,'''
if old_save not in s:
    raise SystemExit('Bowel save pattern not found')
s = s.replace(old_save, new_save, 1)

p.write_text(s)
