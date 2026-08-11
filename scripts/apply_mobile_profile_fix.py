from pathlib import Path

p = Path('src/routes/profile.tsx')
s = p.read_text()

old = '''      <HealthSubpage title="Appearance" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">{t("Theme")}</p>'''
new = '''      <HealthSubpage title="Appearance" onBack={() => setHealthView("hub")}>
        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">{t("Home greeting name")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("This name is shown under BIXBO in the Hi greeting on Home.")}</p>
          <Input
            className="mt-3 h-11"
            value={view.settings.userName ?? ""}
            onChange={(event) =>
              update((d) => ({
                ...d,
                settings: { ...d.settings, userName: event.target.value },
              }))
            }
            placeholder={t("Name")}
            aria-label={t("Home greeting name")}
          />
        </section>

        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <p className="text-sm font-semibold text-foreground">{t("Theme")}</p>'''
assert old in s
s = s.replace(old, new, 1)
p.write_text(s)

print('profile appearance greeting-name control added; Health Hub structure preserved')
