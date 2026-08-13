from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing matcher: {label}")
    return text.replace(old, new, 1)

p = Path("src/features/logging/LogFormPrimitives.tsx")
s = p.read_text()
s = replace_once(s, '  const canEdit = !!(onRenameCustom || onRemoveCustom) && custom.length > 0;', '  const canEdit = true;', 'custom chip edit control')
p.write_text(s)

p = Path("src/styles.css")
s = p.read_text()
s = replace_once(s, '''.bixbo-unified-log input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.bixbo-unified-log select {
  width: 100%;
  max-width: 100%;''', '''.bixbo-unified-log input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.bixbo-unified-log select {
  max-width: 100%;''', 'forced input width')
p.write_text(s)

p = Path("src/features/logging/LogSheetRoot.tsx")
s = p.read_text()
s = replace_once(s, '''className={`min-h-0 flex-1 overflow-y-auto ${
                active === "pain" ? "pt-[60px]" : "bixbo-unified-log px-4 pb-5 sm:px-5"
              }`}''', '''className={`min-h-0 flex-1 overflow-y-auto ${
                active === "pain"
                  ? "pt-[60px]"
                  : active === "meds"
                    ? "px-5 pb-4"
                    : "bixbo-unified-log px-4 pb-5 sm:px-5"
              }`}''', 'layout opt-out')
p.write_text(s)

p = Path("src/features/logging/CycleForms.tsx")
s = p.read_text()
start = s.index('export function PeriodForm(')
end = s.index('\nexport function SexForm(', start)
new = '''export function PeriodForm({ date, data, update, onDone }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const { t } = useI18n();
  const cur = data.dayLogs[date]?.periodInfo;
  const [level, setLevel] = useState<PeriodLevel>(cur?.level ?? "");
  const [discharge, setDischarge] = useState<string>(cur?.discharge ?? "");
  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");
  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      period: level || undefined,
      periodInfo: {
        level,
        discharge: discharge || undefined,
        dischargeNote: dNote.trim() || undefined,
        note: note.trim() || undefined,
        cramps: cur?.cramps,
      },
    }));
    onDone();
  };
  const LEVELS: { v: PeriodLevel; label: string; color: string }[] = [
    { v: "spotting", label: "Spotting", color: "var(--period-spotting)" },
    { v: "light", label: "Light", color: "var(--period-light)" },
    { v: "medium", label: "Medium", color: "var(--period-medium)" },
    { v: "heavy", label: "Heavy", color: "var(--period-heavy)" },
    { v: "very-heavy", label: "Very heavy", color: "var(--period-veryheavy)" },
  ];
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Flow" schemaFieldId="flow">
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {LEVELS.map((L) => (
            <button key={L.v} type="button" onClick={() => setLevel(L.v)} className={`min-w-0 rounded-2xl px-1 py-2 text-[11px] font-medium leading-tight ${level === L.v ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"}`} style={level === L.v ? { background: L.color } : undefined}>{t(L.label)}</button>
          ))}
        </div>
      </Field>
      <Field label="Discharge (optional)" schemaFieldId="discharge">
        <div className="mt-2 flex flex-wrap gap-2">
          {DISCHARGE_OPTS.map((d) => <Chip key={d.value} active={discharge === d.value} onClick={() => setDischarge(discharge === d.value ? "" : d.value)} color={d.color}>{d.label}</Chip>)}
        </div>
      </Field>
      <Field label="Discharge note (optional)" schemaFieldId="dischargeNote"><Input value={dNote} onChange={(e) => setDNote(e.target.value)} /></Field>
      <Field label="Day note (optional)" schemaFieldId="note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Birth control since (optional)" schemaFieldId="birthControlSince">
        <Input type="date" value={data.settings.birthControlSince ?? ""} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, birthControlSince: e.target.value || undefined } }))} />
        {data.settings.birthControlSince && <p className="mt-1 text-[11px] text-muted-foreground">Taking birth control since {data.settings.birthControlSince}</p>}
      </Field>
      <div className="rounded-2xl bg-tint p-3 text-[11px] leading-relaxed text-muted-foreground">Cycle prediction is based on your last period and cycle length (edit in Settings later).</div>
      {cur && <button type="button" onClick={() => { update((current) => { const day = current.dayLogs[date] ?? {}; const { period: _p, periodInfo: _pi, ...rest } = day; void _p; void _pi; const adminFields = { ...(rest.adminFields ?? {}) }; const periodAdmin = adminFields.period ?? []; const nextPeriodAdmin = periodAdmin.filter((entry) => entry.sourceEntryId !== `day:period:${date}`); if (nextPeriodAdmin.length) adminFields.period = nextPeriodAdmin; else delete adminFields.period; return { ...current, dayLogs: { ...current.dayLogs, [date]: { ...rest, adminFields: Object.keys(adminFields).length ? adminFields : undefined } } }; }); onDone(); }} className="w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30">Delete Blueberry entry</button>}
    </div>
  );
}
'''
s = s[:start] + new + s[end:]
p.write_text(s)
