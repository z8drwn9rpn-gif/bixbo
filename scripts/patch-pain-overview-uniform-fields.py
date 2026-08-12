from pathlib import Path

path = Path('src/routes/index.tsx')
s = path.read_text()

s = s.replace(
    '{p.parts.length > 0 && <p className="text-[15px] font-medium leading-snug">{p.parts.map(t).join(", ")}</p>}',
    '{p.parts.length > 0 && <p className="text-xs leading-relaxed text-muted-foreground">{p.parts.map(t).join(", ")}</p>}',
    1,
)

old = '''                  {p.hotFlashes != null && (\n                    <p className="text-xs text-muted-foreground">\n                      <Ico e="🥵" size={13} /> {t("Hot flashes intensity")} {p.hotFlashes}/5\n                    </p>\n                  )}\n                  {p.headacheTypes?.length ? (\n                    <p className="text-xs text-muted-foreground">\n                      <Ico e="🤕" size={13} /> {t("Headache")}: {p.headacheTypes.map(t).join(", ")}\n                      {p.headacheIntensity != null ? ` · ${p.headacheIntensity}/10` : ""}\n                    </p>\n                  ) : p.headacheIntensity != null ? (\n                    <p className="text-xs text-muted-foreground">\n                      <Ico e="🤕" size={13} /> {t("Headache intensity")} {p.headacheIntensity}/10\n                    </p>\n                  ) : null}'''
new = '''                  {p.hotFlashes != null && (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Hot flashes")}:</span>{" "}{p.hotFlashes}/5\n                    </p>\n                  )}\n                  {p.headacheTypes?.length ? (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Headache")}:</span>{" "}{p.headacheTypes.map(t).join(", ")}\n                      {p.headacheIntensity != null ? ` ${p.headacheIntensity}/10` : ""}\n                    </p>\n                  ) : p.headacheIntensity != null ? (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Headache")}:</span>{" "}{p.headacheIntensity}/10\n                    </p>\n                  ) : null}'''
if old not in s:
    raise SystemExit('Hot flashes/headache block not found')
s = s.replace(old, new, 1)

s = s.replace(
    '{p.stress != null && <p className="text-xs text-muted-foreground">{t("Stress")} {p.stress}/10</p>}',
    '{p.stress != null && <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("Stress")}:</span> {p.stress}/10</p>}',
    1,
)

path.write_text(s)
