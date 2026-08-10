from pathlib import Path
import re

SKIP_DIRS = ('/components/ui/', '/components/icons/')
SKIP_TEXT = {'BIXBO','TENS','JSON','CSV','kg','ml','mg','cm','mmHg','bpm','OAuth','Supabase','Web Push','Aa','Drovelis'}
ATTRS = ('placeholder','aria-label','title','alt')

for p in sorted(Path('src').rglob('*.tsx')):
    rel = '/' + p.as_posix()
    if any(x in rel for x in SKIP_DIRS):
        continue
    hits=[]
    lines=p.read_text(errors='ignore').splitlines()
    for i, raw in enumerate(lines,1):
        line=raw.strip()
        if not line or line.startswith('//') or line.startswith('*'):
            continue
        # Plain visible text between tags. Ignore operators/code-like fragments.
        for m in re.finditer(r'>\s*([^<>{}]+?)\s*<', line):
            txt=re.sub(r'\s+',' ',m.group(1)).strip()
            if not re.search(r'[A-Za-z]',txt):
                continue
            if txt in SKIP_TEXT or re.search(r'[=;()]|&&|\|\||=>|\.\w+',txt):
                continue
            hits.append((i,'TEXT',txt,line))
        # Direct literal accessibility / placeholder attrs.
        for attr in ATTRS:
            m=re.search(rf'\b{re.escape(attr)}="([^"{{}}]+)"',line)
            if m:
                txt=m.group(1).strip()
                if re.search(r'[A-Za-z]',txt) and txt not in SKIP_TEXT:
                    hits.append((i,attr.upper(),txt,line))
    if hits:
        print(f'### {p.as_posix()}')
        for i,kind,txt,line in hits:
            print(f'{i}|{kind}|{txt}|{line}')
