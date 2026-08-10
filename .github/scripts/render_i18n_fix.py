from pathlib import Path

# index.tsx — HAK Day + accessible label
p = Path('src/routes/index.tsx')
s = p.read_text()
s = s.replace('aria-label={`Open birth control overview. HAK day ${packDay} of ${PACK_DAYS}`}', 'aria-label={`${t("Open birth control overview")} · ${t("HAK day")} ${packDay} ${t("of")} ${PACK_DAYS}`}')
s = s.replace('''              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">\n                Day\n              </span>''', '''              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">\n                {t("Day")}\n              </span>''', 1)
p.write_text(s)

# patterns.tsx — localized month names inside comparison graph labels
p = Path('src/routes/patterns.tsx')
s = p.read_text()
s = s.replace('function monthLabelFromPrefix(prefix: string): string {', 'function monthLabelFromPrefix(prefix: string, language: "en" | "sk"): string {')
s = s.replace('return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("en-GB", {', 'return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {')
s = s.replace('const { t } = useI18n();\n  const palette = METRIC_COLORS[color];', 'const { t, language } = useI18n();\n  const palette = METRIC_COLORS[color];', 1)
s = s.replace('const resolvedPreviousLabel = previousLabel ?? monthLabelFromPrefix(defaultPreviousPrefix);', 'const resolvedPreviousLabel = previousLabel ?? monthLabelFromPrefix(defaultPreviousPrefix, language);')
s = s.replace('const resolvedCurrentLabel = currentLabel ?? monthLabelFromPrefix(defaultCurrentPrefix);', 'const resolvedCurrentLabel = currentLabel ?? monthLabelFromPrefix(defaultCurrentPrefix, language);')
s = s.replace('export function PatternsContent() {\n  const { t } = useI18n();', 'export function PatternsContent() {\n  const { t, language } = useI18n();')
s = s.replace('const currentMonthLabel = monthLabelFromPrefix(currentMonthPrefix);', 'const currentMonthLabel = monthLabelFromPrefix(currentMonthPrefix, language);')
s = s.replace('const previousMonthLabel = monthLabelFromPrefix(previousMonthPrefix);', 'const previousMonthLabel = monthLabelFromPrefix(previousMonthPrefix, language);')
old = '''function MetricColumn({\n  label,\n  value,\n  percentage,\n  decimals,\n  unit,\n  color,\n  muted = false,\n}: {\n  label: string;\n  value: number | null;\n  percentage: number;\n  decimals: number;\n  unit: string;\n  color: string;\n  muted?: boolean;\n}) {\n  return ('''
new = '''function MetricColumn({\n  label,\n  value,\n  percentage,\n  decimals,\n  unit,\n  color,\n  muted = false,\n}: {\n  label: string;\n  value: number | null;\n  percentage: number;\n  decimals: number;\n  unit: string;\n  color: string;\n  muted?: boolean;\n}) {\n  const { t } = useI18n();\n  return ('''
s = s.replace(old, new, 1)
s = s.replace('<p className="text-[11px] font-medium text-muted-foreground">{label}</p>', '<p className="text-[11px] font-medium text-muted-foreground">{t(label)}</p>', 1)
p.write_text(s)

# couple.tsx — render dynamic/static detail strings through i18n and translate symptom detail internals
p = Path('src/routes/couple.tsx')
s = p.read_text()
s = s.replace('<p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>', '<p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{t(detail)}</p>', 1)
s = s.replace('<h2 className="mt-1 font-serif text-xl font-semibold">You + {t(partnerName)}</h2>', '<h2 className="mt-1 font-serif text-xl font-semibold">{t("You")} + {t(partnerName)}</h2>')
s = s.replace('detail={`${t(partnerName)}: ${partnerSymptomDays} days`}', 'detail={`${t(partnerName)}: ${partnerSymptomDays} ${t("days")}`}')
s = s.replace('detail={`You ${myPanic.length} · ${t(partnerName)} ${partnerPanic.length}`}', 'detail={`${t("You")} ${myPanic.length} · ${t(partnerName)} ${partnerPanic.length}`}')
s = s.replace('detail={`You ${myTetany.length} · ${t(partnerName)} ${partnerTetany.length}`}', 'detail={`${t("You")} ${myTetany.length} · ${t(partnerName)} ${partnerTetany.length}`}')
s = s.replace('{pain.parts?.length ? <p className="text-sm">{pain.parts.join(", ")}</p> : null}', '{pain.parts?.length ? <p className="text-sm">{pain.parts.map(t).join(", ")}</p> : null}')
s = s.replace('{pain.quality?.length ? <p className="text-xs text-muted-foreground">{pain.quality.join(", ")}</p> : null}', '{pain.quality?.length ? <p className="text-xs text-muted-foreground">{pain.quality.map(t).join(", ")}</p> : null}')
s = s.replace('<p className="text-xs text-muted-foreground">+ {pain.symptoms.join(", ")}</p>', '<p className="text-xs text-muted-foreground">+ {pain.symptoms.map(t).join(", ")}</p>')
s = s.replace('<p className="text-xs text-muted-foreground">Hot flashes {pain.hotFlashes}/5</p>', '<p className="text-xs text-muted-foreground">{t("Hot flashes")} {pain.hotFlashes}/5</p>')
s = s.replace('''                <p className="text-xs text-muted-foreground">\n                  Headache\n                  {pain.headacheIntensity != null ? ` ${pain.headacheIntensity}/10` : ""}\n                </p>''', '''                <p className="text-xs text-muted-foreground">\n                  {t("Headache")}\n                  {pain.headacheIntensity != null ? ` ${pain.headacheIntensity}/10` : ""}\n                </p>''')
s = s.replace('''                <p className="text-xs text-muted-foreground">\n                  Nausea\n                  {pain.nauseaSeverity != null ? ` ${pain.nauseaSeverity}/10` : ""}\n                </p>''', '''                <p className="text-xs text-muted-foreground">\n                  {t("Nausea")}\n                  {pain.nauseaSeverity != null ? ` ${pain.nauseaSeverity}/10` : ""}\n                </p>''')
p.write_text(s)

# i18n keys required by the new render calls
p = Path('src/lib/i18n.ts')
s = p.read_text()
marker = '\n};\n\nconst TRANSLATIONS'
insert_at = s.find(marker, s.find('const SK:'))
if insert_at < 0:
    raise RuntimeError('SK dictionary end not found')
entries = {
    'Open birth control overview': 'Otvoriť prehľad antikoncepcie',
    'HAK day': 'Deň HAK',
    'You': 'Ty',
    'Days when both of you logged pain, panic or tetany.': 'Dni, keď ste obaja zaznamenali bolesť, paniku alebo tetániu.',
}
new_lines = []
for key, value in entries.items():
    if f'  "{key}":' not in s[s.find('const SK:'):insert_at]:
        new_lines.append(f'  "{key}": "{value}",')
if new_lines:
    s = s[:insert_at] + '\n' + '\n'.join(new_lines) + s[insert_at:]
p.write_text(s)
