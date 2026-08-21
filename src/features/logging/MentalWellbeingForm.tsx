import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Ico } from "@/components/icons/BixboExtraIcons";
import { Pencil, Trash2, X } from "@/components/icons/BixboExtraIcons";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { nowHHMM, painColor, updateDayLog, type BixboData, type DayLog } from "@/lib/storage";
import { CustomChipList, type UpdateFn } from "./LogFormPrimitives";

export interface MentalWellbeingEntry {
  id: string;
  time: string;
  distress: number;
  states: string[];
  factors: string[];
  note?: string;
}

type MentalDayLog = DayLog & { mentalWellbeing?: MentalWellbeingEntry[] };
type MentalSettingsExtension = {
  mentalWellbeingStates?: string[];
  mentalWellbeingFactors?: string[];
};

const MENTAL_STATES = [
  "😰 Anxious",
  "😵‍💫 Overwhelmed",
  "😔 Low mood",
  "😪 Mentally exhausted",
  "😒 Irritable",
  "✨ Panic",
  "🥱 Restless",
  "😐 Numb / disconnected",
  "😢 Crying / emotional",
] as const;

const MENTAL_FACTORS = [
  "🌙 Poor sleep",
  "🔥 Pain / physical symptoms",
  "🩸 Hormones / cycle",
  "💊 Medication",
  "👥 People / social",
  "📝 Work / responsibilities",
  "☕ Caffeine",
  "🌿 Unknown / no clear reason",
] as const;

const SCALE_ROWS: Array<[number, string, string]> = [
  [0, "None", "I feel mentally well."],
  [1, "Very mild", "Slightly off, barely noticeable."],
  [2, "Mild", "I don't feel quite okay, but it doesn't really affect me."],
  [3, "Uncomfortable", "Noticeably mentally or emotionally unwell."],
  [4, "Moderate", "It affects my mood or functioning, but it is manageable."],
  [5, "Distressing", "Harder to concentrate, relax, or function normally."],
  [6, "Strong", "Clearly struggling and having difficulty functioning normally."],
  [7, "Severe", "Very distressed; normal activities are difficult."],
  [8, "Very severe", "Overwhelmed; functioning is very difficult."],
  [9, "Extreme", "Extremely distressed; barely able to cope or function."],
  [10, "Worst possible", "Worst mental or emotional distress I can imagine."],
];

function scaleLabel(value: number) {
  return SCALE_ROWS[Math.round(value)]?.[1] ?? "None";
}

function scaleDescription(value: number) {
  return SCALE_ROWS[Math.round(value)]?.[2] ?? "I feel mentally well.";
}

export function MentalWellbeingForm({
  date,
  data,
  update,
  onDone,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const savedEntries = ((data.dayLogs[date] as MentalDayLog | undefined)?.mentalWellbeing ?? []);
  const mentalSettings = data.settings as typeof data.settings & MentalSettingsExtension;
  const customStates = mentalSettings.mentalWellbeingStates ?? [];
  const customFactors = mentalSettings.mentalWellbeingFactors ?? [];

  const [step, setStep] = useState<1 | 2>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [time, setTime] = useState(nowHHMM());
  const [distress, setDistress] = useState(0);
  const [states, setStates] = useState<string[]>([]);
  const [factors, setFactors] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [scaleInfoOpen, setScaleInfoOpen] = useState(false);

  const selectedEntry = savedEntries.find((entry) => entry.id === editingId);

  const loadEntry = (entry: MentalWellbeingEntry) => {
    setEditingId(entry.id);
    setTime(entry.time || nowHHMM());
    setDistress(entry.distress);
    setStates(entry.states ?? []);
    setFactors(entry.factors ?? []);
    setNote(entry.note ?? "");
    setStep(1);
  };

  const reset = () => {
    setEditingId(null);
    setTime(nowHHMM());
    setDistress(0);
    setStates([]);
    setFactors([]);
    setNote("");
    setStep(1);
  };

  const updateMentalSettings = (key: "mentalWellbeingStates" | "mentalWellbeingFactors", next: string[]) => {
    const unique = [...new Set(next.map((value) => value.trim()).filter(Boolean))];
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: unique,
      } as typeof current.settings,
    }));
  };

  const save = () => {
    const entry: MentalWellbeingEntry = {
      id: editingId ?? crypto.randomUUID(),
      time,
      distress,
      states,
      factors,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (log) => {
      const current = log as MentalDayLog;
      const existing = current.mentalWellbeing ?? [];
      return {
        ...log,
        mentalWellbeing: editingId
          ? existing.map((item) => item.id === editingId ? entry : item)
          : [...existing, entry],
      } as MentalDayLog;
    });
    onDone();
  };

  const deleteEntry = (id: string) => {
    if (!window.confirm(t("Delete this mental wellbeing entry?"))) return;
    updateDayLog(update, date, (log) => {
      const current = log as MentalDayLog;
      return {
        ...log,
        mentalWellbeing: (current.mentalWellbeing ?? []).filter((entry) => entry.id !== id),
      } as MentalDayLog;
    });
    if (editingId === id) reset();
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      <div className="relative z-10 border-b border-border/70 bg-background/95 px-4 py-3 shadow-sm sm:px-5">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="shrink-0 text-sm font-semibold text-foreground"
            >
              ← {t("Back")}
            </button>
          ) : (
            <div className="w-[54px] shrink-0" />
          )}

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2 w-9 rounded-full bg-primary" />
              <span className={`h-2 w-9 rounded-full ${step === 2 ? "bg-primary" : "bg-primary/10"}`} />
            </div>
            <span className="text-sm font-semibold text-foreground/75">{step}/2</span>
          </div>

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm"
            >
              {t("Next")} →
            </button>
          ) : (
            <button
              type="button"
              onClick={save}
              className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm"
            >
              {t("Save")} ✓
            </button>
          )}
        </div>
      </div>

      {step === 1 ? (
        <div className="px-4 pb-10 pt-6 sm:px-5">
          <section className="flex flex-col items-center gap-5 pb-1 pt-1">
            <div className="mt-1 text-center">
              <h2 className="font-serif text-[22px] leading-tight text-foreground">{t("How mentally / emotionally unwell do you feel right now?")}</h2>
              <p className="mt-1.5 text-sm text-foreground/80">{t("Rate from 0 (I feel mentally well) to 10 (worst mental distress imaginable).")}</p>
            </div>

            <div className="grid h-32 w-32 place-items-center rounded-full text-white shadow-sm" style={{ background: painColor(distress) }}>
              <div className="text-5xl font-bold leading-none">{Number.isInteger(distress) ? distress : distress.toFixed(1)}</div>
            </div>
            <div className="-mt-2 text-center">
              <p className="text-sm font-semibold text-foreground">{t(scaleLabel(distress))}</p>
              <p className="mt-1 max-w-[300px] text-xs leading-relaxed text-muted-foreground">{t(scaleDescription(distress))}</p>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <p className="text-center text-sm font-semibold text-foreground">{t("Mental distress scale")}</p>
              <button
                type="button"
                onClick={() => setScaleInfoOpen((open) => !open)}
                aria-label={t("Mental distress scale information")}
                aria-expanded={scaleInfoOpen}
                className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-[10px] font-bold leading-none text-primary ring-1 ring-primary/25"
              >
                i
              </button>
            </div>

            <div className="w-full max-w-md px-3">
              <Slider value={[distress * 2]} min={0} max={20} step={1} onValueChange={([value]) => setDistress(value / 2)} />
            </div>

            <div className="grid w-fit max-w-full grid-cols-7 justify-center gap-2 px-1">
              {Array.from({ length: 21 }, (_, index) => index / 2).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDistress(value)}
                  title={`${value} — ${t(scaleLabel(value))}`}
                  aria-label={`${value} — ${t(scaleLabel(value))}`}
                  className={`h-9 w-9 shrink-0 rounded-full text-xs font-semibold transition ${distress === value ? "text-white ring-[3px] ring-foreground" : "text-foreground"}`}
                  style={{ background: painColor(value) }}
                >
                  {Number.isInteger(value) ? value : value.toFixed(1)}
                </button>
              ))}
            </div>

            <div className="mt-1 flex max-w-[300px] items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 text-left text-xs leading-relaxed text-foreground/80">
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10">
                <Ico e="💡" size={18} />
              </span>
              <span>{t("Use this scale separately from physical pain so you can see mental wellbeing patterns over time.")}</span>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-5 px-4 pb-8 pt-5 sm:px-5">
          {savedEntries.length ? (
            <section className="rounded-2xl border border-border/70 bg-surface/70 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("Today's mental wellbeing logs")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("Tap a saved entry to edit it.")}</p>
                </div>
                {selectedEntry ? (
                  <button type="button" onClick={reset} className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold ring-1 ring-border">
                    {t("New entry")}
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {savedEntries.map((entry) => (
                  <div key={entry.id} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => loadEntry(entry)}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-border ${editingId === entry.id ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{entry.time} · {Number.isInteger(entry.distress) ? entry.distress : entry.distress.toFixed(1)}/10</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      aria-label={t("Delete")}
                      className="grid h-8 w-8 place-items-center rounded-full bg-background text-destructive ring-1 ring-border"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="max-w-[270px] space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("Time")}</p>
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-10 rounded-2xl" />
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">{t("What are you experiencing?")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("Select all that apply. Use + to add your own, or Edit to rename and remove custom options.")}</p>
            </div>
            <CustomChipList
              base={[...MENTAL_STATES]}
              custom={customStates}
              onAddCustom={(value) => updateMentalSettings("mentalWellbeingStates", [...customStates, value])}
              onRemoveCustom={(value) => {
                updateMentalSettings("mentalWellbeingStates", customStates.filter((item) => item !== value));
                setStates((current) => current.filter((item) => item !== value));
              }}
              onRenameCustom={(oldValue, newValue) => {
                updateMentalSettings("mentalWellbeingStates", customStates.map((item) => item === oldValue ? newValue : item));
                setStates((current) => current.map((item) => item === oldValue ? newValue : item));
              }}
              selected={states}
              onToggle={(value) => setStates((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
            />
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">{t("What may be affecting it?")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("Choose any factors that feel relevant. You can add and edit your own options too.")}</p>
            </div>
            <CustomChipList
              base={[...MENTAL_FACTORS]}
              custom={customFactors}
              onAddCustom={(value) => updateMentalSettings("mentalWellbeingFactors", [...customFactors, value])}
              onRemoveCustom={(value) => {
                updateMentalSettings("mentalWellbeingFactors", customFactors.filter((item) => item !== value));
                setFactors((current) => current.filter((item) => item !== value));
              }}
              onRenameCustom={(oldValue, newValue) => {
                updateMentalSettings("mentalWellbeingFactors", customFactors.map((item) => item === oldValue ? newValue : item));
                setFactors((current) => current.map((item) => item === oldValue ? newValue : item));
              }}
              selected={factors}
              onToggle={(value) => setFactors((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
            />
          </section>

          <section className="space-y-1.5 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">{t("Note (optional)")}</p>
            <Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} className="rounded-2xl" />
          </section>
        </div>
      )}

      {scaleInfoOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[1px]"
          role="presentation"
          onClick={() => setScaleInfoOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("The Mental Distress Scale")}
            className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-lg overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">i</span>
                <h3 className="font-serif text-lg font-semibold">{t("The Mental Distress Scale")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setScaleInfoOpen(false)}
                aria-label={t("Close")}
                className="grid h-8 w-8 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[72dvh] overflow-y-auto rounded-2xl border border-border/60 bg-surface/40">
              {SCALE_ROWS.map(([level, label, description]) => {
                const active = Math.round(distress) === level;
                return (
                  <div key={level} className={`flex gap-3 border-b border-border/50 px-3 py-2.5 last:border-b-0 ${active ? "bg-primary/10" : "bg-background/60"}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: painColor(level) }}>
                      {level}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-sm leading-tight ${active ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>{t(label)}</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t(description)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
