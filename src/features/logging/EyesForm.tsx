import { useEffect, useMemo, useRef, useState } from "react";
import { BixboEyePainIcon } from "@/components/icons/BixboWellnessIcons";
import { useI18n } from "@/hooks/useI18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { nowHHMM, updateDayLog, useBixbo, type DayLog } from "@/lib/storage";
import { CustomChipList, Chip, Field, SaveBar, type UpdateFn } from "./LogFormPrimitives";

export type EyesPainIntensity = "none" | "something" | "mild" | "moderate" | "severe";

export interface EyesEpisode {
  id: string;
  time: string;
  affected: "left" | "right" | "both";
  painIntensity?: EyesPainIntensity;
  painWithMovement: boolean;
  visionChanges: string[];
  note?: string;
}

type DayLogWithEyes = DayLog & { eyes?: EyesEpisode[] };
type EyesSettingsExtension = { eyesVisionChanges?: string[] };

export const EYES_VISION_CHANGES = [
  "Blurred vision",
  "Dim vision",
  "Colors less vivid",
  "Visual field change",
] as const;

export const EYES_PAIN_INTENSITY_OPTIONS: Array<{
  value: EyesPainIntensity;
  label: string;
  level: 0 | 1 | 2 | 3 | 4;
}> = [
  { value: "none", label: "No pain", level: 0 },
  { value: "something", label: "Feeling something there", level: 1 },
  { value: "mild", label: "Mild pain", level: 2 },
  { value: "moderate", label: "Moderate pain", level: 3 },
  { value: "severe", label: "Severe pain", level: 4 },
];

export function eyesPainIntensityLabel(intensity: EyesPainIntensity | undefined): string {
  return EYES_PAIN_INTENSITY_OPTIONS.find((option) => option.value === intensity)?.label ?? "No pain";
}

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
  const { data } = useBixbo();
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [affected, setAffected] = useState<EyesEpisode["affected"]>(initialEntry?.affected ?? "both");
  const [painIntensity, setPainIntensity] = useState<EyesPainIntensity>(initialEntry?.painIntensity ?? "none");
  const [painWithMovement, setPainWithMovement] = useState(initialEntry?.painWithMovement ?? false);
  const [visionChanges, setVisionChanges] = useState<string[]>(initialEntry?.visionChanges ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const draftId = useRef(initialEntry?.id ?? crypto.randomUUID()).current;

  const eyesSettings = data.settings as typeof data.settings & EyesSettingsExtension;
  const customVisionChanges = (eyesSettings.eyesVisionChanges ?? []).filter(
    (value) => !EYES_VISION_CHANGES.includes(value as (typeof EYES_VISION_CHANGES)[number]),
  );

  const setCustomVisionChanges = (next: string[]) => {
    const unique = [...new Set(next.map((value) => value.trim()).filter(Boolean))].filter(
      (value) => !EYES_VISION_CHANGES.includes(value as (typeof EYES_VISION_CHANGES)[number]),
    );
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        eyesVisionChanges: unique,
      } as typeof current.settings,
    }));
  };

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
        {!embedded ? (
          <Field label="Time">
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full" />
          </Field>
        ) : null}

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
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {EYES_PAIN_INTENSITY_OPTIONS.map((option) => {
              const active = painIntensity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPainIntensity(option.value)}
                  aria-pressed={active}
                  className={`min-h-[104px] rounded-2xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-surface text-foreground hover:bg-tint"
                  }`}
                >
                  <span className="mx-auto grid h-11 w-11 place-items-center" aria-hidden="true">
                    <BixboEyePainIcon level={option.level} size={44} />
                  </span>
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
          <CustomChipList
            base={[...EYES_VISION_CHANGES]}
            custom={customVisionChanges}
            onAddCustom={(value) => setCustomVisionChanges([...customVisionChanges, value])}
            onRemoveCustom={(value) => {
              setCustomVisionChanges(customVisionChanges.filter((item) => item !== value));
              setVisionChanges((current) => current.filter((item) => item !== value));
            }}
            onRenameCustom={(oldValue, newValue) => {
              setCustomVisionChanges(customVisionChanges.map((item) => (item === oldValue ? newValue : item)));
              setVisionChanges((current) => current.map((item) => (item === oldValue ? newValue : item)));
            }}
            selected={visionChanges}
            onToggle={(value) => setVisionChanges((current) => (
              current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
            ))}
          />
        </Field>

        <Field label="Note (optional)">
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
    </div>
  );
}
