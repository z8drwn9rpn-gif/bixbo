from pathlib import Path

p = Path('src/routes/profile.tsx')
s = p.read_text()

old = '''        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
          <HubRow
            icon={<StethoscopeIcon size={23} />}
            title="Health Summary"'''
new = '''        <p className="-mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("Health Hub")}
        </p>

        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
          <HubRow
            icon={<StethoscopeIcon size={23} />}
            title="Health Summary"'''
assert old in s, 'Health Hub list start not found'
s = s.replace(old, new, 1)

# The existing source already keeps Health Summary/Journey/Achievements/Statistics/Export
# above the Preferences group. Do not move or delete any of those rows; only make
# the Health Hub group explicit so the visual order is unambiguous.
p.write_text(s)
print('Health Hub explicitly labelled first; existing Preferences group remains below unchanged')
