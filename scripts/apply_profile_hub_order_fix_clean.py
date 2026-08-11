from pathlib import Path

p = Path('src/routes/profile.tsx')
s = p.read_text()

old = '''        <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
          <HubRow
            icon={<StethoscopeIcon size={23} />}
            title="Health Summary"'''
new = '''        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("Health Hub")}
          </p>
          <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80">
          <HubRow
            icon={<StethoscopeIcon size={23} />}
            title="Health Summary"'''
assert old in s, 'Health Hub list start not found'
s = s.replace(old, new, 1)

old2 = '''          <HubRow
            icon={<NoteIcon size={22} />}
            title="Export"
            subtitle="Export health data as JSON or CSV"
            onClick={() => onOpen("export")}
          />
        </section>

        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("Preferences")}'''
new2 = '''          <HubRow
            icon={<NoteIcon size={22} />}
            title="Export"
            subtitle="Export health data as JSON or CSV"
            onClick={() => onOpen("export")}
          />
          </section>
        </div>

        <div>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("Preferences")}'''
assert old2 in s, 'Health Hub list end / Preferences start not found'
s = s.replace(old2, new2, 1)

p.write_text(s)
print('Health Hub rendered first with all health rows; Preferences remains below')
