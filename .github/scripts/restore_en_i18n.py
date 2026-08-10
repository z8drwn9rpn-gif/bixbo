from pathlib import Path

p = Path('src/lib/i18n.ts')
s = p.read_text()
old = '''const EN: Record<string, string> = {
};'''
new = '''const EN: Record<string, string> = {
  "nav.home": "Home",
  "nav.overview": "Overview",
  "nav.log": "Log",
  "nav.couple": "Couple",
  "nav.note": "Note",
  "nav.patterns": "Patterns",
  "nav.medications": "Medications",
  "nav.healthProfile": "Health profile",
  "nav.settings": "Settings",
  "profile.language.title": "Language",
  "profile.language.subtitle": "Choose the language used by the BIXBO interface.",
  "profile.language.appLanguage": "App language",
  "profile.language.english": "English",
  "profile.language.slovak": "Slovenčina",
  "profile.hub.languageTitle": "Language",
  "profile.hub.languageSubtitle": "App language",
};'''
if old not in s:
    raise RuntimeError('Expected empty EN map not found')
p.write_text(s.replace(old, new, 1))
