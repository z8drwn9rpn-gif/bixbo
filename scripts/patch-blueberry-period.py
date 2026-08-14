from pathlib import Path

# Extend typed period entry with the two new persisted fields.
types_path = Path("src/lib/storage/types.ts")
types_text = types_path.read_text()
old_period = '''export interface PeriodEntry {
  level: PeriodLevel;
  discharge?: string;
  dischargeNote?: string;
  note?: string;
  cramps?: number;
}'''
new_period = '''export interface PeriodEntry {
  level: PeriodLevel;
  discharge?: string;
  dischargeNote?: string;
  symptoms?: string[];
  clots?: "none" | "small" | "medium" | "large";
  note?: string;
  cramps?: number;
}'''
if old_period not in types_text:
    raise SystemExit("PeriodEntry block not found")
types_path.write_text(types_text.replace(old_period, new_period, 1))

form_path = Path("src/features/logging/CycleForms.tsx")
text = form_path.read_text()

old_state = '''  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");'''
new_state = '''  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [periodSymptoms, setPeriodSymptoms] = useState<string[]>(cur?.symptoms ?? []);
  const [clots, setClots] = useState<"none" | "small" | "medium" | "large" | "">(cur?.clots ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");'''
if old_state not in text:
    raise SystemExit("Blueberry state anchor not found")
text = text.replace(old_state, new_state, 1)

old_save = '''        discharge: discharge || undefined,
        dischargeNote: dNote.trim() || undefined,
        note: note.trim() || undefined,
        cramps: cur?.cramps,'''
new_save = '''        discharge: discharge || undefined,
        dischargeNote: dNote.trim() || undefined,
        symptoms: periodSymptoms.length ? periodSymptoms : undefined,
        clots: clots || undefined,
        note: note.trim() || undefined,
        cramps: cur?.cramps,'''
if old_save not in text:
    raise SystemExit("Blueberry save anchor not found")
text = text.replace(old_save, new_save, 1)

old_constants = '''  ];
  const sectionLabel = "mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground";'''
new_constants = '''  ];
  const PERIOD_SYMPTOMS = [
    "Cramps", "Lower belly pain", "Lower back pain", "Bloating", "Headache",
    "Nausea", "Fatigue", "Mood changes", "Breast tenderness", "Acne",
  ];
  const CLOT_OPTIONS = [
    ["none", "None"], ["small", "Small"], ["medium", "Medium"], ["large", "Large"],
  ] as const;
  const sectionLabel = "mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground";'''
if old_constants not in text:
    raise SystemExit("Blueberry constants anchor not found")
text = text.replace(old_constants, new_constants, 1)

anchor = '''      <div className="border-t border-border/60" />

      <section>
        <p className={sectionLabel}>{t("Day note (optional)")}</p>'''
insert = '''      <div className="border-t border-border/60" />

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
        <p className={sectionLabel}>{t("Day note (optional)")}</p>'''
if anchor not in text:
    raise SystemExit("Blueberry Day note anchor not found")
text = text.replace(anchor, insert, 1)
form_path.write_text(text)
