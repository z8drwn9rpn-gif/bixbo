from pathlib import Path

path = Path('src/components/LogSheet.tsx')
s = path.read_text()

# Normalize legacy emoji-prefixed saved chip values so the UI accurately shows what is saved.
s = s.replace(
    '  const [nauseaSymptoms, setNauseaSymptoms] = useState<string[]>(initialEntry?.nauseaSymptoms ?? []);',
    '  const [nauseaSymptoms, setNauseaSymptoms] = useState<string[]>((initialEntry?.nauseaSymptoms ?? []).map(stripEmoji));',
    1,
)
s = s.replace(
    '  const [nauseaTypes, setNauseaTypes] = useState<string[]>(initialEntry?.nauseaTypes ?? []);',
    '  const [nauseaTypes, setNauseaTypes] = useState<string[]>((initialEntry?.nauseaTypes ?? []).map(stripEmoji));',
    1,
)
s = s.replace(
    '  const [nauseaTriggers, setNauseaTriggers] = useState<string[]>(initialEntry?.nauseaTriggers ?? []);',
    '  const [nauseaTriggers, setNauseaTriggers] = useState<string[]>((initialEntry?.nauseaTriggers ?? []).map(stripEmoji));',
    1,
)
s = s.replace(
    '  const [nauseaHelped, setNauseaHelped] = useState<string[]>(initialEntry?.nauseaHelped ?? []);',
    '  const [nauseaHelped, setNauseaHelped] = useState<string[]>((initialEntry?.nauseaHelped ?? []).map(stripEmoji));',
    1,
)

old_no = '''              <Chip active={!nausea} onClick={() => setNausea(false)}>
                No
              </Chip>'''
new_no = '''              <Chip
                active={!nausea}
                onClick={() => {
                  setNausea(false);
                  setNauseaTypes([]);
                  setNauseaSeverity(undefined);
                  setNauseaMinutes("");
                  setNauseaOngoing(false);
                  setNauseaTriggers([]);
                  setNauseaSymptoms([]);
                  setNauseaHelped([]);
                }}
              >
                No
              </Chip>'''
if old_no not in s:
    raise SystemExit('Nausea No chip block not found')
s = s.replace(old_no, new_no, 1)

# Defensive normalization/deduplication at save time. Only actually selected nausea chips are persisted.
s = s.replace(
    '      nauseaTypes: nausea && nauseaTypes.length ? nauseaTypes : undefined,',
    '      nauseaTypes: nausea && nauseaTypes.length ? [...new Set(nauseaTypes.map(stripEmoji))] : undefined,',
    1,
)
s = s.replace(
    '      nauseaTriggers: nausea && nauseaTriggers.length ? nauseaTriggers : undefined,',
    '      nauseaTriggers: nausea && nauseaTriggers.length ? [...new Set(nauseaTriggers.map(stripEmoji))] : undefined,',
    1,
)
s = s.replace(
    '      nauseaSymptoms: nausea && nauseaSymptoms.length ? nauseaSymptoms : undefined,',
    '      nauseaSymptoms: nausea && nauseaSymptoms.length ? [...new Set(nauseaSymptoms.map(stripEmoji))] : undefined,',
    1,
)
s = s.replace(
    '      nauseaHelped: nausea && nauseaHelped.length ? nauseaHelped : undefined,',
    '      nauseaHelped: nausea && nauseaHelped.length ? [...new Set(nauseaHelped.map(stripEmoji))] : undefined,',
    1,
)

path.write_text(s)

# Add regression checks without touching runtime behavior elsewhere.
test = Path('src/lib/__tests__/pain-symptom-update-regression.test.ts')
t = test.read_text()
needle = "    expect(sheet).toContain('setSymptoms([])');\n"
addition = "    expect(sheet).toContain('setNauseaSymptoms([])');\n    expect(sheet).toContain('nauseaSymptoms.map(stripEmoji)');\n"
if addition not in t:
    if needle not in t:
        raise SystemExit('Regression insertion point not found')
    t = t.replace(needle, needle + addition, 1)
test.write_text(t)
