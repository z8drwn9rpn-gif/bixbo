from pathlib import Path

src = Path('.github/scripts/profile_notifications_i18n_fix.py').read_text()
old = "match = re.search(r'\\n};\\n\\nexport ', s[sk_start:])"
new = "match = re.search(r'\\n};\\n\\nconst TRANSLATIONS', s[sk_start:])"
if old not in src:
    raise RuntimeError('Expected dictionary boundary matcher not found')
src = src.replace(old, new, 1)
exec(compile(src, '.github/scripts/profile_notifications_i18n_fix.py', 'exec'))
