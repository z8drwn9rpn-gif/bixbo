import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { nowHHMM, updateDayLog, type DayLog } from "@/lib/storage";
import { Chip, Field, SaveBar, toggleIn, type UpdateFn } from "./LogFormPrimitives";

export type EyesPainIntensity = "none" | "something" | "severe";

export interface EyesEpisode {
  id: string;
  time: string;
  affected: "left" | "right" | "both";
  painIntensity: EyesPainIntensity;
  painWithMovement: boolean;
  visionChanges: string[];
  note?: string;
}

type DayLogWithEyes = DayLog & { eyes?: EyesEpisode[] };

const VISION_CHANGES = [
  "Blurred vision",
  "Dim vision",
  "Colors less vivid",
  "Visual field change",
] as const;

const PAIN_INTENSITY_OPTIONS: Array<{ value: EyesPainIntensity; label: string; face: string }> = [
  { value: "none", label: "No pain", face: "☺" },
  { value: "something", label: "Feeling something there", face: "◉" },
  { value: "severe", label: "Severe pain", face: "☹" },
];

export function EyesForm({
  date,
  update,
  onDone,
  initialEntry,
  embedded = false,
  onDraftChange,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: EyesEpisode;
  embedded?: boolean;
  onDraftChange?: (entry: EyesEpisode) => void;
}) {
  const { t } = useI18n();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [affected, setAffected] = useState<EyesEpisode["affected"]>(initialEntry?.affected ?? "both");
  const [painIntensity, setPainIntensity] = useState<EyesPainIntensity>(initialEntry?.painIntensity ?? "none");
  const [painWithMovement, setPainWithMovement] = useState(initialEntry?.painWithMovement ?? false);
  const [visionChanges, setVisionChanges] = useState<string[]>(initialEntry?.visionChanges ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const draftId = useRef(initialEntry?.id ?? crypto.randomUUID()).current;

  const draft = useMemo<EyesEpisode>(
    () => ({
      id: draftId,
      time,
      affected,
      painIntensity,
      painWithMovement,
      visionChanges,
      note: note.trim() || undefined,
    }),
    [affected, draftId, note, painIntensity, painWithMovement, time, visionChanges],
  );

  useEffect(() => {
    if (embedded) onDraftChange?.(draft);
  }, [draft, embedded, onDraftChange]);

  const save = () => {
    const editing = Boolean(initialEntry);
    updateDayLog(update, date, (log) => {
      const current = log as DayLogWithEyes;
      return {
        ...log,
        eyes: editing
          ? (current.eyes ?? []).map((entry) => (entry.id === draft.id ? draft : entry))
          : [...(current.eyes ?? []), draft],
      };
    });
    onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      {!embedded && <SaveBar onCancel={onDone} onSave={save} />}
      <div className="space-y-4">
        <Field label="Time">
          <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full" />
        </Field>

        <Field label="Affected eye">
          <div className="mt-2 flex flex-wrap gap-2">
            {([
              ["left", "Left"],
              ["right", "Right"],
              ["both", "Both"],
            ] as const).map(([value, label]) => (
              <Chip key={value} active={affected === value} onClick={() => setAffected(value)}>
                {t(label)}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Pain intensity">
          <p className="mt-1 text-xs text-muted-foreground">{t("How intense is the pain?")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PAIN_INTENSITY_OPTIONS.map((option) => {
              const active = painIntensity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPainIntensity(option.value)}
                  aria-pressed={active}
                  className={`min-h-[104px] rounded-2xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border-primary/35 bg-primary/10 text-foreground"
                      : "border-border bg-surface text-foreground hover:bg-tint"
                  }`}
                >
                  <span className="block text-2xl leading-none text-primary" aria-hidden="true">{option.face}</span>
                  <span className="mt-2 block text-xs font-semibold leading-tight">{t(option.label)}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Pain with eye movement">
          <p className="mt-1 text-xs text-muted-foreground">{t("Does it hurt when you move your eyes?")}</p>
          <div className="mt-2 flex gap-2">
            <Chip active={!painWithMovement} onClick={() => setPainWithMovement(false)}>
              {t("No")}
            </Chip>
            <Chip active={painWithMovement} onClick={() => setPainWithMovement(true)}>
              {t("Yes")}
            </Chip>
          </div>
        </Field>

        <Field label="Vision changes">
          <div className="mt-2 flex flex-wrap gap-2">
            {VISION_CHANGES.map((value) => (
              <Chip
                key={value}
                active={visionChanges.includes(value)}
                onClick={() => setVisionChanges((current) => toggleIn(current, value))}
              >
                {t(value)}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Note (optional)">
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
    </div>
  );
}
