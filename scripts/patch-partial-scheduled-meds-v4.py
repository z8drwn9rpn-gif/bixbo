from pathlib import Path

exec(Path('scripts/patch-partial-scheduled-meds-v2.py').read_text(), {'__name__': '__main__'})

p = Path('src/lib/merge.ts')
s = p.read_text()
inserted_notes = '      medLogNotes: mergeStructured("medLogNotes", effectiveLocal.medLogNotes ?? {}, remote.medLogNotes ?? {}) as BixboData["medLogNotes"],\n'
existing_notes = '      medLogNotes: mergeMedLogTimes(effectiveLocal.medLogNotes, remote.medLogNotes),\n'
if existing_notes in s and inserted_notes in s:
    s = s.replace(inserted_notes, '', 1)
p.write_text(s)
