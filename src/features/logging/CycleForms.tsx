import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Ico, Pencil, Plus, X } from "@/components/icons/BixboExtraIcons";
import { BixboSemanticIcon, type BixboSemanticIconName } from "@/components/icons/BixboSemanticIcons";
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
  const [periodSymptoms, setPeriodSymptoms] = useState<string[]>(cur?.symptoms ?? []);
  const [clots, setClots] = useState<"none" | "small" | "medium" | "large" | "">(cur?.clots ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");

  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      period: level || undefined,
      periodInfo: {
        level,
        discharge: discharge || undefined,
        dischargeNote: dNote.trim() || undefined,
        symptoms: periodSymptoms.length ? periodSymptoms : undefined,
        clots: clots || undefined,
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
  const PERIOD_SYMPTOMS = [
    "Cramps", "Lower belly pain", "Lower back pain", "Bloating", "Headache",
    "Nausea", "Fatigue", "Mood changes", "Breast tenderness", "Acne",
  ];
  const CLOT_OPTIONS = [
    ["none", "None"], ["small", "Small"], ["medium", "Medium"], ["large", "Large"],
  ] as const;
  const sectionLabel = "mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-5">
      <SaveBar onCancel={onDone} onSave={save} />

      <section>
        <p className={sectionLabel}>{t("Flow")}</p>
        <div className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((L) => {
            const active = level === L.v;
            return (
              <button
                key={L.v}
                type="button"
                onClick={() => setLevel(active ? "" : L.v)}
                className={`min-w-0 rounded-full px-1 py-2.5 text-[11px] font-semibold leading-tight transition ${active ? "text-white shadow-sm ring-2 ring-foreground/75" : "bg-tint text-foreground ring-1 ring-border"}`}
                style={active ? { background: L.color } : undefined}
              >
                {t(L.label)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border/60" />

      <section>
        <p className={sectionLabel}>{t("Discharge (optional)")}</p>
        <div className="flex flex-wrap gap-2">
          {DISCHARGE_OPTS.map((d) => (
            <Chip key={d.value} active={discharge === d.value} onClick={() => setDischarge(discharge === d.value ? "" : d.value)} color={d.color}>
              {d.label}
            </Chip>
          ))}
        </div>
        {discharge ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t("Discharge note (optional)")}</p>
            <Input value={dNote} onChange={(e) => setDNote(e.target.value)} placeholder={t("Add discharge note…")} className="h-10 rounded-2xl" />
          </div>
        ) : null}
      </section>

      <div className="border-t border-border/60" />

      <section>
        <p className={sectionLabel}>{t("Period symptoms (optional)")}</p>
        <div className="flex flex-wrap gap-2">
          {PERIOD_SYMPTOMS.map((symptom) => {
            const active = periodSymptoms.includes(symptom);
            return (
              <button key={symptom} type="button" onClick={() => setPeriodSymptoms((current) => toggleIn(current, symptom))} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}>
                {t(symptom)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border/60" />

      <section>
        <p className={sectionLabel}>{t("Clots (optional)")}</p>
        <div className="grid grid-cols-4 gap-2">
          {CLOT_OPTIONS.map(([value, label]) => {
            const active = clots === value;
            return (
              <button key={value} type="button" onClick={() => setClots(active ? "" : value)} className={`min-w-0 rounded-full px-2 py-2 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}>
                {t(label)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t border-border/60" />

      <section>
        <p className={sectionLabel}>{t("Day note (optional)")}</p>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Add a note about today…")} className="min-h-[76px] rounded-2xl" />
      </section>

      <div className="border-t border-border/60" />

      <section>
        <p className={sectionLabel}>{t("Birth control since (optional)")}</p>
        <Input type="date" value={data.settings.birthControlSince ?? ""} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, birthControlSince: e.target.value || undefined } }))} className="h-10 rounded-2xl" />
        {data.settings.birthControlSince ? <p className="mt-1 text-[10px] text-muted-foreground">{t("Taking birth control since")} {data.settings.birthControlSince}</p> : null}
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{t("Cycle prediction is based on your last period and cycle length (edit in Settings later).")}</p>
      </section>

      {cur ? (
        <button
          type="button"
          onClick={() => {
            update((current) => {
              const day = current.dayLogs[date] ?? {};
              const { period: _p, periodInfo: _pi, ...rest } = day;
              void _p;
              void _pi;
              const adminFields = { ...(rest.adminFields ?? {}) };
              const periodAdmin = adminFields.period ?? [];
              const nextPeriodAdmin = periodAdmin.filter((entry) => entry.sourceEntryId !== `day:period:${date}`);
              if (nextPeriodAdmin.length) adminFields.period = nextPeriodAdmin;
              else delete adminFields.period;
              return { ...current, dayLogs: { ...current.dayLogs, [date]: { ...rest, adminFields: Object.keys(adminFields).length ? adminFields : undefined } } };
            });
            onDone();
          }}
          className="mt-1 w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30"
        >
          {t("Delete Blueberry entry")}
        </button>
      ) : null}
    </div>
  );
}

type SexEntryUi = SexEntry & {
  painWhenUi?: "during" | "after" | "both";
  painScale?: number;
  painLocations?: string[];
};

type SemanticOption<T extends string = string> = { value: T; icon: BixboSemanticIconName; label?: string };

export function SexForm({ date, data, update, onDone, initialEntry }: { date: string; data: BixboData; update: UpdateFn; onDone: () => void; initialEntry?: SexEntry }) {
  const { t } = useI18n();
  const schema = useLogSchema();
  const initial = initialEntry as SexEntryUi | undefined;

  const [kind, setKind] = useState<SexKind | undefined>(initial?.kind);
  const [protection, setProtection] = useState<string>(initial?.protection ?? "");
  const initialFeeling = asArr(initial?.feelingAfter)[0] ?? "";
  const [feelingAfter, setFeelingAfter] = useState(initialFeeling);
  const [painOn, setPainOn] = useState<boolean | undefined>(initial ? initial.painful != null && initial.painful !== "no" : undefined);
  const [painWhen, setPainWhen] = useState<"during" | "after" | "both" | undefined>(
    initial?.painWhenUi ?? (initial?.painful === "during" || initial?.painful === "after" ? initial.painful : undefined),
  );
  const [painScaleValue, setPainScaleValue] = useState<number | undefined>(initial?.painScale);
  const [painLocations, setPainLocations] = useState<string[]>(initial?.painLocations ?? []);
  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(asArr(initial?.symptomsAfter));
  const [symptomsNone, setSymptomsNone] = useState(false);
  const [orgasm, setOrgasm] = useState<"yes" | "no" | undefined>(initial?.orgasm === "yes" || initial?.orgasm === "no" ? initial.orgasm : undefined);
  const [note, setNote] = useState(initial?.note ?? "");
  const [customAddingKey, setCustomAddingKey] = useState<string | null>(null);
  const [customEditKey, setCustomEditKey] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const suksukCustom = ((data.settings as typeof data.settings & { suksukCustom?: Record<string, string[]> }).suksukCustom ?? {});
  const customValues = (key: string) => suksukCustom[key] ?? [];
  const setCustomValues = (key: string, values: string[]) => update((current) => ({
    ...current,
    settings: {
      ...current.settings,
      suksukCustom: {
        ...((current.settings as typeof current.settings & { suksukCustom?: Record<string, string[]> }).suksukCustom ?? {}),
        [key]: values,
      },
    } as typeof current.settings & { suksukCustom?: Record<string, string[]> },
  }));
  const renderCustomControls = (key: string) => {
    const values = customValues(key);
    const adding = customAddingKey === key;
    const editing = customEditKey === key;
    return (
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {adding ? (
          <>
            <Input value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder={t("Custom…")} className="h-8 min-w-[140px] flex-1 rounded-full" autoFocus />
            <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground" onClick={() => {
              const next = customText.trim();
              if (!next || values.includes(next)) return;
              setCustomValues(key, [...values, next]);
              setCustomText("");
              setCustomAddingKey(null);
            }}>{t("Add")}</button>
            <button type="button" className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold text-foreground" onClick={() => { setCustomText(""); setCustomAddingKey(null); }}>{t("Cancel")}</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setCustomText(""); setCustomAddingKey(key); setCustomEditKey(null); }} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"><Plus className="h-3 w-3" /> {t("Add custom")}</button>
            <button type="button" onClick={() => { setCustomAddingKey(null); setCustomEditKey(editing ? null : key); }} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${editing ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground"}`}><Pencil className="h-3 w-3" /> {editing ? t("Done") : t("Edit")}</button>
          </>
        )}
        {editing && values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] ring-1 ring-border">
            <span>{value}</span>
            <button type="button" aria-label={`Rename ${value}`} onClick={() => {
              const next = prompt(`Rename “${value}”`, value)?.trim();
              if (next && next !== value && !values.includes(next)) setCustomValues(key, values.map((item) => item === value ? next : item));
            }}><Pencil className="h-3 w-3" /></button>
            <button type="button" aria-label={`Remove ${value}`} onClick={() => setCustomValues(key, values.filter((item) => item !== value))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    );
  };

  const typeOptions: SemanticOption<SexKind>[] = [
    { value: "sex", icon: "orgasmYes", label: "Sex" },
    { value: "oral", icon: "oral", label: "Oral" },
    { value: "fingering", icon: "masturbation", label: "Masturbation" },
    { value: "other", icon: "more", label: "Other" },
  ];
  const protectionOptions: SemanticOption[] = [
    { value: "None", icon: "prohibited" },
    { value: "Condom", icon: "shield" },
    { value: "Other", icon: "more" },
  ];
  const feelingOptions: SemanticOption[] = [
    { value: "Great", icon: "great" },
    { value: "Good", icon: "good" },
    { value: "Okay", icon: "okay" },
    { value: "Uncomfortable", icon: "uncomfortable" },
    { value: "Bad", icon: "bad" },
  ];
  const painWhenOptions: SemanticOption<"during" | "after" | "both">[] = [
    { value: "during", icon: "during", label: "During" },
    { value: "after", icon: "after", label: "After" },
    { value: "both", icon: "both", label: "Both" },
  ];
  const painLocationOptions: SemanticOption[] = [
    { value: "Lower belly", icon: "lowerBelly" },
    { value: "Pelvis", icon: "pelvis" },
    { value: "Vagina", icon: "vagina" },
    { value: "Vulva", icon: "vulva" },
    { value: "Lower back", icon: "lowerBack" },
    { value: "Other", icon: "more" },
  ];
  const symptomOptions: SemanticOption[] = [
    { value: "Cramps", icon: "cramps" },
    { value: "Lower belly pain", icon: "lowerBelly" },
    { value: "Pelvic pain", icon: "pelvicPain" },
    { value: "Vaginal pain", icon: "vaginalPain" },
    { value: "Burning", icon: "burning" },
    { value: "Irritation", icon: "irritation" },
    { value: "Dryness", icon: "dryness" },
    { value: "Itching", icon: "itching" },
    { value: "Spotting", icon: "spotting" },
    { value: "Bleeding", icon: "bleeding" },
    { value: "Discharge", icon: "discharge" },
    { value: "Bloating", icon: "bloating" },
    { value: "Nausea", icon: "nausea" },
    { value: "Headache", icon: "headache" },
    { value: "Dizziness", icon: "dizziness" },
    { value: "Fatigue", icon: "fatigue" },
    { value: "Hot flash", icon: "hotFlash" },
    { value: "Tetany symptoms", icon: "tetany" },
    { value: "Panic / anxiety", icon: "panic" },
    { value: "Urinary discomfort", icon: "urinary" },
  ];

  const chipClass = (active: boolean) => `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/75 ring-offset-2 ring-offset-background"
      : "bg-tint text-foreground ring-1 ring-border"
  }`;
  const symptomChipClass = (active: boolean) => `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/75 ring-offset-1 ring-offset-background"
      : "bg-tint text-foreground ring-1 ring-border"
  }`;

  const save = () => {
    const editing = !!initialEntry;
    const painful: PainfulWhen = painOn === true ? (painWhen === "after" ? "after" : "during") : "no";
    const entry: SexEntryUi = {
      id: initial?.id ?? schema?.sourceEntryId ?? crypto.randomUUID(),
      time: initial?.time ?? nowHHMM(),
      kind: kind ?? "sex",
      orgasm,
      protection: protection || undefined,
      contraception: initial?.contraception,
      symptomsAfter: symptomsAfter.length ? symptomsAfter : undefined,
      feelingAfter: feelingAfter ? [feelingAfter] : undefined,
      painful,
      painWhenUi: painOn === true ? painWhen : undefined,
      painScale: painOn === true ? painScaleValue : undefined,
      painLocations: painOn === true && painLocations.length ? painLocations : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      sex: editing ? (l.sex ?? []).map((x) => (x.id === entry.id ? entry : x)) : [...(l.sex ?? []), entry],
    }));
    onDone();
  };

  return <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pb-5">
    <SaveBar onCancel={onDone} onSave={save} />

    <section>
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">1. {t("Type")}</p>
      {renderCustomControls("type")}
      <div className="flex flex-wrap gap-2.5">
        {typeOptions.map((option) => (
          <button key={option.value} type="button" onClick={() => setKind(option.value)} className={chipClass(kind === option.value)}>
            <BixboSemanticIcon name={option.icon} size={17} />
            <span>{t(option.label ?? option.value)}</span>
          </button>
        ))}
        {customValues("type").map((value) => <button key={value} type="button" onClick={() => setKind(value as SexKind)} className={chipClass(kind === value)}><BixboSemanticIcon name="more" size={17} /><span>{value}</span></button>)}
      </div>
    </section>

    <section>
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">2. {t("Protection")}</p>
      {renderCustomControls("protection")}
      <div className="flex flex-wrap gap-2.5">
        {protectionOptions.map((option) => (
          <button key={option.value} type="button" onClick={() => setProtection(option.value)} className={chipClass(protection === option.value)}>
            <BixboSemanticIcon name={option.icon} size={17} />
            <span>{t(option.value)}</span>
          </button>
        ))}
        {customValues("protection").map((value) => <button key={value} type="button" onClick={() => setProtection(value)} className={chipClass(protection === value)}><BixboSemanticIcon name="shield" size={17} /><span>{value}</span></button>)}
      </div>
    </section>

    <section>
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">3. {t("How I feel after")}</p>
      {renderCustomControls("feeling")}
      <div className="flex flex-wrap gap-2.5">
        {feelingOptions.map((option) => (
          <button key={option.value} type="button" onClick={() => setFeelingAfter(feelingAfter === option.value ? "" : option.value)} className={chipClass(feelingAfter === option.value)}>
            <BixboSemanticIcon name={option.icon} size={17} />
            <span>{t(option.value)}</span>
          </button>
        ))}
        {customValues("feeling").map((value) => <button key={value} type="button" onClick={() => setFeelingAfter(feelingAfter === value ? "" : value)} className={chipClass(feelingAfter === value)}><BixboSemanticIcon name="good" size={17} /><span>{value}</span></button>)}
      </div>
    </section>

    <section>
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">4. {t("Pain")}</p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => setPainOn(false)} className={chipClass(painOn === false)}><BixboSemanticIcon name="good" size={17} /> {t("No")}</button>
        <button type="button" onClick={() => setPainOn(true)} className={chipClass(painOn === true)}><BixboSemanticIcon name="painYes" size={17} /> {t("Yes")}</button>
      </div>

      {painOn === true && (
        <div className="mt-3 rounded-3xl border border-border/80 bg-surface/40 p-3.5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("When")}</p>
              <div className="flex flex-wrap gap-2">
                {painWhenOptions.map((option) => (
                  <button key={option.value} type="button" onClick={() => setPainWhen(option.value)} className={chipClass(painWhen === option.value)}>
                    <BixboSemanticIcon name={option.icon} size={15} /> {t(option.label ?? option.value)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("Pain scale (1–10)")}</p>
              <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPainScaleValue(painScaleValue === value ? undefined : value)}
                    className={`h-8 w-8 shrink-0 rounded-full text-xs font-semibold transition ${painScaleValue === value ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground ring-1 ring-border"}`}
                    style={painScaleValue === value ? { background: painColor(value) } : undefined}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 font-serif text-sm font-semibold text-foreground">{t("Where")}</p>
            {renderCustomControls("where")}
            <div className="flex flex-wrap gap-2">
              {painLocationOptions.map((option) => {
                const active = painLocations.includes(option.value);
                return (
                  <button key={option.value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, option.value))} className={chipClass(active)}>
                    <BixboSemanticIcon name={option.icon} size={15} /> {t(option.value)}
                  </button>
                );
              })}
              {customValues("where").map((value) => { const active = painLocations.includes(value); return <button key={value} type="button" onClick={() => setPainLocations((current) => toggleIn(current, value))} className={chipClass(active)}><BixboSemanticIcon name="pelvicPain" size={15} /> {value}</button>; })}
            </div>
          </div>
        </div>
      )}
    </section>

    <section className="rounded-3xl border border-border/80 bg-surface/25 p-3.5">
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">5. {t("Symptoms after")}</p>
      {renderCustomControls("symptoms")}
      <div className="flex flex-wrap gap-2">
        {symptomOptions.map((option) => {
          const active = symptomsAfter.includes(option.value);
          return (
            <button key={option.value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, option.value)); }} className={symptomChipClass(active)}>
              <BixboSemanticIcon name={option.icon} size={15} />
              <span>{t(option.value)}</span>
              {active ? <Check className="h-3 w-3" /> : null}
            </button>
          );
        })}
        {customValues("symptoms").map((value) => { const active = symptomsAfter.includes(value); return <button key={value} type="button" onClick={() => { setSymptomsNone(false); setSymptomsAfter((current) => toggleIn(current, value)); }} className={symptomChipClass(active)}><BixboSemanticIcon name="more" size={15} /><span>{value}</span>{active ? <Check className="h-3 w-3" /> : null}</button>; })}
        <button type="button" onClick={() => { setSymptomsAfter([]); setSymptomsNone((current) => !current); }} className={symptomChipClass(symptomsNone)}>
          <BixboSemanticIcon name="none" size={15} /> {t("None")}
        </button>
      </div>
    </section>

    <section>
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">6. {t("Orgasm")}</p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => setOrgasm(orgasm === "yes" ? undefined : "yes")} className={chipClass(orgasm === "yes")}><BixboSemanticIcon name="orgasmYes" size={17} /> {t("Yes")}</button>
        <button type="button" onClick={() => setOrgasm(orgasm === "no" ? undefined : "no")} className={chipClass(orgasm === "no")}><BixboSemanticIcon name="orgasmNo" size={17} /> {t("No")}</button>
      </div>
    </section>

    <section>
      <p className="mb-2 font-serif text-lg font-semibold text-foreground">7. {t("Note (optional)")}</p>
      <Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("Add a note…")} className="rounded-3xl" />
    </section>

    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-surface/35 px-3 py-2.5 text-[11px] text-muted-foreground">
      <BixboSemanticIcon name="privacy" size={16} />
      <span>{t("Only you can see this. Your data is private and secure.")}</span>
    </div>
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
          <button key={n} type="button" onClick={() => setter(value === n ? undefined : n)} className={`h-9 w-9 shrink-0 rounded-full text-xs font-semibold transition ${value === n ? "text-white ring-[3px] ring-foreground" : "text-foreground"}`} style={{ background: painColor(n) }}>{n}</button>
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
      <Field label="Duration (min)" schemaFieldId="duration"><div className="grid grid-cols-3 gap-1.5">{durationOptions.map((value) => <button key={value} type="button" onClick={() => { setOngoing(false); setMinutes(String(value)); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!ongoing && Number(minutes) === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}>{value}</button>)}</div><Input type="number" min={1} inputMode="numeric" value={ongoing ? "" : minutes} placeholder={t("Custom minutes")} onChange={(e) => { setOngoing(false); setMinutes(e.target.value); }} className="mt-1.5 h-9 min-w-0 text-sm" /></Field>
    </section>
    <button type="button" onClick={() => setOngoing((value) => !value)} className={`flex h-10 items-center justify-between rounded-xl border px-3 text-sm font-medium ${ongoing ? "border-primary bg-primary/10" : "border-border bg-surface"}`}><span>{t("Still using now")}</span><span className={`relative h-5 w-9 rounded-full transition ${ongoing ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${ongoing ? "left-[18px]" : "left-0.5"}`} /></span></button>
    <section className="border-t border-border pt-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Body area")}</p><div className="flex flex-wrap gap-2">{bodyAreas.map((value) => <button key={value} type="button" onClick={() => setBodyArea(bodyArea === value ? "" : value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${bodyArea === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}>{t(value)}</button>)}</div></section>
    <section className="border-t border-border pt-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t(kind === "tens" ? "TENS intensity" : "Intensity")}</p><div className="flex flex-wrap gap-2">{(["low", "medium", "high"] as const).map((value) => <button key={value} type="button" onClick={() => setLevel(level === value ? undefined : value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${level === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}>{t(value)}</button>)}</div></section>
    <section className="border-t border-border pt-3"><p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Did it help?")}</p><div className="flex flex-wrap gap-2">{([ ["not-yet", "⏱️", "Not yet"], ["no", "🙁", "No"], ["little", "🙂", "A little"], ["moderate", "😊", "Moderate"], ["lot", "😁", "A lot"] ] as const).map(([value, icon, label]) => <button key={value} type="button" onClick={() => setEffectiveness(value)} className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${effectiveness === value ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-foreground/60" : "bg-tint text-foreground ring-1 ring-border"}`}><Ico e={icon} size={18} /><span className="leading-tight">{t(label)}</span></button>)}</div></section>
    <section className="border-t border-border pt-3"><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Pain before / after")} <span className="normal-case font-normal">({t("optional")})</span></p><span className="text-xs text-muted-foreground">/10</span></div><div className="space-y-2.5">{painScale("Before", painBefore, setPainBefore)}{painScale("After", painAfter, setPainAfter)}</div></section>
    <Field label="Note (optional)" schemaFieldId="note"><Textarea rows={2} maxLength={200} value={note} placeholder={t("Add note…")} onChange={(e) => setNote(e.target.value)} /><p className="mt-1 text-right text-[10px] text-muted-foreground">{note.length}/200</p></Field>
  </div>;
}