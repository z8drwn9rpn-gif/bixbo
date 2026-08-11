from pathlib import Path

p = Path('src/routes/profile.tsx')
s = p.read_text()
old = '''          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">\n            {t("Health Hub")}\n          </p>\n          <p className="-mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">\n          {t("Health Hub")}\n        </p>\n\n        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">'''
new = '''          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">\n            {t("Health Hub")}\n          </p>\n\n          <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">'''
assert old in s, 'duplicate Health Hub block not found'
s = s.replace(old, new, 1)
p.write_text(s)
print('Profile order preserved: Health Hub first, Preferences second; duplicate heading removed')
