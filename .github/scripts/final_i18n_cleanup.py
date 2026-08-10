from pathlib import Path


def replace(path: str, old: str, new: str, required: bool = False):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        if required:
            raise RuntimeError(f'Missing expected text in {path}: {old[:120]!r}')
        return
    p.write_text(s.replace(old, new), encoding='utf-8')


def replace_once(path: str, old: str, new: str, required: bool = False):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        if required:
            raise RuntimeError(f'Missing expected text in {path}: {old[:120]!r}')
        return
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def ensure_hook(path: str, func_name: str):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    idx = s.find(f'function {func_name}(')
    if idx < 0:
        raise RuntimeError(f'Function not found: {func_name}')
    body = s.find('}) {', idx)
    if body < 0:
        body = s.find(') {', idx)
        opener = 3
    else:
        opener = 4
    insert = body + opener
    if 'useI18n()' not in s[insert:insert+220]:
        s = s[:insert] + '\n  const { t } = useI18n();' + s[insert:]
        p.write_text(s, encoding='utf-8')

# ---------- LogSheet ----------
log='src/components/LogSheet.tsx'
replace(log, '<Plus className="h-3 w-3" /> Add', '<Plus className="h-3 w-3" /> {t("Add")}')
replace(log, '>\n        Add\n      </Button>', '>\n        {t("Add")}\n      </Button>')
ensure_hook(log, 'ThermoForm')
replace(log, '<Ico e="♨️" size={16} /> Heat', '<Ico e="♨️" size={16} /> {t("Heat")}')
replace(log, '<Ico e="🧊" size={16} /> Cold', '<Ico e="🧊" size={16} /> {t("Cold")}')
replace(log, '<Ico e="⭐" size={16} /> TENS', '<Ico e="⭐" size={16} /> {t("TENS")}')

# ---------- Pregnancy ----------
preg='src/routes/pregnancy.tsx'
replace(preg, '          Add photo\n', '          {t("Add photo")}\n')
replace(preg, 'alt="Bump"', 'alt={t("Bump")}')
replace(preg, 'alt="Bump full size"', 'alt={t("Bump full size")}')

# ---------- Notes ----------
notes='src/routes/notes.tsx'
replace(notes, 'title="Pinned"', 'title={t("Pinned")}')

# ---------- Home/index ----------
idx='src/routes/index.tsx'
# trend popup
replace(idx, 'aria-label="Close"', 'aria-label={t("Close")}')
replace(idx, '{value === "W" ? "Week" : value === "M" ? "Month" : "Year"}', '{value === "W" ? t("Week") : value === "M" ? t("Month") : t("Year")}')
replace(idx, 'aria-label="Previous period"', 'aria-label={t("Previous period")}')
replace(idx, 'aria-label="Next period"', 'aria-label={t("Next period")}')
# header / calendar accessibility
replace(idx, 'Hi, {view.settings.userName?.trim() || "there"}', '{t("Hi")}, {view.settings.userName?.trim() || t("there")}')
replace(idx, 'aria-label="Open today\'s summary"', 'aria-label={t("Open today\'s summary")}')
replace(idx, 'aria-label="Health"', 'aria-label={t("Health")}')
replace(idx, 'title="Health"', 'title={t("Health")}')
replace(idx, 'aria-label="Previous month"', 'aria-label={t("Previous month")}')
replace(idx, 'aria-label="Next month"', 'aria-label={t("Next month")}')
replace(idx, 'aria-label="Close summary"', 'aria-label={t("Close summary")}')
replace(idx, 'aria-label="Back to calendar"', 'aria-label={t("Back to calendar")}')
replace(idx, 'aria-label="Previous calendar month"', 'aria-label={t("Previous calendar month")}')
replace(idx, 'aria-label="Next calendar month"', 'aria-label={t("Next calendar month")}')

# SukSuk period chart locale/accessibility
replace_once(idx, 'function SukSukPeriodChart({', 'function SukSukPeriodChart({', required=True)
p=Path(idx); s=p.read_text(encoding='utf-8')
pos=s.find('function SukSukPeriodChart(')
hook=s.find('const { t } = useI18n();', pos)
if hook >= 0:
    s=s[:hook] + 'const { t, language } = useI18n();' + s[hook+len('const { t } = useI18n();'):]
p.write_text(s, encoding='utf-8')
for old,key in [
    ('aria-label="Previous week"','Previous week'),('title="Previous week"','Previous week'),
    ('aria-label="Back to current week"','Back to current week'),('aria-label="Next week"','Next week'),('title="Next week"','Next week'),
    ('aria-label="Back to current month"','Back to current month'),
    ('aria-label="Previous year"','Previous year'),('title="Previous year"','Previous year'),
    ('aria-label="Back to current year"','Back to current year'),('aria-label="Next year"','Next year'),('title="Next year"','Next year'),
]:
    replace(idx, old, f'{old.split("=")[0]}={{t("{key}")}}')
replace(idx, 'title={weekOffset === 0 ? "Current week" : "Back to current week"}', 'title={weekOffset === 0 ? t("Current week") : t("Back to current week")}')
replace(idx, 'title={monthOffset === 0 ? "Current month" : "Back to current month"}', 'title={monthOffset === 0 ? t("Current month") : t("Back to current month")}')
replace(idx, 'title={yearOffset === 0 ? "Current year" : "Back to current year"}', 'title={yearOffset === 0 ? t("Current year") : t("Back to current year")}')
# remaining exact title next/prev month may already be replaced above; translate titles too
replace(idx, 'title="Previous month"', 'title={t("Previous month")}')
replace(idx, 'title="Next month"', 'title={t("Next month")}')
# locale inside this chart only; safe globally for these exact literals
replace(idx, 'toLocaleDateString("en-GB", { day: "numeric" })', 'toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric" })')
replace(idx, 'toLocaleDateString("en-GB", {\n                  day: "numeric",\n                  month: "short",\n                })', 'toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {\n                  day: "numeric",\n                  month: "short",\n                })')
replace(idx, 'selectedMonthAnchor.toLocaleDateString("en-US", {', 'selectedMonthAnchor.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", {')

# DayPreview flow labels
replace(idx, 'return "Spotting";', 'return t("Spotting");')
replace(idx, 'return "Light";', 'return t("Light");')
replace(idx, 'return "Medium";', 'return t("Medium");')
replace(idx, 'return "Heavy";', 'return t("Heavy");')
replace(idx, 'return "Very heavy";', 'return t("Very heavy");')
# empty state
replace(idx, '<p className="text-sm text-muted-foreground">Nothing logged {isToday ? "today" : "this day"} yet.</p>', '<p className="text-sm text-muted-foreground">{isToday ? t("Nothing logged today yet.") : t("Nothing logged this day yet.")}</p>')
replace(idx, 'Tap the <span className="font-bold">+ Log</span> button below.', '{t("Tap the")} <span className="font-bold">+ {t("Log")}</span> {t("button below.")}')
# meds
replace(idx, 'Taken · {actual ?? x.time}', '{t("Taken")} · {actual ?? x.time}')
replace(idx, ' · scheduled {x.time}', ' · {t("scheduled")} {x.time}')
replace(idx, 'Missed · {x.time}', '{t("Missed")} · {x.time}')
replace(idx, 'aria-label="Delete"', 'aria-label={t("Delete")}')
# Pain display
replace(idx, '{PAIN_DESCRIPTIONS[Math.round(p.score)]}', '{t(PAIN_DESCRIPTIONS[Math.round(p.score)])}')
replace(idx, '{p.parts.join(", ")}', '{p.parts.map(t).join(", ")}')
replace(idx, '{p.quality.join(", ")}', '{p.quality.map(t).join(", ")}')
replace(idx, '{p.symptoms.join(", ")}', '{p.symptoms.map(t).join(", ")}')
replace(idx, 'Pressure: {p.pressureTypes?.join(", ")}', '{t("Pressure")}: {p.pressureTypes?.map(t).join(", ")}')
replace(idx, 'Nausea: {p.nauseaTypes?.join(", ")}', '{t("Nausea")}: {p.nauseaTypes?.map(t).join(", ")}')
replace(idx, '" · ongoing"', '` · ${t("ongoing")}`')
replace(idx, '` · triggers: ${p.nauseaTriggers.join(", ")}`', '` · ${t("triggers")}: ${p.nauseaTriggers.map(t).join(", ")}`')
replace(idx, '` · symptoms: ${p.nauseaSymptoms.join(", ")}`', '` · ${t("symptoms")}: ${p.nauseaSymptoms.map(t).join(", ")}`')
replace(idx, '` · relieved by: ${p.nauseaHelped.join(", ")}`', '` · ${t("relieved by")}: ${p.nauseaHelped.map(t).join(", ")}`')
replace(idx, '<Ico e="🥵" size={13} /> Hot flashes intensity {p.hotFlashes}/5', '<Ico e="🥵" size={13} /> {t("Hot flashes intensity")} {p.hotFlashes}/5')
replace(idx, '<Ico e="🤕" size={13} /> Headache: {p.headacheTypes.join(", ")}', '<Ico e="🤕" size={13} /> {t("Headache")}: {p.headacheTypes.map(t).join(", ")}')
replace(idx, '<Ico e="🤕" size={13} /> Headache intensity {p.headacheIntensity}/10', '<Ico e="🤕" size={13} /> {t("Headache intensity")} {p.headacheIntensity}/10')
replace(idx, '<Ico e="💊" size={13} /> Headache med: {p.headacheMed}', '<Ico e="💊" size={13} /> {t("Headache med")}: {p.headacheMed}')
replace(idx, '` at ${p.headacheMedTime}`', '` ${t("at")} ${p.headacheMedTime}`')
replace(idx, 'PCOS: {p.pcosSymptoms.join(", ")}', 'PCOS: {p.pcosSymptoms.map(t).join(", ")}')
replace(idx, 'Mood: <IcoText text={p.mood.join(", ")} size={13} />', '{t("Mood")}: <IcoText text={p.mood.map(t).join(", ")} size={13} />')
replace(idx, '>Stress {p.stress}/10<', '>{t("Stress")} {p.stress}/10<')
replace(idx, '>Battery {p.bodyBattery}/5<', '>{t("Battery")} {p.bodyBattery}/5<')
# Panic/tetany
replace(idx, ' · intensity {p.intensity}/10 · {p.minutes == null ? "ongoing" : `${p.minutes} min`}', ' · {t("intensity")} {p.intensity}/10 · {p.minutes == null ? t("ongoing") : `${p.minutes} min`}')
replace(idx, '>Trigger: {p.trigger}<', '>{t("Trigger")}: {p.trigger}<')
replace(idx, '>Physical: {p.physical.join(", ")}<', '>{t("Physical")}: {p.physical.map(t).join(", ")}<')
replace(idx, '>Cognitive: {p.cognitive.join(", ")}<', '>{t("Cognitive")}: {p.cognitive.map(t).join(", ")}<')
replace(idx, 'Hyperventilation: {p.hyperventilation}', '{t("Hyperventilation")}: {t(p.hyperventilation)}')
replace(idx, '" · tetany present"', '` · ${t("tetany present")}`')
replace(idx, '>Helped: {p.helped.join(", ")}<', '>{t("Helped")}: {p.helped.map(t).join(", ")}<')
replace(idx, '<Ico e="💊" size={13} /> Rescue: {p.rescueMed}', '<Ico e="💊" size={13} /> {t("Rescue")}: {p.rescueMed}')
replace(idx, '{tetanyEntry.types.join(", ") || "Tetany"}', '{tetanyEntry.types.length ? tetanyEntry.types.map(t).join(", ") : t("Tetany")}')
replace(idx, '{tetanyEntry.minutes == null ? "ongoing" : `${tetanyEntry.minutes}min`}', '{tetanyEntry.minutes == null ? t("ongoing") : `${tetanyEntry.minutes}min`}')
replace(idx, '` — ${tetanyEntry.triggers.join(", ")}`', '` — ${tetanyEntry.triggers.map(t).join(", ")}`')
replace(idx, '>Location: {tetanyEntry.location.join(", ")}<', '>{t("Location")}: {tetanyEntry.location.map(t).join(", ")}<')
replace(idx, '>Helped: {tetanyEntry.helped.join(", ")}<', '>{t("Helped")}: {tetanyEntry.helped.map(t).join(", ")}<')
replace(idx, '<Ico e="💊" size={13} /> Rescue: {tetanyEntry.rescueMed}', '<Ico e="💊" size={13} /> {t("Rescue")}: {tetanyEntry.rescueMed}')
# Period
replace(idx, '<p className="text-sm">Flow: {flowLabel(log?.periodInfo?.level ?? log?.period)}</p>', '<p className="text-sm">{t("Flow")}: {flowLabel(log?.periodInfo?.level ?? log?.period)}</p>')
replace(idx, 'Cramp pain:{" "}', '{t("Cramp pain")}:{" "}')
replace(idx, '— {PAIN_DESCRIPTIONS[Math.round(log.periodInfo.cramps)]}', '— {t(PAIN_DESCRIPTIONS[Math.round(log.periodInfo.cramps)])}')
replace(idx, 'Discharge: {log.periodInfo.discharge}', '{t("Discharge")}: {t(log.periodInfo.discharge)}')
# Sex, heat, food
replace(idx, '{String(s.kind).replace(/_/g, " ")}', '{t(String(s.kind).replace(/_/g, " "))}')
replace(idx, '` · painful ${s.painful}`', '` · ${t("painful")} ${t(s.painful)}`')
replace(idx, '{h.ongoing ? "ongoing" : `${h.minutes ?? 0} min`}', '{h.ongoing ? t("ongoing") : `${h.minutes ?? 0} min`}')
replace(idx, '"(histamine flare)"', 't("(histamine flare)")')
replace(idx, '" · high histamine"', '` · ${t("high histamine")}`')
replace(idx, 'Feel: <IcoText text={f.feelings.join(", ")} size={13} />', '{t("Feel")}: <IcoText text={f.feelings.map(t).join(", ")} size={13} />')
replace(idx, 'After: <IcoText text={f.symptomsAfter.join(", ")} size={13} />', '{t("After")}: <IcoText text={f.symptomsAfter.map(t).join(", ")} size={13} />')
replace(idx, '<Ico e="🔥" size={13} /> Histamine flare', '<Ico e="🔥" size={13} /> {t("Histamine flare")}')
# Workout/vitals
replace(idx, 'w.magnesiumBefore ? "Mg before" : null', 'w.magnesiumBefore ? t("Mg before") : null')
replace(idx, '${ex.name || "Exercise"}', '${ex.name || t("Exercise")}')
replace(idx, '>Weight after: {w.weightKg} kg<', '>{t("Weight after")}: {w.weightKg} kg<')
replace(idx, '<Ico e="⚠️" size={13} /> Triggered: {w.triggeredSymptom.label ?? w.triggeredSymptom.type}', '<Ico e="⚠️" size={13} /> {t("Triggered")}: {t(w.triggeredSymptom.label ?? w.triggeredSymptom.type)}')
replace(idx, '>Temperature: {log.temperature}°C<', '>{t("Temperature")}: {log.temperature}°C<')
replace(idx, '>Weight: {log.weight} kg<', '>{t("Weight")}: {log.weight} kg<')
replace(idx, 'Sleep: {log.sleepHours} h', '{t("Sleep")}: {log.sleepHours} h')
replace(idx, 'Sleep quality: <IcoText text={asArr(log.sleepQuality).join(", ")} size={14} />', '{t("Sleep quality")}: <IcoText text={asArr(log.sleepQuality).map(t).join(", ")} size={14} />')
# DeleteBtn
ensure_hook(idx, 'DeleteBtn')
replace(idx, 'aria-label="Delete"', 'aria-label={t("Delete")}')

# ---------- i18n keys ----------
i18n=Path('src/lib/i18n.ts')
s=i18n.read_text(encoding='utf-8')
keys={
'Hi':'Ahoj','there':'tam','Open today\'s summary':'Otvoriť dnešný súhrn','Previous month':'Predchádzajúci mesiac','Next month':'Nasledujúci mesiac','Close summary':'Zavrieť súhrn','Back to calendar':'Späť na kalendár','Previous calendar month':'Predchádzajúci mesiac kalendára','Next calendar month':'Nasledujúci mesiac kalendára','Previous week':'Predchádzajúci týždeň','Next week':'Nasledujúci týždeň','Back to current week':'Späť na aktuálny týždeň','Current week':'Aktuálny týždeň','Back to current month':'Späť na aktuálny mesiac','Current month':'Aktuálny mesiac','Previous year':'Predchádzajúci rok','Next year':'Nasledujúci rok','Back to current year':'Späť na aktuálny rok','Current year':'Aktuálny rok','Very heavy':'Veľmi silné','Nothing logged today yet.':'Dnes ešte nie je nič zaznamenané.','Nothing logged this day yet.':'V tento deň ešte nie je nič zaznamenané.','Tap the':'Ťukni na','button below.':'tlačidlo nižšie.','Pressure':'Tlak','triggers':'spúšťače','symptoms':'príznaky','relieved by':'zmiernilo','Hot flashes intensity':'Intenzita návalov tepla','Headache med':'Liek na bolesť hlavy','at':'o','Battery':'Energia','Hyperventilation':'Hyperventilácia','tetany present':'prítomná tetánia','Rescue':'Záchranný liek','Tetany':'Tetánia','Flow':'Krvácanie','Cramp pain':'Bolesť pri kŕčoch','Discharge':'Výtok','painful':'bolestivé','(histamine flare)':'(histamínová reakcia)','high histamine':'vysoký histamín','Feel':'Pocit','After':'Po','Mg before':'Mg pred','Weight after':'Hmotnosť po','Triggered':'Vyvolané','Temperature':'Teplota','Sleep quality':'Kvalita spánku','Bump':'Bruško','Bump full size':'Bruško v plnej veľkosti'
}
pos=s.rfind('\n};')
if pos<0: raise RuntimeError('SK dictionary end not found')
entries=''
for k,v in keys.items():
    if f'  "{k}":' not in s:
        kk=k.replace('\\','\\\\').replace('"','\\"')
        vv=v.replace('\\','\\\\').replace('"','\\"')
        entries += f'  "{kk}": "{vv}",\n'
if entries:
    s=s[:pos]+'\n'+entries+s[pos:]
i18n.write_text(s, encoding='utf-8')

print('Final i18n cleanup applied')
