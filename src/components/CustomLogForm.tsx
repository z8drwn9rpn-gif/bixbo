import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import { MentalWellbeingForm } from "@/features/logging/MentalWellbeingForm";
import { painColor, nowHHMM, type BixboData, type CustomLogEntry, type CustomLogValue } from "@/lib/storage";
import type { CustomLogDefinition, RegistryFieldDefinition } from "@/lib/appRegistry";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function scaleValues(field: RegistryFieldDefinition): number[] {
  const rawMin = Number(field.scale?.min);
  const rawMax = Number(field.scale?.max);
  const rawStep = Number(field.scale?.step);
  const min = Number.isFinite(rawMin) ? rawMin : 0;
  const maxCandidate = Number.isFinite(rawMax) ? rawMax : 10;
  const max = maxCandidate > min ? maxCandidate : min + 1;
  const stepCandidate = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;
  const step = Math.min(stepCandidate, max - min);
  const count = Math.max(1, Math.min(101, Math.floor((max - min) / step) + 1));
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(4)));
}

function safeOptions(field: RegistryFieldDefinition): string[] {
  const seen = new Set<string>();
  return (field.options ?? [])
    .map((option) => option.trim())
    .filter((option) => option.length > 0 && !seen.has(option) && Boolean(seen.add(option)));
}

function CustomField({
  field,
  value,
  onChange,
}: {
  field: RegistryFieldDefinition;
  value: CustomLogValue | undefined;
  onChange: (value: CustomLogValue) => void;
}) {
  const { t } = useI18n();

  if (field.kind === "text") {
    return (
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <Textarea value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (field.kind === "number") {
    return (
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <Input
          type="number"
          inputMode="decimal"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        />
      </label>
    );
  }

  if (field.kind === "toggle") {
    const checked = value === true;
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange(false)} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${!checked ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("No")}</button>
          <button type="button" onClick={() => onChange(true)} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${checked ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("Yes")}</button>
        </div>
      </div>
    );
  }

  if (field.kind === "scale") {
    const values = scaleValues(field);
    return (
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <div className="flex flex-wrap gap-1.5">
          {values.map((number) => {
            const active = value === number;
            const min = field.scale?.min ?? values[0] ?? 0;
            const max = field.scale?.max ?? values.at(-1) ?? 10;
            const normalized = max === min ? 0 : ((number - min) / (max - min)) * 10;
            return (
              <button
                key={number}
                type="button"
                onClick={() => onChange(number)}
                className={`grid h-9 min-w-9 place-items-center rounded-full px-1.5 text-[11px] font-bold ${active ? "text-white ring-2 ring-foreground" : "text-foreground"}`}
                style={{ background: painColor(Math.max(0, Math.min(10, normalized))) }}
              >
                {Number.isInteger(number) ? number : number.toFixed(1)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  const options = safeOptions(field);
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-border ${active ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}
            >
              {t(field.optionLabels?.[option] ?? option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CustomLogForm({
  definition,
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  definition: CustomLogDefinition;
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: CustomLogEntry;
}) {
  const { t } = useI18n();
  // Seed the complete saved values object so hidden/legacy fields survive an edit.
  // Visible fields can overwrite their own values without deleting unrelated history.
  const [values, setValues] = useState<Record<string, CustomLogValue>>(() => ({ ...(initialEntry?.values ?? {}) }));
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const fields = useMemo(() => definition.fields.filter((field) => field.enabled !== false).sort((a, b) => a.order - b.order), [definition.fields]);

  if (definition.id === "mental-wellbeing") {
    return <MentalWellbeingForm date={date} data={data} update={update} onDone={onDone} />;
  }

  const save = () => {
    const entry: CustomLogEntry = {
      id: initialEntry?.id ?? uid(),
      // Editing must not silently move an old event to the current clock time.
      time: initialEntry?.time ?? nowHHMM(),
      values,
      note: note.trim() || undefined,
    };
    update((current) => {
      const day = current.dayLogs[date] ?? {};
      const customLogs = day.customLogs ?? {};
      const existing = customLogs[definition.id] ?? [];
      const nextEntries = initialEntry
        ? existing.map((saved) => (saved.id === initialEntry.id ? entry : saved))
        : [...existing, entry];
      return {
        ...current,
        dayLogs: {
          ...current.dayLogs,
          [date]: {
            ...day,
            customLogs: {
              ...customLogs,
              [definition.id]: nextEntries,
            },
          },
        },
      };
    });
    onDone();
  };

  return (
    <div className="space-y-5 py-4">
      <div className="rounded-3xl bg-surface p-4 ring-1 ring-border/80">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-tint text-2xl">{definition.icon}</span>
          <div>
            <h2 className="font-serif text-xl font-bold">{t(definition.label)}</h2>
            <p className="text-xs text-muted-foreground">{t("Custom log")}</p>
          </div>
        </div>
      </div>

      {fields.map((field) => (
        <CustomField
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(next) => setValues((current) => ({ ...current, [field.id]: next }))}
        />
      ))}

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">{t("Note (optional)")}</span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>

      <div className="flex gap-2 pb-8">
        <Button type="button" variant="outline" className="flex-1" onClick={onDone}>{t("Cancel")}</Button>
        <Button type="button" className="flex-1" onClick={save}>{t("Save")}</Button>
      </div>
    </div>
  );
}
