import { useEffect, useMemo, useRef, useState } from "react";
import { BixboSafeText } from "@/components/icons/BixboSafeText";
import { BixboEyePainIcon, BixboEyeSensitivityIcon } from "@/components/icons/BixboWellnessIcons";
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
  sensitivity?: string[];
  visionChanges: string[];
  note?: string;
}

type DayLogWithEyes = DayLog & { eyes?: EyesEpisode[] };
type EyesSettingsExtension = {
  eyesVisionChanges?: string[];
  eyesSensitivityOptions?: string[];
};

const HIDDEN_EYES_SENSITIVITY_OPTIONS = new Set(["Other"]);

export const EYES_VISION_CHANGES = [
  "Blurred vision",
  "Dim vision",
  "Colors less vivid",
  "Visual field change",
] as const;

export const EYES_SENSITIVITY_OPTIONS = [
  { value: "Sensitive to light", icon: "light" },
  { value: "Screen hurts", icon: "screen" },
  { value: "More watery eyes", icon: "watery" },
  { value: "Feel strain", icon: "strain" },
  { value: "Twitching / tetany feeling", icon: "twitch" },
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
  const [sensitivity, setSensitivity] = useState<string[]>(
    () => (initialEntry?.sensitivity ?? []).filter((value) => !HIDDEN_EYES_SENSITIVITY_OPTIONS.has(value)),
  );
  const [visionChanges, setVisionChanges] = useState<string[]>(initialEntry?.visionChanges ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [addingSensitivity, setAddingSensitivity] = useState(false);
  const [customSensitivityText, setCustomSensitivityText] = useState("");
  const draftId = useRef(initialEntry?.id ?? crypto.randomUUID()).current;

  const eyesSettings = data.settings as typeof data.settings & EyesSettingsExtension;
  const customVisionChanges = (eyesSettings.eyesVisionChanges ?? []).filter(
    (value) => !EYES_VISION_CHANGES.includes(value as (typeof EYES_VISION_CHANGES)[number]),
  );
  const customSensitivityOptions = (eyesSettings.eyesSensitivityOptions ?? []).filter(
    (value) => (
      !HIDDEN_EYES_SENSITIVITY_OPTIONS.has(value)
      && !EYES_SENSITIVITY_OPTIONS.some((option) => option.value === value)
    ),
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

  const setCustomSensitivityOptions = (next: string[]) => {
    const unique = [...new Set(next.map((value) => value.trim()).filter(Boolean))].filter(
      (value) => (
        !HIDDEN_EYES_SENSITIVITY_OPTIONS.has(value)
        && !EYES_SENSITIVITY_OPTIONS.some((option) => option.value === value)
      ),
    );
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        eyesSensitivityOptions: unique,
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
      sensitivity,
      visionChanges,
      note: note.trim() || undefined,
    }),
    [affected, draftId, note, painIntensity, painWithMovement, sensitivity, time, visionChanges],
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

  const toggleSensitivity = (value: string) => {
    setSensitivity((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
  };

  const addCustomSensitivity = () => {
    const value = customSensitivityText.trim();
    if (!value || HIDDEN_EYES_SENSITIVITY_OPTIONS.has(value)) return;
    if (!customSensitivityOptions.includes(value) && !EYES_SENSITIVITY_OPTIONS.some((option) => option.value === value)) {
      setCustomSensitivityOptions([...customSensitivityOptions, value]);
    }
    setSensitivity((current) => (current.includes(value) ? current : [...current, value]));
    setCustomSensitivityText("");
    setAddingSensitivity(false);
  };

  const removeCustomSensitivity = (value: string) => {
    setCustomSensitivityOptions(customSensitivityOptions.filter((item) => item !== value));
    setSensitivity((current) => current.filter((item) => item !== value));
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
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {EYES_PAIN_INTENSITY_OPTIONS.map((option) => {
              const active = painIntensity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPainIntensity(option.value)}
                  aria-pressed={active}
                  className={`min-h-[86px] rounded-2xl border px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-surface text-foreground hover:bg-tint"
                  }`}
                >
                  <span className="mx-auto grid h-8 w-8 place-items-center" aria-hidden="true">
                    <BixboEyePainIcon level={option.level} size={32} />
                  </span>
                  <span className="mt-1.5 block text-[10px] font-semibold leading-[1.08]">{t(option.label)}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Eye sensitivity / tetany episode">
          <p className="mt-1 text-xs text-muted-foreground">{t("Are your eyes more sensitive than usual?")}</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {EYES_SENSITIVITY_OPTIONS.map((option) => {
              const active = sensitivity.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSensitivity(option.value)}
                  aria-pressed={active}
                  className={`min-h-[86px] rounded-2xl border px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-surface text-foreground hover:bg-tint"
                  }`}
                >
                  <span className="mx-auto grid h-8 w-8 place-items-center" aria-hidden="true">
                    <BixboEyeSensitivityIcon variant={option.icon} size={32} />
                  </span>
                  <span className="mt-1.5 block text-[10px] font-semibold leading-[1.08]">{t(option.value)}</span>
                </button>
              );
            })}

            {customSensitivityOptions.map((value) => {
              const active = sensitivity.includes(value);
              return (
                <div key={value} className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleSensitivity(value)}
                    aria-pressed={active}
                    className={`flex min-h-[86px] w-full items-center justify-center rounded-2xl border px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                        : "border-border bg-surface text-foreground hover:bg-tint"
                    }`}
                  >
                    <BixboSafeText
                      text={value}
                      size={20}
                      className="block break-words text-[10px] font-semibold leading-[1.08]"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`${t("Remove")} “${value}”?`)) removeCustomSensitivity(value);
                    }}
                    aria-label={`${t("Remove")} ${value}`}
                    className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-background/90 text-[10px] font-bold leading-none text-muted-foreground shadow-sm ring-1 ring-border/70"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setAddingSensitivity(true)}
              className="min-h-[86px] rounded-2xl border border-dashed border-primary/35 bg-primary/[0.04] px-1 py-2 text-center text-foreground transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mx-auto grid h-8 w-8 place-items-center" aria-hidden="true">
                <BixboEyeSensitivityIcon variant="custom" size={32} />
              </span>
              <span className="mt-1.5 block text-[10px] font-semibold leading-[1.08]">{t("Add custom")}</span>
            </button>
          </div>

          {addingSensitivity ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-2xl border border-border bg-surface p-2">
              <Input
                value={customSensitivityText}
                onChange={(event) => setCustomSensitivityText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomSensitivity();
                  }
                }}
                placeholder={t("Custom…")}
                className="h-8 min-w-0 flex-1"
                autoFocus
              />
              <button
                type="button"
                onClick={addCustomSensitivity}
                disabled={!customSensitivityText.trim() || HIDDEN_EYES_SENSITIVITY_OPTIONS.has(customSensitivityText.trim())}
                className="h-8 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
              >
                {t("Add")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingSensitivity(false);
                  setCustomSensitivityText("");
                }}
                className="h-8 rounded-full bg-tint px-3 text-[11px] font-semibold text-foreground"
              >
                {t("Cancel")}
              </button>
            </div>
          ) : null}
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
