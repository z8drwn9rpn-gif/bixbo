import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Ico, Plus, X } from "@/components/icons/BixboIcons";
import {
  DISCHARGE_OPTS,
  SEX_FEELINGS_DEFAULT,
  SEX_TYPES_DEFAULT,
  asArr,
  nowHHMM,
  painColor,
  updateDayLog,
  type BixboData,
  type PainfulWhen,
  type PeriodLevel,
  type SexEntry,
  type SexKind,
  type ThermoKind,
  type ThermoSession,
} from "@/lib/storage";
import { getScaleDesc } from "@/lib/scaleDescriptions";
import { useLogSchema } from "./LogSchemaContext";
import { Chip, CustomChipList, Field, IntensityScale, SaveBar, toggleIn } from "./LogFormPrimitives";
import type { UpdateFn } from "./LogFormPrimitives";

export function PeriodForm({ date, data, update, onDone }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void }) {
  const { t } = useI18n();
  const cur = data.dayLogs[date]?.periodInfo;
  const [level, setLevel] = useState<PeriodLevel>(cur?.level ?? "");
  const [discharge, setDischarge] = useState<string>(cur?.discharge ?? "");
  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");
  const [cramps, setCramps] = useState<number | undefined>(cur?.cramps == null ? undefined : Math.max(1, Math.min(10, Math.round(cur.cramps))));
  const painDesc = getScaleDesc(data, "pain");
  const save = () => {
    updateDayLog(update, date, (l) => ({ ...l, period: level || undefined, periodInfo: { level, discharge: discharge || undefined, dischargeNote: dNote.trim() || undefined, note: note.trim() || undefined, cramps } }));
    onDone();
  };
  const LEVELS: { v: PeriodLevel; label: string; color: string }[] = [
    { v: "spotting", label: "Spotting", color: "var(--period-spotting)" },
    { v: "light", label: "Light", color: "var(--period-light)" },
    { v: "medium", label: "Medium", color: "var(--period-medium)" },
    { v: "heavy", label: "Heavy", color: "var(--period-heavy)" },
    { v: "very-heavy", label: "Very heavy", color: "var(--period-veryheavy)" },
  ];
  return <div className="flex flex-col gap-3">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Flow" schemaFieldId="flow"><div className="mt-2 grid grid-cols-5 gap-1.5">{LEVELS.map((L) => <button key={L.v} onClick={() => setLevel(L.v)} className={`rounded-2xl p-2 text-[11px] font-medium ${level === L.v ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"}`} style={level === L.v ? { background: L.color } : undefined}>{t(L.label)}</button>)}</div></Field>
    <Field label={`${t("Cramp pain")} ${cramps ?? "—"} / 10`} schemaFieldId="cramps"><IntensityScale value={cramps ?? -1} onChange={(n) => setCramps(cramps === n ? undefined : n)} max={10} from={1} step={1} descriptions={painDesc} legendTitle="Cramp pain scale" compactSingleRow schemaFieldId="cramps" /></Field>
    <Field label="Discharge (optional)" schemaFieldId="discharge"><div className="mt-2 flex flex-wrap gap-2">{DISCHARGE_OPTS.map((d) => <Chip key={d.value} active={discharge === d.value} onClick={() => setDischarge(discharge === d.value ? "" : d.value)} color={d.color}>{d.label}</Chip>)}</div></Field>
    <Field label="Birth control since (optional)" schemaFieldId="birthControlSince"><Input type="date" value={data.settings.birthControlSince ?? ""} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, birthControlSince: e.target.value || undefined } }))} />{data.settings.birthControlSince && <p className="mt-1 text-[11px] text-muted-foreground">Taking birth control since {data.settings.birthControlSince}</p>}</Field>
    <Field label="Discharge note (optional)" schemaFieldId="dischargeNote"><Input value={dNote} onChange={(e) => setDNote(e.target.value)} /></Field>
    <Field label="Day note (optional)" schemaFieldId="note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    <div className="rounded-2xl bg-tint p-3 text-[11px] leading-relaxed text-muted-foreground">Cycle prediction is based on your last period and cycle length (edit in Settings later).</div>
    {cur && <button type="button" onClick={() => { update((current) => { const day = current.dayLogs[date] ?? {}; const { period: _p, periodInfo: _pi, ...rest } = day; void _p; void _pi; const adminFields = { ...(rest.adminFields ?? {}) }; const periodAdmin = adminFields.period ?? []; const nextPeriodAdmin = periodAdmin.filter((entry) => entry.sourceEntryId !== `day:period:${date}`); if (nextPeriodAdmin.length) adminFields.period = nextPeriodAdmin; else delete adminFields.period; return { ...current, dayLogs: { ...current.dayLogs, [date]: { ...rest, adminFields: Object.keys(adminFields).length ? adminFields : undefined } } }; }); onDone(); }} className="w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30">Delete Blueberry entry</button>}
  </div>;
}

export function SexForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: SexEntry }) {
  const schema = useLogSchema();
  const [kind, setKind] = useState<SexKind>(initialEntry?.kind ?? "sex");
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [feelingAfter, setFeelingAfter] = useState<string[]>(asArr(initialEntry?.feelingAfter));
  const [painful, setPainful] = useState<PainfulWhen>(initialEntry?.painful ?? "no");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addCustom = (v: string) => update((d) => ({ ...d, custom: { ...d.custom, sexTypes: [...d.custom.sexTypes, v] } }));
  const rmCustom = (v: string) => { if (!confirm(`Remove "${v}" from your list?`)) return; update((d) => ({ ...d, custom: { ...d.custom, sexTypes: d.custom.sexTypes.filter((x) => x !== v) } })); if (kind === (`other:${v}` as SexKind)) setKind("sex"); };
  const custom = data.custom.sexTypes;
  const save = () => { const editing = !!initialEntry; const e: SexEntry = { id: initialEntry?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(), time, kind, feelingAfter: feelingAfter.length ? feelingAfter : undefined, painful, note: note.trim() || undefined }; updateDayLog(update, date, (l) => ({ ...l, sex: editing ? (l.sex ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.sex ?? []), e] })); onDone(); };
  return <div className="flex flex-col gap-3">
    <SaveBar onCancel={onDone} onSave={save} />
    <Field label="Time" schemaFieldId="time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
    <Field label="Type" schemaFieldId="type"><div className="mt-2 flex flex-wrap gap-2">{SEX_TYPES_DEFAULT.map((o) => <Chip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)}>{o.label}</Chip>)}{custom.map((c) => <span key={c} className="relative inline-flex items-center"><Chip active={kind === (`other:${c}` as SexKind)} onClick={() => setKind(`other:${c}` as SexKind)}>{c}</Chip><button onClick={(e) => { e.stopPropagation(); rmCustom(c); }} aria-label={`Remove ${c}`} className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><X className="h-3 w-3" /></button></span>)}<AddCustomInline onAdd={addCustom} /></div></Field>
    <Field label="How I feel after" schemaFieldId="feelingAfter"><CustomChipList base={SEX_FEELINGS_DEFAULT} custom={data.custom.sexFeelings ?? []} onAddCustom={(v) => update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: [...(d.custom.sexFeelings ?? []), v] } }))} onRemoveCustom={(v) => { update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).filter((x) => x !== v) } })); setFeelingAfter((a) => a.filter((x) => x !== v)); }} onRenameCustom={(o, n) => { update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).map((x) => (x === o ? n : x)) } })); setFeelingAfter((a) => a.map((x) => (x === o ? n : x))); }} selected={feelingAfter} onToggle={(v) => setFeelingAfter((a) => toggleIn(a, v))} schemaFieldId="feelingAfter" /></Field>
    <Field label="Painful?" schemaFieldId="painful"><div className="mt-2 flex gap-2">{(["no", "before", "during", "after"] as const).map((v) => <Chip key={v} active={painful === v} onClick={() => setPainful(v)}>{v}</Chip>)}</div></Field>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
  </div>;
}

export function AddCustomInline({ onAdd }: { onAdd: (v: string) => void }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  if (!adding) return <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-muted-foreground"><Plus className="h-3 w-3" /> {t("Add")}</button>;
  const commit = () => { if (text.trim()) { onAdd(text.trim()); setText(""); setAdding(false); } };
  return <div className="flex items-center gap-1"><Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }} className="h-8 w-32" placeholder={t("Custom…")} autoFocus /><Button type="button" size="sm" onClick={commit}>{t("Add")}</Button></div>;
}

type ThermoSessionUi = ThermoSession & {
  bodyArea?: string;
  level?: "low" | "medium" | "high";
  effectiveness?: "not-yet" | "no" | "little" | "moderate" | "lot";
  painBefore?: number;
  painAfter?: number;
};

export function ThermoForm({ date, update, onDone, initialEntry }: { date: string; update: UpdateFn; onDone: () => void; initialEntry?: ThermoSession }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const initial = initialEntry as ThermoSessionUi | undefined;
  const [kind, setKind] = useState<ThermoKind>(initial?.kind ?? "heat");
  const [start, setStart] = useState(initial?.start ?? nowHHMM());
  const [minutes, setMinutes] = useState<string>(initial ? (initial.minutes != null ? String(initial.minutes) : "") : "20");
  const [ongoing, setOngoing] = useState(!!initial?.ongoing);
  const [bodyArea, setBodyArea] = useState(initial?.bodyArea ?? "");
  const [level, setLevel] = useState<ThermoSessionUi["level"]>(initial?.level);
  const [effectiveness, setEffectiveness] = useState<ThermoSessionUi["effectiveness"]>(initial?.effectiveness ?? "not-yet");
  const [painBefore, setPainBefore] = useState<number | undefined>(initial?.painBefore);
  const [painAfter, setPainAfter] = useState<number | undefined>(initial?.painAfter);
  const [note, setNote] = useState(initial?.note ?? "");
  const bodyAreas = ["Lower belly", "Lower back", "Pelvis", "Abdomen", "Neck", "Shoulders", "Legs", "Other"];
  const durationOptions = [10, 15, 20, 30, 45, 60];
  const painValues = Array.from({ length: 11 }, (_, n) => n);
  const save = () => {
    const editing = !!initialEntry;
    const mins = ongoing ? 0 : minutes === "" ? 0 : Number(minutes);
    const entry = {
      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      kind,
      start,
      minutes: mins,
      ongoing: ongoing || undefined,
      bodyArea: bodyArea || undefined,
      level,
      effectiveness,
      painBefore,
      painAfter,
      note: note.trim() || undefined,
    } as ThermoSessionUi;
    updateDayLog(update, date, (l) => ({ ...l, heat: editing ? (l.heat ?? []).map((x) => (x.id === entry.id ? entry : x)) : [...(l.heat ?? []), entry] }));
    onDone();
  };
  const painScale = (label: string, value: number | undefined, setter: (value: number | undefined) => void) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{t(label)}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {painValues.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setter(value === n ? undefined : n)}
            className={`h-9 w-9 shrink-0 rounded-full text-xs font-semibold transition ${value === n ? "text-white ring-[3px] ring-foreground" : "text-foreground"}`}
            style={{ background: painColor(n) }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-4">
    <SaveBar onCancel={onDone} onSave={save} />
    <section>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Therapy type")}</p>
      <div className="grid grid-cols-3 gap-2">
        {([ ["heat", "♨️", "Heat"], ["cold", "🧊", "Cold"], ["tens", "⭐", "TENS"] ] as const).map(([value, icon, label]) => <button key={value} type="button" onClick={() => setKind(value)} className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-3xl border text-sm font-semibold transition ${kind === value ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20" : "border-border bg-surface text-foreground"}`}><Ico e={icon} size={30} /><span>{t(label)}</span></button>)}
      </div>
    </section>
    <section className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-2 border-t border-border pt-3">
      <Field label="Start" schemaFieldId="start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-full min-w-0 px-2 text-sm" /></Field>
      <Field label="Duration (min)" schemaFieldId="duration"><div className="grid grid-cols-3 gap-1.5">{durationOptions.map((value) => <button key={value} type="button" onClick={() => { setOngoing(false); setMinutes(String(value)); }} className={`h-9 rounded-xl border px-1 text-[11px] font-semibold ${!ongoing && Number(minutes) === value ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/30" : "border-border bg-surface text-foreground"}`}>{value}</button>)}</div><Input type="number" min={1} inputMode="numeric" value={ongoing ? "" : minutes} placeholder={t("Custom minutes")} onChange={(e) => { setOngoing(false); setMinutes(e.target.value); }} className="mt-1.5 h-9 min-w-0 text-sm" /></Field>
    </section>
    <button type="button" onClick={() => setOngoing((value) => !value)} className={`flex h-10 items-center justify-between rounded-xl border px-3 text-sm font-medium ${ongoing ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span>{t("Still using now")}</span><span className={`relative h-5 w-9 rounded-full transition ${ongoing ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${ongoing ? "left-[18px]" : "left-0.5"}`} /></span></button>
    <section className="border-t border-border pt-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Body area")}</p><div className="grid grid-cols-2 gap-1.5">{bodyAreas.map((value) => <button key={value} type="button" onClick={() => setBodyArea(bodyArea === value ? "" : value)} className={`h-9 rounded-xl border px-2 text-[11px] font-medium ${bodyArea === value ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}>{t(value)}</button>)}</div></section>
    <section className="border-t border-border pt-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t(kind === "tens" ? "TENS intensity" : "Intensity")}</p><div className="grid grid-cols-3 gap-1.5">{(["low", "medium", "high"] as const).map((value) => <button key={value} type="button" onClick={() => setLevel(level === value ? undefined : value)} className={`h-9 rounded-xl border px-2 text-[11px] font-medium capitalize ${level === value ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}>{t(value)}</button>)}</div></section>
    <section className="border-t border-border pt-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Did it help?")}</p><div className="grid grid-cols-5 gap-1">{([ ["not-yet", "⏱️", "Not yet"], ["no", "🙁", "No"], ["little", "🙂", "A little"], ["moderate", "😊", "Moderate"], ["lot", "😁", "A lot"] ] as const).map(([value, icon, label]) => <button key={value} type="button" onClick={() => setEffectiveness(value)} className={`flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 text-[9px] font-medium ${effectiveness === value ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20" : "border-border bg-surface"}`}><Ico e={icon} size={18} /><span className="leading-tight">{t(label)}</span></button>)}</div></section>
    <section className="border-t border-border pt-3"><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Pain before / after")} <span className="normal-case font-normal">({t("optional")})</span></p><span className="text-xs text-muted-foreground">/10</span></div><div className="space-y-2.5">{painScale("Before", painBefore, setPainBefore)}{painScale("After", painAfter, setPainAfter)}</div></section>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} maxLength={200} value={note} placeholder={t("Add note…")} onChange={(e) => setNote(e.target.value)} /><p className="mt-1 text-right text-[10px] text-muted-foreground">{note.length}/200</p></Field>
  </div>;
}
