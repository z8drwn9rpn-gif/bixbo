from pathlib import Path
p=Path('src/features/logging/CalendarForms.tsx')
s=p.read_text()
a='grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0'
b='grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0'
if s.count(a) < 4: raise SystemExit('grid matcher missing')
p.write_text(s.replace(a,b,4))
