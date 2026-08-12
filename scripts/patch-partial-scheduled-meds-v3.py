from pathlib import Path

# Apply the robust v2 patch first.
exec(Path('scripts/patch-partial-scheduled-meds-v2.py').read_text(), {'__name__': '__main__'})

# medLogNotes was already added by the prior notes feature; v2 intentionally
# inserts it beside medLogItems for older branches. Keep exactly one property.
p = Path('src/lib/merge.ts')
s = p.read_text()
line = '      medLogNotes: mergeStructured("medLogNotes", effectiveLocal.medLogNotes ?? {}, remote.medLogNotes ?? {}) as BixboData["medLogNotes"],\n'
while s.count(line) > 1:
    pos = s.rfind(line)
    s = s[:pos] + s[pos + len(line):]
p.write_text(s)
