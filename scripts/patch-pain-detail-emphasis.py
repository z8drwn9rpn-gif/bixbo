from pathlib import Path
import re

# UI-only patch. Do not change saved data or form semantics.
index = Path('src/routes/index.tsx')
s = index.read_text()

# Body location should use the same compact size as the detail rows.
s = s.replace('className="text-[15px] font-medium leading-snug"', 'className="text-xs font-medium leading-relaxed text-foreground"')

# Hot flashes: same label/value treatment as Nausea, no standalone icon.
s = re.sub(
    r'''\{p\.hotFlashes != null && \(\s*<p className="text-xs text-muted-foreground">\s*<Ico e="🥵" size=\{13\} /> \{t\("Hot flashes intensity"\)\} \{p\.hotFlashes\}/5\s*</p>\s*\)\}''',
    '''{p.hotFlashes != null && (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Hot flashes intensity")}:</span> {p.hotFlashes}/5\n                    </p>\n                  )}''',
    s,
)

# Headache: same label/value treatment as Nausea, no standalone icon.
s = re.sub(
    r'''\{p\.headacheTypes\?\.length \? \(\s*<p className="text-xs text-muted-foreground">\s*<Ico e="🤕" size=\{13\} /> \{t\("Headache"\)\}: \{p\.headacheTypes\.map\(t\)\.join\(", "\)\}\s*\{p\.headacheIntensity != null \? ` · \$\{p\.headacheIntensity\}/10` : ""\}\s*</p>\s*\) : p\.headacheIntensity != null \? \(\s*<p className="text-xs text-muted-foreground">\s*<Ico e="🤕" size=\{13\} /> \{t\("Headache intensity"\)\} \{p\.headacheIntensity\}/10\s*</p>\s*\) : null\}''',
    '''{p.headacheTypes?.length ? (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Headache")}:</span> {p.headacheTypes.map(t).join(", ")}\n                      {p.headacheIntensity != null ? ` · ${p.headacheIntensity}/10` : ""}\n                    </p>\n                  ) : p.headacheIntensity != null ? (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Headache")}:</span> {p.headacheIntensity}/10\n                    </p>\n                  ) : null}''',
    s,
)

# Stress: bold label + colon, same rhythm as Nausea.
s = s.replace(
    '{p.stress != null && <p className="text-xs text-muted-foreground">{t("Stress")} {p.stress}/10</p>}',
    '{p.stress != null && <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Stress")}:</span> {p.stress}/10</p>}',
)

# Mood: bold label + colon, same rhythm as Nausea.
s = s.replace(
    '''{p.mood?.length ? (\n                    <p className="text-xs text-muted-foreground">\n                      {t("Mood")}: <IcoText text={p.mood.map(t).join(", ")} size={13} />\n                    </p>\n                  ) : null}''',
    '''{p.mood?.length ? (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Mood")}:</span> <IcoText text={p.mood.map(t).join(", ")} size={13} />\n                    </p>\n                  ) : null}''',
)

index.write_text(s)

sheet = Path('src/components/LogSheet.tsx')
t = sheet.read_text()
old = '''                <IntensityScale\n                  value={stress ?? -1}\n                  onChange={(n) => setStress(stress === n ? undefined : n)}\n                  max={10}\n                  from={0}\n                  descriptions={STRESS_DESC}\n                  legendTitle="Stress scale"\n                />'''
new = '''                <IntensityScale\n                  value={stress ?? -1}\n                  onChange={(n) => setStress(stress === n ? undefined : n)}\n                  max={10}\n                  from={1}\n                  step={1}\n                  descriptions={STRESS_DESC}\n                  legendTitle="Stress scale"\n                  compactSingleRow\n                />'''
if old not in t:
    raise SystemExit('Stress scale block not found')
t = t.replace(old, new, 1)
sheet.write_text(t)
