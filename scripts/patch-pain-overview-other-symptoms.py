from pathlib import Path

path = Path('src/routes/index.tsx')
s = path.read_text()

old = '''                  {(p.quality.length > 0 || p.symptoms.length > 0) && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Symptoms")}:</span>{" "}
                      {p.quality.map(t).join(", ")}
                      {p.symptoms.length > 0 ? `${p.quality.length ? " + " : ""}${p.symptoms.map(t).join(", ")}` : ""}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}'''
new = '''                  {p.quality.length > 0 && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Symptoms")}:</span>{" "}
                      {p.quality.map(t).join(", ")}
                    </p>
                  )}
                  {p.symptoms.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Other")}:</span>{" "}
                      {p.symptoms.map(t).join(", ")}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}'''
if old not in s:
    raise SystemExit('Pain Symptoms block not found')
s = s.replace(old, new, 1)

old2 = '''                  {p.nauseaSymptoms?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Other")}:</span> {t("symptoms")}: {p.nauseaSymptoms.map(t).join(", ")}
                    </p>
                  ) : null}'''
new2 = '''                  {p.nauseaSymptoms?.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Nausea")} {t("symptoms")}:</span> {p.nauseaSymptoms.map(t).join(", ")}
                    </p>
                  ) : null}'''
if old2 not in s:
    raise SystemExit('Pain nausea associated symptoms block not found')
s = s.replace(old2, new2, 1)

path.write_text(s)

# Lock the mapping with a small regression assertion.
test = Path('src/lib/__tests__/pain-symptom-update-regression.test.ts')
t = test.read_text()
needle = "    expect(home).toContain('entry.sourcePainId === p.id');\n"
addition = "    expect(home).toContain('p.symptoms.map(t).join(\", \")');\n    expect(home).toContain('{t(\"Nausea\")} {t(\"symptoms\")}:');\n"
if addition not in t:
    if needle not in t:
        raise SystemExit('Regression insertion point not found')
    t = t.replace(needle, needle + addition, 1)
test.write_text(t)
