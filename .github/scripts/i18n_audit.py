from pathlib import Path
import re

ATTR = re.compile(r'\b(placeholder|aria-label|title|alt|data-placeholder)="([^"]*[A-Za-z][^"]*)"')
TEXT = re.compile(r'>\s*([^<{\n]*[A-Za-z][^<{\n]*)\s*<')

skip_parts = {'/components/ui/', '/lib/', '/hooks/'}
for p in sorted(Path('src').rglob('*.tsx')):
    rel = '/' + p.as_posix()
    if any(part in rel for part in skip_parts):
        continue
    lines = p.read_text(encoding='utf-8').splitlines()
    for i, line in enumerate(lines, 1):
        s = line.strip()
        for m in ATTR.finditer(s):
            value = m.group(2).strip()
            if value and not value.startswith(('http://','https://')):
                print(f'{p}:{i}: ATTR {m.group(1)} = {value}')
        for m in TEXT.finditer(s):
            value = ' '.join(m.group(1).split())
            if not value:
                continue
            if value in {'BIXBO', '×', '—'}:
                continue
            if any(tok in value for tok in ['=>', '&&', '||']):
                continue
            print(f'{p}:{i}: TEXT = {value}')
