from pathlib import Path
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
old = '  const [customEditEntry, setCustomEditEntry] = useState<CustomLogEntry | undefined>();'
new = '  const [customEditEntry, setCustomEditEntry] = useState<CustomLogEntry | null | undefined>();'
if old not in s:
    raise SystemExit('customEditEntry state marker missing')
s = s.replace(old, new, 1)
old = '                const initialCustomEntry = customEditEntry ?? (edit as CustomLogEntry | undefined);'
new = '                const initialCustomEntry = customEditEntry === null ? undefined : customEditEntry ?? (edit as CustomLogEntry | undefined);'
if old not in s:
    raise SystemExit('initialCustomEntry marker missing')
s = s.replace(old, new, 1)
s = s.replace('onClick={() => setCustomEditEntry(undefined)}\n                              className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border"', 'onClick={() => setCustomEditEntry(null)}\n                              className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border"', 1)
s = s.replace('if (customEditEntry?.id === entry.id) setCustomEditEntry(undefined);', 'if (initialCustomEntry?.id === entry.id) setCustomEditEntry(null);', 1)
p.write_text(s)
print('explicit new-entry sentinel added')