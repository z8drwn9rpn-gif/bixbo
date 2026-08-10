from pathlib import Path
import re


def replace(path: str, pairs: list[tuple[str, str]]) -> None:
    p = Path(path)
    s = p.read_text()
    for old, new in pairs:
        if old in s:
            s = s.replace(old, new)
    p.write_text(s)

# ---------------- Profile ----------------
profile = Path('src/routes/profile.tsx')
s = profile.read_text()

# Health hub: fully localized visible text and direct Notifications navigation.
s = s.replace('function HealthHub({ onHome, onOpen }: { onHome: () => void; onOpen: (view: HealthView) => void }) {',
'''function HealthHub({
  onHome,
  onOpen,
  onNotifications,
}: {
  onHome: () => void;
  onOpen: (view: HealthView) => void;
  onNotifications: () => void;
}) {''')
s = s.replace('''          Health\n        </button>''', '''          {t("Health")}\n        </button>''')
s = s.replace('''              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">\n                Your health profile, journey, milestones and app preferences.\n              </p>''',
'''              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">\n                {t("Your health profile, journey, milestones and app preferences.")}\n              </p>''')
s = s.replace('''            Preferences\n          </p>''', '''            {t("Preferences")}\n          </p>''')
s = s.replace('''              title="Medications & Reminders"\n              subtitle="Medication schedule, reminders and notification settings"\n              onClick={() => onOpen("reminders")}''',
'''              title="Notifications"\n              subtitle="All notification and reminder settings in one place"\n              onClick={onNotifications}''')
s = s.replace('''        onOpen={(next) => {\n          setEditing(false);\n          setHealthView(next);\n        }}\n      />''',
'''        onOpen={(next) => {\n          setEditing(false);\n          setHealthView(next);\n        }}\n        onNotifications={() => navigate({ to: "/notifications" as never })}\n      />''')

# Tag field placeholders/accessibility.
s = s.replace('placeholder={placeholder ?? "Type and press Add…"}', 'placeholder={t(placeholder ?? "Type and press Add…")}')
s = s.replace('aria-label={`Remove ${v}`}', 'aria-label={`${t("Remove")} ${v}`}')

# Statistics and achievements render translated labels/statuses.
s = s.replace('<p className="mt-1 text-xs font-semibold text-foreground">{item.label}</p>', '<p className="mt-1 text-xs font-semibold text-foreground">{t(item.label)}</p>')
s = s.replace('{unlocked ? "Unlocked" : `${Math.max(0, item.goal - item.value)} to go`}', '{unlocked ? t("Unlocked") : `${Math.max(0, item.goal - item.value)} ${t("to go")}`}')
s = s.replace('<span className="text-sm text-foreground">{label}</span>', '<span className="text-sm text-foreground">{t(label)}</span>')
s = s.replace('trackingDays ? `${trackingDays} days` : "—"', 'trackingDays ? `${trackingDays} ${t("days")}` : "—"')

# Journey direct labels/titles.
s = s.replace('<p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>', '<p className="mt-1 text-sm font-semibold text-foreground">{t(item.title)}</p>')
s = s.replace('<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">\n                    {item.date}\n                  </p>', '<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">\n                    {t(item.date)}\n                  </p>')

# Privacy direct explanatory copy.
s = s.replace('''          <p className="text-xs leading-relaxed text-muted-foreground">\n            Sign-in opens the configured OAuth provider directly. If a provider is not enabled in Supabase, BIXBO will show the provider error here.\n          </p>''',
'''          <p className="text-xs leading-relaxed text-muted-foreground">\n            {t("Sign-in opens the configured OAuth provider directly. If a provider is not enabled in Supabase, BIXBO will show the provider error here.")}\n          </p>''')

# Backup direct buttons and explanatory copy.
for old, key in [
    ('>Create safety copy now</button>', 'Create safety copy now'),
    ('>Back up now</button>', 'Back up now'),
    ('>Restore backup</span>', 'Restore backup'),
    ('>Export JSON</button>', 'Export JSON'),
    ('>Download local data</button>', 'Download local data'),
]:
    s = s.replace(old, f'>{{t("{key}")}}</' + ('span>' if old.endswith('</span>') else 'button>'))
s = s.replace('''          <p className="text-xs leading-relaxed text-muted-foreground">\n            Export JSON downloads a complete copy of the data currently stored by BIXBO on this device.\n          </p>''',
'''          <p className="text-xs leading-relaxed text-muted-foreground">\n            {t("Export JSON downloads a complete copy of the data currently stored by BIXBO on this device.")}\n          </p>''')

# Tracking option labels.
s = s.replace('<span className="block text-sm font-semibold">{option.label}</span>', '<span className="block text-sm font-semibold">{t(option.label)}</span>')
s = s.replace('''                  >\n                    {option.label}\n                  </button>''', '''                  >\n                    {t(option.label)}\n                  </button>''')

# Old reminders subpage remains for compatibility but is fully localized if reached programmatically.
s = s.replace('>Manage medications & times</Link>', '>{t("Manage medications & times")}</Link>')
s = s.replace('>Open notification controls</Link>', '>{t("Open notification controls")}</Link>')

profile.write_text(s)

# ---------------- Notifications: one complete page, all visible copy translated ----------------
notif = Path('src/routes/notifications.tsx')
s = notif.read_text()
s = s.replace('''        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground">\n          <ChevronLeft className="h-4 w-4" /> {t("Settings")}\n        </Link>''',
'''        <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground">\n          <ChevronLeft className="h-4 w-4" /> {t("Health")}\n        </Link>''')
s = s.replace('''              <BellOff className="h-4 w-4" /> This browser doesn't support Web Push.''', '''              <BellOff className="h-4 w-4" /> {t("This browser doesn't support Web Push.")}''')
s = s.replace('''            <p className="text-xs text-destructive">\n              Notifications are blocked in your browser settings. Re-allow them for this site before enabling reminders.\n            </p>''',
'''            <p className="text-xs text-destructive">\n              {t("Notifications are blocked in your browser settings. Re-allow them for this site before enabling reminders.")}\n            </p>''')
s = s.replace('''          <p className="text-xs text-muted-foreground">\n            When BIXBO is open, local reminder checks can also appear as a soft in-app message.\n          </p>''',
'''          <p className="text-xs text-muted-foreground">\n            {t("When BIXBO is open, local reminder checks can also appear as a soft in-app message.")}\n          </p>''')
s = s.replace('''              Check local reminders\n            </button>''', '''              {t("Check local reminders")}\n            </button>''')
s = s.replace('''          <p className="text-xs text-muted-foreground">\n            For the real test, install BIXBO to the Home Screen on iPhone, close it completely, then tap the button\n            before closing.\n          </p>''',
'''          <p className="text-xs text-muted-foreground">\n            {t("For the real test, install BIXBO to the Home Screen on iPhone, close it completely, then tap the button before closing.")}\n          </p>''')
notif.write_text(s)

# ---------------- i18n ----------------
i18n = Path('src/lib/i18n.ts')
s = i18n.read_text()

translations = {
    'Your health profile, journey, milestones and app preferences.': 'Tvoj zdravotný profil, cesta, míľniky a nastavenia aplikácie.',
    'Preferences': 'NASTAVENIA',
    'Notifications': 'Notifikácie',
    'All notification and reminder settings in one place': 'Všetky notifikácie a pripomienky na jednom mieste',
    'Type and press Add…': 'Napíš a stlač Pridať…',
    'Unlocked': 'Odomknuté',
    'to go': 'zostáva',
    'days': 'dní',
    'Started tracking with BIXBO': 'Začiatok sledovania v BIXBO',
    'Health profile': 'Zdravotný profil',
    'saved condition': 'uložená diagnóza',
    'saved conditions': 'uložené diagnózy',
    'Current': 'Aktuálne',
    'Pregnancy mode active': 'Režim tehotenstva je aktívny',
    'Postpartum mode active': 'Popôrodný režim je aktívny',
    'Continuing your health journey': 'Pokračovanie tvojej zdravotnej cesty',
    'Pain logs': 'Záznamy bolesti',
    'Days tracked': 'Sledované dni',
    'Sleep logs': 'Záznamy spánku',
    'Tetany logs': 'Záznamy tetánie',
    'Bowel logs': 'Záznamy stolice',
    'Tracking for': 'Sledovanie trvá',
    'Days with logs': 'Dni so záznamami',
    'Active medications': 'Aktívne lieky',
    'Saved conditions': 'Uložené diagnózy',
    'Sign-in opens the configured OAuth provider directly. If a provider is not enabled in Supabase, BIXBO will show the provider error here.': 'Prihlásenie otvorí nastaveného poskytovateľa účtu. Ak poskytovateľ nie je v Supabase povolený, BIXBO tu zobrazí chybu.',
    'Create safety copy now': 'Vytvoriť bezpečnostnú kópiu',
    'Back up now': 'Zálohovať teraz',
    'Restore backup': 'Obnoviť zálohu',
    'Export JSON': 'Exportovať JSON',
    'Download local data': 'Stiahnuť lokálne dáta',
    'Export JSON downloads a complete copy of the data currently stored by BIXBO on this device.': 'Export JSON stiahne úplnú kópiu dát, ktoré má BIXBO aktuálne uložené v tomto zariadení.',
    'Whole numbers': 'Celé čísla',
    'Half steps': 'Polovičné kroky',
    'Kilograms (kg)': 'Kilogramy (kg)',
    'Pounds (lb)': 'Libry (lb)',
    'Celsius (°C)': 'Celzius (°C)',
    'Fahrenheit (°F)': 'Fahrenheit (°F)',
    'Millilitres (ml)': 'Mililitre (ml)',
    'Fluid ounces (oz)': 'Tekuté unce (oz)',
    '24-hour': '24-hodinový',
    '12-hour': '12-hodinový',
    'Manage medications & times': 'Spravovať lieky a časy',
    'Open notification controls': 'Otvoriť nastavenia notifikácií',
    'This browser doesn\'t support Web Push.': 'Tento prehliadač nepodporuje Web Push.',
    'Notifications are blocked in your browser settings. Re-allow them for this site before enabling reminders.': 'Notifikácie sú zablokované v nastaveniach prehliadača. Pred zapnutím pripomienok ich pre BIXBO znova povoľ.',
    'When BIXBO is open, local reminder checks can also appear as a soft in-app message.': 'Keď je BIXBO otvorené, lokálne pripomienky sa môžu zobraziť aj ako jemná správa v aplikácii.',
    'Check local reminders': 'Skontrolovať lokálne pripomienky',
    'For the real test, install BIXBO to the Home Screen on iPhone, close it completely, then tap the button before closing.': 'Pre reálny test pridaj BIXBO na plochu iPhonu, úplne ho zavri a pred zatvorením ťukni na testovacie tlačidlo.',
    'Push notifications': 'Push notifikácie',
    'Reminders arrive even when BIXBO is fully closed.': 'Pripomienky prídu aj vtedy, keď je BIXBO úplne zatvorené.',
    'Checking your account…': 'Kontrolujem účet…',
    'Sign in to enable reminders when BIXBO is fully closed.': 'Prihlás sa, aby pripomienky fungovali aj pri úplne zatvorenom BIXBO.',
    'All reminders': 'Všetky pripomienky',
    'Master switch for every category below.': 'Hlavný prepínač pre všetky kategórie nižšie.',
    'Enabling…': 'Zapínam…',
    'Enable notifications': 'Zapnúť notifikácie',
    'Categories': 'Kategórie',
    'Pick exactly what you want to hear about.': 'Vyber presne, na čo ťa má BIXBO upozorňovať.',
    'Times': 'Časy',
    'When the daily nudges are sent.': 'Časy denných pripomienok.',
    'Symptom reminder': 'Pripomienka príznakov',
    'Daily log reminder': 'Pripomienka denného záznamu',
    'Mood check-in': 'Kontrola nálady',
    'Hydration from': 'Hydratácia od',
    'Hydration until': 'Hydratácia do',
    'Hydration every (hours)': 'Hydratácia každých (hodín)',
    'Quiet hours': 'Tichý režim',
    'Only medication reminders are allowed to break quiet hours.': 'Počas tichého režimu môžu prísť iba pripomienky liekov.',
    'Nothing else is sent between these times.': 'Medzi týmito časmi sa neposielajú žiadne iné pripomienky.',
    'Start': 'Začiatok',
    'End': 'Koniec',
    'Tests': 'Testy',
    'Local and server-originated tests are separate.': 'Lokálny a serverový test sú oddelené.',
    'Loading your preferences…': 'Načítavam tvoje nastavenia…',
    'At every scheduled medication time you haven\'t ticked off.': 'Pri každom naplánovanom čase lieku, ktorý ešte nie je označený ako užitý.',
    'The day before your predicted period.': 'Deň pred predpokladanou menštruáciou.',
    'The day before your predicted ovulation window.': 'Deň pred predpokladaným ovulačným obdobím.',
    'Only when nothing is logged that day — once daily.': 'Iba ak v daný deň nie je nič zaznamenané — raz denne.',
    'A gentle "how are you feeling?" nudge.': 'Jemná pripomienka „ako sa cítiš?“.',
    '24 hours and 2 hours before an appointment.': '24 hodín a 2 hodiny pred termínom.',
    'An evening mood check-in.': 'Večerná kontrola nálady.',
    'Friendly water reminders during the day.': 'Jemné pripomienky pitného režimu počas dňa.',
    'Occasional BIXBO news and tips. Off by default.': 'Občasné novinky a tipy BIXBO. Predvolene vypnuté.',
}

# Add missing SK keys only inside SK object; preserve existing translations.
sk_start = s.index('const SK: Record<string, string> = {')
# SK ends at the object close before exported helpers.
match = re.search(r'\n};\n\nexport ', s[sk_start:])
if not match:
    raise RuntimeError('Could not locate end of SK dictionary')
sk_end = sk_start + match.start()
block = s[sk_start:sk_end]
new_lines = []
for key, value in translations.items():
    needle = f'  {key!r}:'
    # TS uses JSON-style double quoted keys, so check escaped double form too.
    import json
    key_json = json.dumps(key, ensure_ascii=False)
    if f'  {key_json}:' not in block:
        new_lines.append(f'  {key_json}: {json.dumps(value, ensure_ascii=False)},')
if new_lines:
    s = s[:sk_end] + '\n' + '\n'.join(new_lines) + s[sk_end:]
i18n.write_text(s)
