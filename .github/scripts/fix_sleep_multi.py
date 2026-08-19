from pathlib import Path

path = Path('src/features/logging/LogSheetRoot.tsx')
s = path.read_text(encoding='utf-8')

old = '''  const [sleepHours, setSleepHours] = useState(cur.sleepHours != null ? String(cur.sleepHours).replace(".", ",") : "");
  const [sleepQuality, setSleepQuality] = useState<string[]>(asArr(cur.sleepQuality));'''
new = '''  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState<string[]>([]);'''
if old not in s:
    raise SystemExit('sleep input state target not found')
s = s.replace(old, new, 1)

old = '''  const weightEntries = cur.weightEntries?.length
    ? cur.weightEntries
    : cur.weight != null
      ? [{ id: `legacy-weight-${date}`, time: "", value: cur.weight }]
      : [];

  const deleteTemperature = (id: string) => updateDayLog(update, date, (log) => {'''
new = '''  const weightEntries = cur.weightEntries?.length
    ? cur.weightEntries
    : cur.weight != null
      ? [{ id: `legacy-weight-${date}`, time: "", value: cur.weight }]
      : [];

  type SleepEntry = { id: string; time: string; hours: number; quality?: string[] };
  const curWithSleep = cur as DayLog & { sleepEntries?: SleepEntry[] };
  const sleepEntries: SleepEntry[] = curWithSleep.sleepEntries?.length
    ? curWithSleep.sleepEntries
    : cur.sleepHours != null
      ? [{ id: `legacy-sleep-${date}`, time: "", hours: cur.sleepHours, quality: asArr(cur.sleepQuality) }]
      : [];

  const deleteSleep = (id: string) => updateDayLog(update, date, (log) => {
    const logWithSleep = log as DayLog & { sleepEntries?: SleepEntry[] };
    const entries: SleepEntry[] = logWithSleep.sleepEntries?.length
      ? logWithSleep.sleepEntries
      : log.sleepHours != null
        ? [{ id: `legacy-sleep-${date}`, time: "", hours: log.sleepHours, quality: asArr(log.sleepQuality) }]
        : [];
    const next = entries.filter((entry) => entry.id !== id);
    const total = next.reduce((sum, entry) => sum + entry.hours, 0);
    const qualities = Array.from(new Set(next.flatMap((entry) => entry.quality ?? [])));
    return {
      ...log,
      sleepEntries: next.length ? next : undefined,
      sleepHours: next.length ? Number(total.toFixed(2)) : undefined,
      sleepQuality: next.length && qualities.length ? qualities : undefined,
    } as DayLog & { sleepEntries?: SleepEntry[] };
  });

  const deleteTemperature = (id: string) => updateDayLog(update, date, (log) => {'''
if old not in s:
    raise SystemExit('sleep entries insertion target not found')
s = s.replace(old, new, 1)

old = '''      const sleep = parseNumber(sleepHours);
      updateDayLog(update, date, (log) => {
        const nextTempEntries = temp != null
          ? [...(log.temperatureEntries ?? []), { id: crypto.randomUUID(), time, value: temp }]
          : log.temperatureEntries;
        const nextWeightEntries = bodyWeight != null
          ? [...(log.weightEntries ?? []), { id: crypto.randomUUID(), time, value: bodyWeight }]
          : log.weightEntries;
        return {
          ...log,
          temperatureEntries: nextTempEntries,
          weightEntries: nextWeightEntries,
          temperature: temp ?? log.temperature,
          weight: bodyWeight ?? log.weight,
          sleepHours: sleep ?? log.sleepHours,
          sleepQuality: sleepQuality.length ? sleepQuality : log.sleepQuality,
        };
      });'''
new = '''      const sleep = parseNumber(sleepHours);
      updateDayLog(update, date, (log) => {
        const nextTempEntries = temp != null
          ? [...(log.temperatureEntries ?? []), { id: crypto.randomUUID(), time, value: temp }]
          : log.temperatureEntries;
        const nextWeightEntries = bodyWeight != null
          ? [...(log.weightEntries ?? []), { id: crypto.randomUUID(), time, value: bodyWeight }]
          : log.weightEntries;
        const validSleep = sleep != null && sleep > 0 && sleep <= 24;
        const logWithSleep = log as DayLog & { sleepEntries?: SleepEntry[] };
        const existingSleepEntries: SleepEntry[] = logWithSleep.sleepEntries?.length
          ? logWithSleep.sleepEntries
          : log.sleepHours != null
            ? [{ id: `legacy-sleep-${date}`, time: "", hours: log.sleepHours, quality: asArr(log.sleepQuality) }]
            : [];
        const nextSleepEntries = validSleep
          ? [...existingSleepEntries, { id: crypto.randomUUID(), time, hours: sleep, quality: sleepQuality.length ? sleepQuality : undefined }]
          : existingSleepEntries;
        const sleepTotal = nextSleepEntries.reduce((sum, entry) => sum + entry.hours, 0);
        const sleepQualities = Array.from(new Set(nextSleepEntries.flatMap((entry) => entry.quality ?? [])));
        return {
          ...log,
          temperatureEntries: nextTempEntries,
          weightEntries: nextWeightEntries,
          temperature: temp ?? log.temperature,
          weight: bodyWeight ?? log.weight,
          ...(validSleep ? {
            sleepEntries: nextSleepEntries,
            sleepHours: Number(sleepTotal.toFixed(2)),
            sleepQuality: sleepQualities.length ? sleepQualities : undefined,
          } : {}),
        } as DayLog & { sleepEntries?: SleepEntry[] };
      });'''
if old not in s:
    raise SystemExit('sleep save target not found')
s = s.replace(old, new, 1)

old = '''          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("Sleep (hours)")}</p>
            <Input inputMode="decimal" value={sleepHours} onChange={(e) => setSleepHours(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="8" className="h-10 rounded-2xl" />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("How I slept")}</p>'''
new = '''          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("New sleep measurement")}</p>
            <Input inputMode="decimal" value={sleepHours} onChange={(e) => setSleepHours(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="8" className="h-10 rounded-2xl" />
            {sleepEntries.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("Saved sleep measurements")}</p>
                {sleepEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border/70">
                    <Ico e="😴" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{String(entry.hours).replace(".", ",")} h</p>
                      {entry.quality?.length ? <p className="truncate text-[10px] text-muted-foreground">{entry.quality.map((item) => t(item)).join(" · ")}</p> : null}
                    </div>
                    {entry.time ? <span className="text-[10px] text-muted-foreground">{entry.time}</span> : null}
                    <button type="button" onClick={() => deleteSleep(entry.id)} aria-label={t("Delete")} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("How I slept")}</p>'''
if old not in s:
    raise SystemExit('sleep UI target not found')
s = s.replace(old, new, 1)

path.write_text(s, encoding='utf-8')
