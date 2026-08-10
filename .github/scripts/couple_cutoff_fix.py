from pathlib import Path

p = Path('src/routes/couple.tsx')
s = p.read_text()

# Localize monthly range label using current UI language by moving display labels to localized values.
s = s.replace('  const periodDisplayLabel = range.label;\n', '  const periodDisplayLabel = period === "M" ? selectedMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", { month: "long", year: "numeric" }) : range.label;\n')
# The previous replacement references selectedMonth before declaration, so reorder if needed.
s = s.replace('  const periodDays = range.days;\n  const periodDisplayLabel = period === "M" ? selectedMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", { month: "long", year: "numeric" }) : range.label;\n\n  const selectedMonth = useMemo(() => startOfMonth(anchor), [anchor]);\n', '  const periodDays = range.days;\n  const selectedMonth = useMemo(() => startOfMonth(anchor), [anchor]);\n  const periodDisplayLabel = period === "M" ? selectedMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", { month: "long", year: "numeric" }) : range.label;\n\n')
s = s.replace('  const painMonthLabel = painMonthRange.label;\n', '  const painMonthLabel = selectedMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", { month: "long", year: "numeric" });\n')

old = '''  const loggedComparisonDays = partner\n    ? periodDays.filter((day) => hasSymptoms(view.dayLogs[day]) || hasSymptoms(partner.dayLogs[day])).length\n    : 0;\n\n  const similarityScore = partner\n    ? calculateCoupleSimilarity({\n        mySymptomDays,\n        partnerSymptomDays,\n        loggedComparisonDays,\n        myPainAverage,\n        partnerPainAverage,\n        myPanicCount: myPanic.length,\n        partnerPanicCount: partnerPanic.length,\n        myTetanyCount: myTetany.length,\n        partnerTetanyCount: partnerTetany.length,\n      })\n    : 0;\n'''
new = '''  const partnerComparisonDays = partner\n    ? periodDays.filter((day) => hasSymptoms(partner.dayLogs[day]))\n    : [];\n\n  const hasPartnerComparisonData = partnerComparisonDays.length > 0;\n\n  const loggedComparisonDays = partner && hasPartnerComparisonData\n    ? periodDays.filter((day) => hasSymptoms(view.dayLogs[day]) || hasSymptoms(partner.dayLogs[day])).length\n    : 0;\n\n  const similarityScore = partner && hasPartnerComparisonData\n    ? calculateCoupleSimilarity({\n        mySymptomDays,\n        partnerSymptomDays,\n        loggedComparisonDays,\n        myPainAverage,\n        partnerPainAverage,\n        myPanicCount: myPanic.length,\n        partnerPanicCount: partnerPanic.length,\n        myTetanyCount: myTetany.length,\n        partnerTetanyCount: partnerTetany.length,\n      })\n    : null;\n'''
if old not in s:
    raise RuntimeError('similarity block not found')
s = s.replace(old, new, 1)

s = s.replace('function SimilarityCard({ score, partnerName }: { score: number; partnerName: string }) {', 'function SimilarityCard({ score, partnerName }: { score: number | null; partnerName: string }) {')
s = s.replace('  const safeScore = clampPercent(score);', '  const safeScore = score == null ? 0 : clampPercent(score);', 1)
s = s.replace('<p className="text-2xl font-bold tabular-nums">{safeScore.toFixed(0)}%</p>', '<p className="text-2xl font-bold tabular-nums">{score == null ? "—" : `${safeScore.toFixed(0)}%`}</p>', 1)
s = s.replace('{t("Based only on shared pain, panic and tetany data during the selected month.")}', '{score == null ? t("No partner comparison data in this month.") : t("Based only on shared pain, panic and tetany data during the selected month.")}', 1)

# Hide calculated overview stats when the partner has no comparable logs in the selected month.
s = s.replace('{activeTab === "overview" ? (\n              <div className="grid grid-cols-2 gap-2">', '{activeTab === "overview" && hasPartnerComparisonData ? (\n              <div className="grid grid-cols-2 gap-2">', 1)

p.write_text(s)

# Add Slovak translation key if absent.
p = Path('src/lib/i18n.ts')
s = p.read_text()
start = s.find('const SK:')
end = s.find('\n};\n\nconst TRANSLATIONS', start)
key = 'No partner comparison data in this month.'
if key not in s[start:end]:
    s = s[:end] + '\n  "No partner comparison data in this month.": "V tomto mesiaci partner nemá žiadne porovnateľné záznamy.",' + s[end:]
p.write_text(s)
