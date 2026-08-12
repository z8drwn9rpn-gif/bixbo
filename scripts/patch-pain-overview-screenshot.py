from pathlib import Path

path = Path('src/routes/index.tsx')
s = path.read_text()

old = '''                  {p.parts.length > 0 && <p className="text-sm">{p.parts.map(t).join(", ")}</p>}
                  {p.quality.length > 0 && <p className="text-xs text-muted-foreground">{p.quality.map(t).join(", ")}</p>}
                  {p.symptoms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + {p.symptoms.map(t).join(", ")}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}
                  {p.pressureTypes?.length || p.pressureIntensity != null ? (
                    <p className="text-xs text-muted-foreground">
                      {t("Pressure")}: {p.pressureTypes?.map(t).join(", ")}
                      {p.pressureIntensity != null
                        ? `${p.pressureTypes?.length ? " " : ""}${p.pressureIntensity}/10`
                        : ""}
                    </p>
                  ) : null}
                  {p.nausea || p.nauseaTypes?.length || p.nauseaSeverity != null ? (
                    <p className="text-xs text-muted-foreground">
                      {t("Nausea")}: {p.nauseaTypes?.map(t).join(", ")}
                      {p.nauseaSeverity != null ? `${p.nauseaTypes?.length ? " " : ""}${p.nauseaSeverity}/10` : ""}
                      {p.nauseaOngoing ? ` · ${t("ongoing")}` : p.nauseaMinutes != null ? ` · ${p.nauseaMinutes} min` : ""}
                      {p.nauseaTriggers?.length ? ` · ${t("triggers")}: ${p.nauseaTriggers.map(t).join(", ")}` : ""}
                      {p.nauseaSymptoms?.length ? ` · ${t("symptoms")}: ${p.nauseaSymptoms.map(t).join(", ")}` : ""}
                      {p.nauseaHelped?.length ? ` · ${t("relieved by")}: ${p.nauseaHelped.map(t).join(", ")}` : ""}
                    </p>
                  ) : null}'''

new = '''                  {p.parts.length > 0 && <p className="text-[15px] font-medium leading-snug">{p.parts.map(t).join(", ")}</p>}
                  <div className="my-2 border-t border-border/60" />
                  {(p.quality.length > 0 || p.symptoms.length > 0) && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Symptoms")}:</span>{" "}
                      {p.quality.map(t).join(", ")}
                      {p.symptoms.length > 0 ? `${p.quality.length ? " + " : ""}${p.symptoms.map(t).join(", ")}` : ""}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}
                  {p.pressureTypes?.length || p.pressureIntensity != null ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Pressure")}:</span>{" "}{p.pressureTypes?.map(t).join(", ")}
                      {p.pressureIntensity != null
                        ? `${p.pressureTypes?.length ? " " : ""}${p.pressureIntensity}/10`
                        : ""}
                    </p>
                  ) : null}
                  {p.nausea || p.nauseaTypes?.length || p.nauseaSeverity != null ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Nausea")}:</span>{" "}{p.nauseaTypes?.map(t).join(", ")}
                      {p.nauseaSeverity != null ? `${p.nauseaTypes?.length ? " " : ""}${p.nauseaSeverity}/10` : ""}
                      {p.nauseaOngoing ? ` · ${t("ongoing")}` : p.nauseaMinutes != null ? ` · ${p.nauseaMinutes} min` : ""}
                      {p.nauseaTriggers?.length ? ` · ${t("triggers")}: ${p.nauseaTriggers.map(t).join(", ")}` : ""}
                    </p>
                  ) : null}
                  {p.nauseaSymptoms?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Other")}:</span> {t("symptoms")}: {p.nauseaSymptoms.map(t).join(", ")}
                    </p>
                  ) : null}
                  {p.nauseaHelped?.length ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("Relieved by")}:</span> {p.nauseaHelped.map(t).join(", ")}
                    </p>
                  ) : null}'''

if old not in s:
    raise SystemExit('Pain overview target block not found')
s = s.replace(old, new, 1)

s = s.replace(
'''                  {p.pcosSymptoms?.length ? (
                    <p className="text-xs text-muted-foreground">PCOS: {p.pcosSymptoms.map(t).join(", ")}</p>
                  ) : null}''',
'''                  {p.pcosSymptoms?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">PCOS:</span> {p.pcosSymptoms.map(t).join(", ")}</p>
                  ) : null}''',
1,
)
s = s.replace(
'''                  {p.bodyBattery != null && <p className="text-xs text-muted-foreground">{t("Battery")} {p.bodyBattery}/5</p>}''',
'''                  {p.bodyBattery != null && <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{t("Battery")}:</span> {p.bodyBattery}/5</p>}''',
1,
)

path.write_text(s)
