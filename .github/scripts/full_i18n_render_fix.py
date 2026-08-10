from pathlib import Path
import re

REPO = Path('.')

# ---------- shared helper injection ----------
TR_HELPER = r'''
function TrText({ value }: { value: unknown }) {
  const { t, language } = useI18n();
  const raw = String(value ?? "");
  const exact = t(raw);
  if (exact !== raw) return <>{exact}</>;
  if (language !== "sk") return <>{raw}</>;

  let out = raw;
  const exactSk: Record<string, string> = {
    Before: "Pred",
    During: "Počas",
    After: "Po",
    "Very-Heavy": "Veľmi silná",
    "Very heavy": "Veľmi silná",
    Heavy: "Silná",
    Medium: "Stredná",
    Light: "Slabá",
    Spotting: "Špinenie",
    "Overall improvement": "Celkové zlepšenie",
    "Overall worsening": "Celkové zhoršenie",
    "No clear change": "Bez jasnej zmeny",
    "High caffeine (≥200 mg)": "Vysoký príjem kofeínu (≥200 mg)",
    "Tetany episode": "Tetánická epizóda",
    "Hot flash": "Nával tepla",
    "Low energy": "Nízka energia",
    Headache: "Bolesť hlavy",
    "Daily adherence": "Denné dodržiavanie",
    doses: "dávok",
    "logged days": "zaznamenaných dní",
  };
  if (exactSk[out]) return <>{exactSk[out]}</>;

  out = out
    .replace(/^Panic attacks:/, "Panické záchvaty:")
    .replace(/^Medication adherence:/, "Dodržiavanie liekov:")
    .replace(/^Workouts:/, "Cvičenia:")
    .replace(/^Pain: improved/, "Bolesť: zlepšenie")
    .replace(/^Pain: worsened/, "Bolesť: zhoršenie")
    .replace(/^(\d+) logged days$/, "$1 zaznamenaných dní")
    .replace(/^Based on (\d+) logged days in (.+)$/i, "Na základe $1 zaznamenaných dní v $2")
    .replace(/^Based on (\d+) days before and (\d+) days after$/i, "Na základe $1 dní pred a $2 dní po")
    .replace(/^(\d+) before · (\d+) after$/, "$1 pred · $2 po")
    .replace(/^0× in this month$/, "0× v tomto mesiaci")
    .replace(/^(\d+)× in this month$/, "$1× v tomto mesiaci")
    .replace(/^The outcome was (.+) percentage points more common on days with this trigger\.$/, "Výsledok bol o $1 percentuálnych bodov častejší v dňoch s týmto spúšťačom.")
    .replace(/^Based on (\d+) days with and (\d+) days without the trigger\.$/, "Na základe $1 dní so spúšťačom a $2 dní bez spúšťača.")
    .replace(/^Correlations show associations in your logs\. They do not prove that one factor caused another\.$/, "Korelácie ukazujú súvislosti v tvojich záznamoch. Nedokazujú, že jeden faktor spôsobil druhý.")
    .replace(/^This shows an association in your logs, not proof that the selected trigger caused the outcome\.$/, "Toto ukazuje súvislosť v tvojich záznamoch, nie dôkaz, že vybraný spúšťač spôsobil výsledok.")
    .replace(/^Compare how often an outcome occurred on days with and without a possible trigger\.$/, "Porovnaj, ako často sa výsledok objavil v dňoch s možným spúšťačom a bez neho.")
    .replace(/^Automatically ranked associations calculated only from your own logs\.$/, "Automaticky zoradené súvislosti vypočítané iba z tvojich vlastných záznamov.");

  if (out.includes(" → ")) {
    const [a, b] = out.split(" → ");
    return <>{t(a)} → {t(b)}</>;
  }

  return <>{out}</>;
}
'''

def ensure_tr_helper(path: Path):
    s = path.read_text()
    if 'function TrText({ value }' in s:
        return s
    # insert before first route export / major declaration
    idx = s.find('export const Route')
    if idx < 0:
        idx = s.find('type ')
    if idx < 0:
        raise RuntimeError(f'Could not place TrText in {path}')
    return s[:idx] + TR_HELPER + '\n' + s[idx:]


def wrap_static(s: str, texts: list[str]) -> str:
    for text in sorted(texts, key=len, reverse=True):
        pat = re.compile(r'>\s*' + re.escape(text) + r'\s*<')
        s = pat.sub('><TrText value=' + repr(text).replace("'", '"') + ' /><', s)
    return s

# ---------- LogSheet ----------
p = REPO / 'src/components/LogSheet.tsx'
s = ensure_tr_helper(p)
# category labels/hints and accessibility
s = s.replace('{c.label}', '<TrText value={c.label} />')
s = s.replace('{c.hint}', '<TrText value={c.hint} />')
s = s.replace('aria-label={editingOrder ? `Drag ${c.label} to reorder` : `Log ${c.label}`}',
              'aria-label={editingOrder ? `${t("Drag")} ${t(c.label)} ${t("to reorder")}` : `${t("Log")} ${t(c.label)}`}')
# translate common dynamic option renderers centrally
for name in ['label','option','opt','symptom','trigger','location','helped','kind','feeling','mood']:
    s = re.sub(r'>\s*\{' + name + r'\}\s*<', '><TrText value={' + name + '} /><', s)
# known direct text nodes inside forms
log_static = [
    'Pain','Bowel','Workout','Food','Meds','Event','Task','Notes','Period','Sleep','Weight','Temperature',
    'Body part','Pain quality','Other symptoms','PCOS symptoms','Histamine symptoms','Urinary symptoms',
    'Bristol type','Feelings','Bowel symptoms','Did you go today?','No bowel movement','Workout type',
    'Distance','Elevation','Exercises','Add exercise','Sets','Reps','Extra meds','Scheduled dose','Logging mode',
    'Mark scheduled dose as taken','Extra dose (one-off)','Heat','Cold','TENS','Duration','Intensity','Flow',
    'Discharge','Cramp pain','Sexual activity','Protection','Food symptoms after','Histamine flare','Sleep quality',
    'Body battery','Temperature / Sleep / Weight','Add custom','Other symptoms','Save','Cancel','Back','Next'
]
s = wrap_static(s, log_static)
p.write_text(s)

# ---------- Patterns ----------
p = REPO / 'src/routes/patterns.tsx'
s = ensure_tr_helper(p)
# generic title/subtitle/label/value render points
for name in ['title','subtitle','label','value','description']:
    s = re.sub(r'>\s*\{' + name + r'\}\s*<', '><TrText value={' + name + '} /><', s)
patterns_static = [
    'Average number of negative mood tags logged per day.',
    'Average body-battery or energy score.',
    'Average hot-flash intensity.',
    'Average logged pressure intensity in each cycle phase.',
    'Mood, energy, hot flashes and bowel symptoms grouped by cycle phase.',
    'Based on 6 historic cycles','Best energy','Most negative mood','Most hot flashes','Most common flow',
    'Compare the four weeks before treatment with the first four weeks after its start.',
    'Started','Logged data','Overall','Strongest change','Medication','Result','Before','After',
    'Automatically ranked associations calculated only from your own logs.',
    'Correlations show associations in your logs. They do not prove that one factor caused another.',
    'Compare how often an outcome occurred on days with and without a possible trigger.',
    'POSSIBLE TRIGGER','COMPARE WITH OUTCOME','With trigger','Without trigger','logged days',
    'This shows an association in your logs, not proof that the selected trigger caused the outcome.',
    'MOST IMPROVED','NEEDS ATTENTION','MOST STABLE','DAILY ADHERENCE','Month','doses',
]
s = wrap_static(s, patterns_static)
# common dynamic summary values shown directly
for expr in ['monthlySummary.improved','monthlySummary.attention','monthlySummary.stable','confidence.detail','phaseSummary.highestPain','phaseSummary.bestEnergy','phaseSummary.mostNegativeMood','phaseSummary.mostHotFlashes','phaseSummary.flow']:
    s = s.replace('{' + expr + '}', '<TrText value={' + expr + '} />')
p.write_text(s)

# ---------- Insights ----------
p = REPO / 'src/routes/insights.tsx'
s = ensure_tr_helper(p)
# heatmap labels/month/day names
s = s.replace('{MON_SHORT3[m]}', '<TrText value={MON_SHORT3[m]} />')
s = s.replace('{WD_SHORT[d]}', '<TrText value={WD_SHORT[d]} />')
s = s.replace('{MON_SHORT3[monthIndex]}', '<TrText value={MON_SHORT3[monthIndex]} />')
s = wrap_static(s, [
    'Choose a metric, then tap a coloured day for its saved average/details.',
    'Low','Mild','Moderate','High','Severe','No data','DAILY ADHERENCE','doses','Month',
    'Per medication','As-needed (frequency)','Time of Day Pattern'
])
# common legend/value vars
for name in ['label','monthLabel','periodLabel']:
    s = re.sub(r'>\s*\{' + name + r'\}\s*<', '><TrText value={' + name + '} /><', s)
# localize date helpers
s = s.replace('toLocaleDateString("en-US"', 'toLocaleDateString(language === "sk" ? "sk-SK" : "en-US"')
p.write_text(s)

# ---------- Profile / Backup ----------
p = REPO / 'src/routes/profile.tsx'
s = ensure_tr_helper(p)
profile_static = [
    'Available from','Restore safety copy','Create safety copy now','Back up now','Restore backup','Export JSON',
    'Download local data','Automatic backup','Emergency safety copy','Backup actions','Data & storage',
    'Cloud backup','Last cloud backup','Never','Local data','Restore from file','Export CSV','Export health data'
]
s = wrap_static(s, profile_static)
# translate values rendered by summary primitives
s = s.replace('{value || "—"}', '<TrText value={value || "—"} />')
s = s.replace('{value}', '<TrText value={value} />')
# localize profile dates
s = s.replace('return date.toLocaleDateString("en-GB", {', 'return date.toLocaleDateString(navigator.language?.startsWith("sk") ? "sk-SK" : "en-GB", {')
p.write_text(s)

# ---------- Slovak dictionary ----------
p = REPO / 'src/lib/i18n.ts'
s = p.read_text()
translations = {
    'Postpartum symptoms':'Popôrodné príznaky','Recovery symptoms · notes':'Príznaky zotavovania · poznámky',
    '0–10, body, quality':'0–10, miesto, charakter','Blueberry':'Menštruácia','Flow · discharge · notes':'Krvácanie · výtok · poznámky',
    'Heat / Cold / TENS':'Teplo / Chlad / TENS','Heating, ice or TENS session':'Nahrievanie, chladenie alebo TENS',
    'What & how you feel':'Čo si jedla a ako sa cítiš','Bristol type':'Bristolský typ','All kinds of activity':'Všetky druhy aktivity',
    'Type · duration · weight':'Typ · trvanie · hmotnosť','Temp / Sleep / Weight':'Teplota / Spánok / Hmotnosť',
    '°C · kg · hours':'°C · kg · hodiny','Taken · extra dose':'Užité · extra dávka','Event':'Udalosť',
    'Multi-day · time · note':'Viacdňová · čas · poznámka','Task':'Úloha','To-do with date & time':'Úloha s dátumom a časom',
    'Any thought for today':'Čokoľvek o dnešku','Drag':'Presuň','to reorder':'pre zmenu poradia',
    'Body part':'Miesto bolesti','Pain quality':'Charakter bolesti','Other symptoms':'Ďalšie príznaky','Urinary symptoms':'Močové príznaky',
    'Feelings':'Pocity','Bowel symptoms':'Črevné príznaky','Did you go today?':'Bola dnes stolica?','Workout type':'Typ cvičenia',
    'Distance':'Vzdialenosť','Elevation':'Prevýšenie','Exercises':'Cviky','Add exercise':'Pridať cvik','Scheduled dose':'Naplánovaná dávka',
    'Logging mode':'Režim záznamu','Mark scheduled dose as taken':'Označiť naplánovanú dávku ako užitú','Intensity':'Intenzita',
    'Flow':'Krvácanie','Discharge':'Výtok','Cramp pain':'Kŕče','Sexual activity':'Sexuálna aktivita','Protection':'Ochrana',
    'Food symptoms after':'Príznaky po jedle','Histamine flare':'Histamínová reakcia','Sleep quality':'Kvalita spánku','Body battery':'Energia tela',
    'Temperature / Sleep / Weight':'Teplota / Spánok / Hmotnosť','Add custom':'Pridať vlastné','Next':'Ďalej',
    'Average number of negative mood tags logged per day.':'Priemerný počet negatívnych nálad zaznamenaných za deň.',
    'Average body-battery or energy score.':'Priemerné skóre energie.',
    'Average hot-flash intensity.':'Priemerná intenzita návalov tepla.',
    'Average logged pressure intensity in each cycle phase.':'Priemerná zaznamenaná intenzita tlaku v každej fáze cyklu.',
    'Mood, energy, hot flashes and bowel symptoms grouped by cycle phase.':'Nálada, energia, návaly tepla a črevné príznaky podľa fázy cyklu.',
    'Based on 6 historic cycles':'Na základe 6 predchádzajúcich cyklov','Best energy':'Najlepšia energia',
    'Most negative mood':'Najviac negatívnej nálady','Most hot flashes':'Najviac návalov tepla','Most common flow':'Najčastejšie krvácanie',
    'Before':'Pred','During':'Počas','After':'Po','Very-Heavy':'Veľmi silná','Very heavy':'Veľmi silná','Heavy':'Silná','Medium':'Stredná','Light':'Slabá','Spotting':'Špinenie',
    'Compare the four weeks before treatment with the first four weeks after its start.':'Porovnaj štyri týždne pred liečbou s prvými štyrmi týždňami po jej začiatku.',
    'Started':'Začiatok','Logged data':'Zaznamenané údaje','Overall':'Celkovo','Strongest change':'Najväčšia zmena','Result':'Výsledok',
    'Overall improvement':'Celkové zlepšenie','Overall worsening':'Celkové zhoršenie','No clear change':'Bez jasnej zmeny',
    'Automatically ranked associations calculated only from your own logs.':'Automaticky zoradené súvislosti vypočítané iba z tvojich vlastných záznamov.',
    'Correlations show associations in your logs. They do not prove that one factor caused another.':'Korelácie ukazujú súvislosti v tvojich záznamoch. Nedokazujú, že jeden faktor spôsobil druhý.',
    'Compare how often an outcome occurred on days with and without a possible trigger.':'Porovnaj, ako často sa výsledok objavil v dňoch s možným spúšťačom a bez neho.',
    'POSSIBLE TRIGGER':'MOŽNÝ SPÚŠŤAČ','COMPARE WITH OUTCOME':'POROVNAŤ S VÝSLEDKOM','With trigger':'So spúšťačom','Without trigger':'Bez spúšťača',
    'logged days':'zaznamenaných dní','This shows an association in your logs, not proof that the selected trigger caused the outcome.':'Toto ukazuje súvislosť v tvojich záznamoch, nie dôkaz, že vybraný spúšťač spôsobil výsledok.',
    'MOST IMPROVED':'NAJVÄČŠIE ZLEPŠENIE','NEEDS ATTENTION':'VYŽADUJE POZORNOSŤ','MOST STABLE':'NAJSTABILNEJŠIE','DAILY ADHERENCE':'DENNÉ DODRŽIAVANIE',
    'doses':'dávok','Choose a metric, then tap a coloured day for its saved average/details.':'Vyber metriku a potom ťukni na farebný deň pre uložený priemer alebo detaily.',
    'Low':'Nízka','Mild':'Mierna','Moderate':'Stredná','High':'Vysoká','Severe':'Veľmi vysoká',
    'Jan':'Jan','Feb':'Feb','Mar':'Mar','Apr':'Apr','May':'Máj','Jun':'Jún','Jul':'Júl','Aug':'Aug','Sep':'Sep','Oct':'Okt','Nov':'Nov','Dec':'Dec',
    'Mon':'Pon','Tue':'Uto','Wed':'Str','Thu':'Štv','Fri':'Pia','Sat':'Sob','Sun':'Ned',
    'Available from':'Dostupná od','Restore safety copy':'Obnoviť bezpečnostnú kópiu','Create safety copy now':'Vytvoriť bezpečnostnú kópiu teraz',
    'Back up now':'Zálohovať teraz','Restore backup':'Obnoviť zálohu','Download local data':'Stiahnuť lokálne dáta',
    'Automatic backup':'Automatická záloha','Emergency safety copy':'Núdzová bezpečnostná kópia','Backup actions':'Akcie zálohy','Data & storage':'Dáta a úložisko',
    'Cloud backup':'Cloudová záloha','Last cloud backup':'Posledná cloudová záloha','Never':'Nikdy','Local data':'Lokálne dáta','Restore from file':'Obnoviť zo súboru','Export CSV':'Exportovať CSV','Export health data':'Exportovať zdravotné dáta',
    'High caffeine (≥200 mg)':'Vysoký príjem kofeínu (≥200 mg)','Hot flash':'Nával tepla','Low energy':'Nízka energia',
}
start = s.find('const SK:')
end = s.find('\n};\n\nconst TRANSLATIONS', start)
if start < 0 or end < 0:
    raise RuntimeError('SK dictionary bounds not found')
block = s[start:end]
lines=[]
for k,v in translations.items():
    if re.search(r'^\s*' + re.escape(repr(k)) + r'\s*:', block, flags=re.M) or f'  "{k}":' in block:
        continue
    kk = k.replace('\\','\\\\').replace('"','\\"')
    vv = v.replace('\\','\\\\').replace('"','\\"')
    lines.append(f'  "{kk}": "{vv}",')
if lines:
    s = s[:end] + '\n' + '\n'.join(lines) + s[end:]
p.write_text(s)

print('Full i18n render patch applied')
