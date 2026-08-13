from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()
old = '// Panic (full inline log — under Tetany)'
new = '// Panic inline log section'
count = s.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one stale Panic marker, found {count}')
p.write_text(s.replace(old, new, 1))
