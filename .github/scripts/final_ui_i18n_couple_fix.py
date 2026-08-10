from pathlib import Path
import json


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing expected block: {label}")
    return text.replace(old, new, 1)


def replace_all(text: str, old: str, new: str) -> str:
    return text.replace(old, new)

# -----------------------------------------------------------------------------
# Profile — inner settings
# -----------------------------------------------------------------------------
p = Path("src/routes/profile.tsx")
s = p.read_text()
s = replace_required(s, "                {theme}\n", "                {t(theme)}\n", "profile theme label")
s = replace_required(s, "<span className=\"mt-1 block text-[10px] text-muted-foreground\">{size.label}</span>", "<span className=\"mt-1 block text-[10px] text-muted-foreground\">{t(size.label)}</span>", "profile text-size label")
s = s.replace('accountAuthBusy === "google" ? "Opening Google…" : "Continue with Google"', 'accountAuthBusy === "google" ? t("Opening Google…") : t("Continue with Google")')
s = s.replace('accountAuthBusy === "apple" ? "Opening Apple…" : "Continue with Apple / iCloud"', 'accountAuthBusy === "apple" ? t("Opening Apple…") : t("Continue with Apple / iCloud")')
s = s.replace('>{option.label}</button>', '>{t(option.label)}</button>')
p.write_text(s)

# -----------------------------------------------------------------------------
# Quick Log — Add
# -----------------------------------------------------------------------------
p = Path("src/components/QuickTags.tsx")
s = p.read_text()
s = replace_required(s, "            Add\n          </button>", "            {t(\"Add\")}\n          </button>", "Quick Log Add")
p.write_text(s)

# -----------------------------------------------------------------------------
# Home/index — summaries, period banner, vital popup, Share day
# -----------------------------------------------------------------------------
p = Path("src/routes/index.tsx")
s = p.read_text()
s = replace_required(s, "function HomePage() {\n  const { t } = useI18n();", "function HomePage() {\n  const { t, language } = useI18n();", "Home language hook")
s = replace_required(s, '              Next period predicted:{" "}', '              {t("Next period predicted:")}{" "}', "next period banner")
s = s.replace('fromKey(k).toLocaleDateString("en-GB", {\n              day: "numeric",\n              month: "short",\n            })', 'fromKey(k).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {\n              day: "numeric",\n              month: "short",\n            })')
s = replace_required(s, '? "Today"\n            : fromKey(selected).toLocaleDateString("en-GB", {', '? t("Today")\n            : fromKey(selected).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {', "selected day heading")

# Summary toggle and locale.
s = replace_all(s, "                          Today\n                        </button>", "                          {t(\"Today\")}\n                        </button>")
s = replace_all(s, "                          Month\n                        </button>", "                          {t(\"Month\")}\n                        </button>")
s = s.replace('toLocaleDateString("en-GB", {\n                            weekday: "long",', 'toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {\n                            weekday: "long",')
s = s.replace('activeMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })', 'activeMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })')
s = replace_required(s, '{loggedDays} / {monthKeys.length} days logged', '{loggedDays} / {monthKeys.length} {t("days logged")}', "month logged days")
s = replace_required(s, "                              {row.label}\n", "                              {t(row.label)}\n", "summary row labels")
s = replace_required(s, '{summaryMode === "today" ? "Open today on calendar" : "Open month on calendar"}', '{summaryMode === "today" ? t("Open today on calendar") : t("Open month on calendar")}', "summary open button")

# Today/month summary dynamic value strings.
summary_replacements = {
    '"No pain logged"': 't("No pain logged")',
    '`${todayMedsTaken} of ${todayScheduled.length} taken`': '`${todayMedsTaken} ${t("of")} ${todayScheduled.length} ${t("taken")}`',
    '"Not logged"': 't("Not logged")',
    '"None"': 't("None")',
    '`${todayTetany} episode${todayTetany === 1 ? "" : "s"}`': '`${todayTetany} ${todayTetany === 1 ? t("episode") : t("episodes")}`',
    '`${todayBowelEntries.length} entr${todayBowelEntries.length === 1 ? "y" : "ies"}`': '`${todayBowelEntries.length} ${todayBowelEntries.length === 1 ? t("entry") : t("entries")}`',
    '`${entries.length} entr${entries.length === 1 ? "y" : "ies"}`': '`${entries.length} ${entries.length === 1 ? t("entry") : t("entries")}`',
    '`${monthPainAvg.toFixed(1)} / 10 avg`': '`${monthPainAvg.toFixed(1)} / 10 ${t("avg")}`',
    '`${monthMedsPct}% taken`': '`${monthMedsPct}% ${t("taken")}`',
    '"No schedule"': 't("No schedule")',
    '`${monthSleepAvg.toFixed(1)} h avg`': '`${monthSleepAvg.toFixed(1)} h ${t("avg")}`',
    '`${monthTetany} episode${monthTetany === 1 ? "" : "s"}`': '`${monthTetany} ${monthTetany === 1 ? t("episode") : t("episodes")}`',
    '`${monthPanic} episode${monthPanic === 1 ? "" : "s"}`': '`${monthPanic} ${monthPanic === 1 ? t("episode") : t("episodes")}`',
    '`${monthBowelCount} entr${monthBowelCount === 1 ? "y" : "ies"}`': '`${monthBowelCount} ${monthBowelCount === 1 ? t("entry") : t("entries")}`',
    '`${monthSex}× this month`': '`${monthSex}× ${t("this month")}`',
    '`${monthHotFlashDays} day${monthHotFlashDays === 1 ? "" : "s"}`': '`${monthHotFlashDays} ${monthHotFlashDays === 1 ? t("day") : t("days")}`',
    '`${monthHeadacheDays} day${monthHeadacheDays === 1 ? "" : "s"}`': '`${monthHeadacheDays} ${monthHeadacheDays === 1 ? t("day") : t("days")}`',
}
for old, new in summary_replacements.items():
    s = s.replace(old, new)

# Period summary wording/date locale.
s = s.replace('toLocaleDateString("en-GB", { day: "numeric", month: "short" })', 'toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })')
s = s.replace('` · ${periodDays.length} day${periodDays.length === 1 ? "" : "s"}`', ' ` · ${periodDays.length} ${periodDays.length === 1 ? t("day") : t("days")}`')

# VitalTile translates labels.
s = replace_required(s, "}) {\n  return (\n    <button\n      onClick={onClick}\n      className=\"flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface p-2 ring-1 ring-border hover:bg-tint\"", "}) {\n  const { t } = useI18n();\n  return (\n    <button\n      onClick={onClick}\n      className=\"flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface p-2 ring-1 ring-border hover:bg-tint\"", "VitalTile hook")
s = replace_required(s, '<span className="text-[10px] font-medium text-muted-foreground">{label}</span>', '<span className="text-[10px] font-medium text-muted-foreground">{t(label)}</span>', "VitalTile label")

# Vital popup title, dates and details.
s = replace_required(s, "  const { t } = useI18n();\n\n  // Lock the page behind the modal.", "  const { t, language } = useI18n();\n\n  // Lock the page behind the modal.", "Vital popup language hook")
s = s.replace('{vitalTrendTitle(metric)}</h2>', '{t(vitalTrendTitle(metric))}</h2>')
s = s.replace('aria-label={`Close ${vitalTrendTitle(metric)} graph`}', 'aria-label={`${t("Close")} ${t(vitalTrendTitle(metric))} ${t("graph")}`}')
s = s.replace('start.toLocaleDateString("en-GB", { month: "long", year: "numeric" })', 'start.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })')
s = s.replace('d.toLocaleDateString("en-GB", { weekday: "short" })', 'd.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { weekday: "short" })')
s = s.replace('anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })', 'anchor.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })')
s = s.replace('start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })', 'start.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })')
s = s.replace('end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })', 'end.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })')
s = replace_required(s, '{period === "Y" ? "Monthly average from saved entries" : "Saved entry"}', '{period === "Y" ? t("Monthly average from saved entries") : t("Saved entry")}', "Vital popup entry text")
s = replace_required(s, 'No {vitalTrendTitle(metric).toLowerCase()} data in this period.', '{t("No data in this period for")} {t(vitalTrendTitle(metric)).toLowerCase()}.', "Vital popup empty state")

# Share day visible UI and shared text labels.
s = replace_required(s, '<Share2 className="h-3.5 w-3.5" /> Share day', '<Share2 className="h-3.5 w-3.5" /> {t("Share day")}', "Share day button")
s = s.replace('`Pain — avg ${avg.toFixed(1)}/10 · ${log.pain.length} entr${log.pain.length === 1 ? "y" : "ies"}`', '`${t("Pain")} — ${t("avg")} ${avg.toFixed(1)}/10 · ${log.pain.length} ${log.pain.length === 1 ? t("entry") : t("entries")}`')
s = s.replace('`Panic episode — ${log.panic.length}`', '`${t("Panic episode")} — ${log.panic.length}`')
s = s.replace('`Tetany episode — ${log.tetany.length}`', '`${t("Tetany episode")} — ${log.tetany.length}`')
s = s.replace('${p.minutes == null ? "ongoing" : `${p.minutes}min`}', '${p.minutes == null ? t("ongoing") : `${p.minutes}min`}')
s = s.replace('${t.minutes == null ? "ongoing" : `${t.minutes}min`}', '${t.minutes == null ? t("ongoing") : `${t.minutes}min`}')
s = s.replace('lines.push(`Period: ${flowLabel(', 'lines.push(`${t("Period")}: ${flowLabel(')
s = s.replace('lines.push(`Sleep: ${log.sleepHours}h ', 'lines.push(`${t("Sleep")}: ${log.sleepHours}h ')
s = s.replace('lines.push(`Temperature: ${log.temperature}°C`)', 'lines.push(`${t("Temperature")}: ${log.temperature}°C`)')
s = s.replace('lines.push(`Weight: ${log.weight}kg`)', 'lines.push(`${t("Weight")}: ${log.weight}kg`)')
s = s.replace('lines.push(`Food: ${log.food.length} entries`)', 'lines.push(`${t("Food")}: ${log.food.length} ${t("entries")}`)')
s = s.replace('lines.push(`Workout: ${log.workout.map(', 'lines.push(`${t("Workout")}: ${log.workout.map(')
s = s.replace('alert("Copied to clipboard")', 'alert(t("Copied to clipboard"))')
s = s.replace('title: `How I feel · ${dateLabel}`', 'title: `${t("How I feel")} · ${dateLabel}`')
p.write_text(s)

# -----------------------------------------------------------------------------
# Insights — period switches + heatmap
# -----------------------------------------------------------------------------
p = Path("src/routes/insights.tsx")
s = p.read_text()
s = replace_required(s, "}) {\n  return (\n    <div\n      className=\"grid h-8 w-[210px] grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60\"", "}) {\n  const { t } = useI18n();\n  return (\n    <div\n      className=\"grid h-8 w-[210px] grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60\"", "InsightPeriodSelect hook")
# First selector occurrence after InsightPeriodSelect.
idx = s.index("function InsightPeriodSelect")
end = s.index("function shiftInsightPeriodAnchor", idx)
block = s[idx:end].replace("            {label}\n", "            {t(label)}\n")
s = s[:idx] + block + s[end:]
# Heatmap selector occurrence.
needle = '          {([\n            ["7D", "Week"],\n            ["30D", "Month"],\n            ["Y", "Year"],\n          ] as const).map(([value, label]) => {'
hidx = s.index(needle)
hend = s.index("        </div>", hidx)
hblock = s[hidx:hend].replace("                {label}\n", "                {t(label)}\n")
s = s[:hidx] + hblock + s[hend:]
s = s.replace('            No data\n', '            {t("No data")}\n')
p.write_text(s)

# -----------------------------------------------------------------------------
# Patterns — comparison cards were bypassing t()
# -----------------------------------------------------------------------------
p = Path("src/routes/patterns.tsx")
s = p.read_text()
s = replace_required(s, "            {title}\n          </h3>", "            {t(title)}\n          </h3>", "Patterns comparison title")
s = replace_required(s, "{subtitle && <p className=\"mt-0.5 text-[11px] leading-relaxed text-muted-foreground\">{subtitle}</p>}", "{subtitle && <p className=\"mt-0.5 text-[11px] leading-relaxed text-muted-foreground\">{t(subtitle)}</p>}", "Patterns comparison subtitle")
s = s.replace(' ? ` by ${formatMetricValue(Math.abs(delta), decimals, unit)}` : ""', ' ? ` ${t("by")} ${formatMetricValue(Math.abs(delta), decimals, unit)}` : ""')
p.write_text(s)

# -----------------------------------------------------------------------------
# Couple — translations + logged-day denominator
# -----------------------------------------------------------------------------
p = Path("src/routes/couple.tsx")
s = p.read_text()
s = replace_required(s, 'import { useI18n } from "@/hooks/useI18n";', 'import { useI18n } from "@/hooks/useI18n";\nimport { calculateCoupleSimilarity } from "@/lib/coupleSimilarity";', "Couple similarity import")
s = replace_required(s, "function CouplePage() {\n  const { t } = useI18n();", "function CouplePage() {\n  const { t, language } = useI18n();", "Couple language hook")
s = replace_required(s, "            Month\n          </div>", "            {t(\"Month\")}\n          </div>", "Couple Month chip")
s = replace_required(s, "                  {tab.label}\n", "                  {t(tab.label)}\n", "Couple tabs")

old_calc = '''  const similarityScore = partner
    ? (() => {
        const symptomDayGap = Math.abs(mySymptomDays - partnerSymptomDays) / Math.max(1, periodDays.length);

        const painGap =
          myPainAverage == null || partnerPainAverage == null ? 0.5 : Math.abs(myPainAverage - partnerPainAverage) / 10;

        const panicGap =
          Math.abs(myPanic.length - partnerPanic.length) / Math.max(1, myPanic.length, partnerPanic.length);

        const tetanyGap =
          Math.abs(myTetany.length - partnerTetany.length) / Math.max(1, myTetany.length, partnerTetany.length);

        const averageGap = (symptomDayGap + painGap + panicGap + tetanyGap) / 4;

        return clampPercent((1 - averageGap) * 100);
      })()
    : 0;'''
new_calc = '''  const loggedComparisonDays = partner
    ? periodDays.filter((day) => hasSymptoms(view.dayLogs[day]) || hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const similarityScore = partner
    ? calculateCoupleSimilarity({
        mySymptomDays,
        partnerSymptomDays,
        loggedComparisonDays,
        myPainAverage,
        partnerPainAverage,
        myPanicCount: myPanic.length,
        partnerPanicCount: partnerPanic.length,
        myTetanyCount: myTetany.length,
        partnerTetanyCount: partnerTetany.length,
      })
    : 0;'''
s = replace_required(s, old_calc, new_calc, "Couple similarity calculation")

# Common visible Couple strings.
s = s.replace('<p className="text-sm font-medium">{t("No partner linked yet.")}</p>', '<p className="text-sm font-medium">{t("No partner linked yet.")}</p>')
s = s.replace('              In Settings → Couple sharing, exchange pairing codes with your partner to compare selected health logs.\n', '              {t("In Settings → Couple sharing, exchange pairing codes with your partner to compare selected health logs.")}\n')
s = s.replace('              Open Couple sharing\n', '              {t("Open Couple sharing")}\n')
s = s.replace('              You — solid\n', '              {t("You")} — {t("solid")}\n')
s = s.replace('          {t(partnerName)} — striped\n', '          {t(partnerName)} — {t("striped")}\n')
s = s.replace('              Next period: <span', '              {t("Next period")}: <span')
s = s.replace('            Predicted window: {next.start} → {next.end}\n', '            {t("Predicted window")}: {next.start} → {next.end}\n')
s = s.replace('          Cycle {cycle.cycleLength}d · period {cycle.periodLength}d\n', '          {t("Cycle")} {cycle.cycleLength}d · {t("Period").toLowerCase()} {cycle.periodLength}d\n')
# BlueberrySection needs t/language hook.
s = replace_required(s, "}) {\n  const cycle = partner.cycle;\n", "}) {\n  const { t, language } = useI18n();\n  const cycle = partner.cycle;\n", "BlueberrySection hook")
s = s.replace('<span>{partner.name || "Partner"} — Blueberry</span>', '<span>{partner.name || t("Partner")} — {t("Blueberry")}</span>')
s = s.replace('{selectedMonthLabel}</p>', '{selectedMonthLabel}</p>')
# selected month locale in page.
s = s.replace('const selectedMonthLabel = monthLabel(selectedMonth);', 'const selectedMonthLabel = selectedMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", { month: "long", year: "numeric" });')
# Pain labels/details.
s = s.replace('                      Pain {selectedBar.value.toFixed(1)}/10\n', '                      {t("Pain")} {selectedBar.value.toFixed(1)}/10\n')
s = s.replace(' · Pain <b>{selectedBar.value.toFixed(1)}/10</b>', ' · {t("Pain")} <b>{selectedBar.value.toFixed(1)}/10</b>')
p.write_text(s)

# -----------------------------------------------------------------------------
# i18n — add/adjust Slovak strings
# -----------------------------------------------------------------------------
p = Path("src/lib/i18n.ts")
s = p.read_text()
# Make the language name itself Slovak in Slovak UI.
s = s.replace('"profile.language.english": "English",\n  "profile.language.slovak": "Slovenčina",\n  "profile.hub.languageTitle"', '"profile.language.english": "Angličtina",\n  "profile.language.slovak": "Slovenčina",\n  "profile.hub.languageTitle"', 1)

translations = {
    "light": "Svetlá",
    "dark": "Tmavá",
    "system": "Systém",
    "Small": "Malé",
    "Medium": "Stredné",
    "Large": "Veľké",
    "Extra": "Veľmi veľké",
    "Opening Google…": "Otváram Google…",
    "Opening Apple…": "Otváram Apple…",
    "Whole numbers": "Celé čísla",
    "Half steps": "Polovičné kroky",
    "Next period predicted:": "Predpokladaná ďalšia menštruácia:",
    "days logged": "dní zaznamenaných",
    "No pain logged": "Bolesť nezaznamenaná",
    "of": "z",
    "taken": "užité",
    "Not logged": "Nezaznamenané",
    "None": "Žiadne",
    "episode": "epizóda",
    "episodes": "epizódy",
    "entry": "záznam",
    "entries": "záznamov",
    "avg": "priemer",
    "No schedule": "Bez rozvrhu",
    "this month": "tento mesiac",
    "day": "deň",
    "days": "dní",
    "Open today on calendar": "Otvoriť dnešok v kalendári",
    "Open month on calendar": "Otvoriť mesiac v kalendári",
    "Body temperature": "Telesná teplota",
    "graph": "graf",
    "Monthly average from saved entries": "Mesačný priemer z uložených záznamov",
    "Saved entry": "Uložený záznam",
    "No data in this period for": "V tomto období nie sú údaje pre",
    "Share day": "Zdieľať deň",
    "Copied to clipboard": "Skopírované do schránky",
    "How I feel": "Ako sa cítim",
    "Trend": "Trend",
    "No underlying saved entry found.": "Nenašiel sa žiadny uložený podkladový záznam.",
    "Tap a point or bar to see the exact saved entry.": "Ťukni na bod alebo stĺpec a zobrazí sa presný uložený záznam.",
    "Type 0 — Mystery": "Typ 0 — Neznáme",
    "No data": "Žiadne údaje",
    "Comparison unavailable": "Porovnanie nie je dostupné",
    "No change": "Bez zmeny",
    "Changed": "Zmenené",
    "Improved": "Zlepšenie",
    "Worsened": "Zhoršenie",
    "by": "o",
    "No partner linked yet.": "Zatiaľ nie je prepojený žiadny partner.",
    "In Settings → Couple sharing, exchange pairing codes with your partner to compare selected health logs.": "V Nastaveniach → Zdieľanie s partnerom si vymeňte párovacie kódy a porovnajte vybrané zdravotné záznamy.",
    "Open Couple sharing": "Otvoriť zdieľanie s partnerom",
    "solid": "plné",
    "striped": "pruhované",
    "Predicted window": "Predpokladané obdobie",
    "Partner": "Partner",
    "Blueberry": "Blueberry",
    "Monthly": "Mesačne",
    "Treatment": "Liečba",
    "Triggers": "Spúšťače",
    "Before": "Pred",
    "After": "Po",
    "Low": "Nízka",
    "High": "Vysoká",
    "Confidence": "Spoľahlivosť",
}

# Insert only missing keys into SK object.
marker = '\n};\n\nconst TRANSLATIONS:'
if marker not in s:
    raise RuntimeError("Cannot locate end of SK translations")
insert = ''
for key, value in translations.items():
    if f'  {json.dumps(key, ensure_ascii=False)}:' not in s:
        insert += f'  {json.dumps(key, ensure_ascii=False)}: {json.dumps(value, ensure_ascii=False)},\n'
s = s.replace(marker, '\n' + insert + '};\n\nconst TRANSLATIONS:', 1)
p.write_text(s)

print("Applied final UI i18n + Couple logged-day similarity patch")
