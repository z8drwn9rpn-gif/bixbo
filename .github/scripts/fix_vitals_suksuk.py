from pathlib import Path

root = Path('.')

cycle_path = root / 'src/features/logging/CycleForms.tsx'
cycle = cycle_path.read_text(encoding='utf-8')
old = '''  const chipClass = (active: boolean) => `bixbo-sex-chip inline-flex min-h-[31px] items-center justify-center gap-[5px] rounded-full px-3 max-[430px]:px-2.5 py-[5px] text-xs font-semibold leading-none transition ${
    active
      ? "bg-primary/15 text-foreground ring-2 ring-foreground/75 ring-offset-1 ring-offset-background"
      : "bg-tint text-foreground ring-1 ring-border"
  }`;'''
new = '''  const chipClass = (active: boolean) => `bixbo-sex-chip inline-flex min-h-[31px] items-center justify-center gap-[5px] rounded-full px-3 max-[430px]:px-2.5 py-[5px] text-xs font-semibold leading-none transition ${
    active
      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60"
      : "bg-tint text-foreground ring-1 ring-border"
  }`;'''
if old not in cycle:
    raise SystemExit('SukSuk chipClass target not found')
cycle_path.write_text(cycle.replace(old, new, 1), encoding='utf-8')

body_path = root / 'src/features/logging/LogSheetRoot.tsx'
body = body_path.read_text(encoding='utf-8')
old = '''  const [temperature, setTemperature] = useState(cur.temperature != null ? String(cur.temperature).replace(".", ",") : "");
  const [weight, setWeight] = useState(cur.weight != null ? String(cur.weight).replace(".", ",") : "");'''
new = '''  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");'''
if old not in body:
    raise SystemExit('BodyRecovery initial vital fields target not found')
body = body.replace(old, new, 1)

marker = '  const sleepOptions = [\n'
insert = '''  const temperatureEntries = cur.temperatureEntries?.length
    ? cur.temperatureEntries
    : cur.temperature != null
      ? [{ id: `legacy-temperature-${date}`, time: "", value: cur.temperature }]
      : [];
  const weightEntries = cur.weightEntries?.length
    ? cur.weightEntries
    : cur.weight != null
      ? [{ id: `legacy-weight-${date}`, time: "", value: cur.weight }]
      : [];

  const deleteTemperature = (id: string) => updateDayLog(update, date, (log) => {
    const entries = log.temperatureEntries?.length
      ? log.temperatureEntries
      : log.temperature != null
        ? [{ id: `legacy-temperature-${date}`, time: "", value: log.temperature }]
        : [];
    const next = entries.filter((entry) => entry.id !== id);
    return {
      ...log,
      temperatureEntries: next.length ? next : undefined,
      temperature: next.at(-1)?.value,
    };
  });

  const deleteWeight = (id: string) => updateDayLog(update, date, (log) => {
    const entries = log.weightEntries?.length
      ? log.weightEntries
      : log.weight != null
        ? [{ id: `legacy-weight-${date}`, time: "", value: log.weight }]
        : [];
    const next = entries.filter((entry) => entry.id !== id);
    return {
      ...log,
      weightEntries: next.length ? next : undefined,
      weight: next.at(-1)?.value,
    };
  });

  const sleepOptions = [
'''
if marker not in body:
    raise SystemExit('BodyRecovery sleepOptions marker not found')
body = body.replace(marker, insert, 1)

old_temp = '''            <div className="relative">
              <Input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="36,6 °C" className="h-10 rounded-2xl pr-12" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°C</span>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("New weight measurement")}</p>'''
new_temp = '''            <div className="relative">
              <Input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="36,6 °C" className="h-10 rounded-2xl pr-12" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°C</span>
            </div>
            {temperatureEntries.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("Saved temperature measurements")}</p>
                {temperatureEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border/70">
                    <Ico e="🌡️" size={16} />
                    <span className="min-w-0 flex-1 text-xs font-semibold">{String(entry.value).replace(".", ",")} °C</span>
                    {entry.time ? <span className="text-[10px] text-muted-foreground">{entry.time}</span> : null}
                    <button type="button" onClick={() => deleteTemperature(entry.id)} aria-label={t("Delete")} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("New weight measurement")}</p>'''
if old_temp not in body:
    raise SystemExit('Temperature UI target not found')
body = body.replace(old_temp, new_temp, 1)

old_weight = '''            <div className="relative">
              <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="62,5 kg" className="h-10 rounded-2xl pr-12" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Sleep (hours)")}</p>'''
new_weight = '''            <div className="relative">
              <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="62,5 kg" className="h-10 rounded-2xl pr-12" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
            {weightEntries.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("Saved weight measurements")}</p>
                {weightEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border/70">
                    <Ico e="⚖️" size={16} />
                    <span className="min-w-0 flex-1 text-xs font-semibold">{String(entry.value).replace(".", ",")} kg</span>
                    {entry.time ? <span className="text-[10px] text-muted-foreground">{entry.time}</span> : null}
                    <button type="button" onClick={() => deleteWeight(entry.id)} aria-label={t("Delete")} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Sleep (hours)")}</p>'''
if old_weight not in body:
    raise SystemExit('Weight UI target not found')
body = body.replace(old_weight, new_weight, 1)

body_path.write_text(body, encoding='utf-8')
