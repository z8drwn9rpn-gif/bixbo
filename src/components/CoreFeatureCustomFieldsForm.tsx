import type { CSSProperties } from "react";

import type { CustomLogValue } from "@/lib/storage";
import type { RegistryFieldDefinition } from "@/lib/appRegistry";
import { useI18n } from "@/hooks/useI18n";

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

export function CoreFeatureCustomFieldInput({
  field,
  value,
  onChange,
  style,
  className = "",
}: {
  field: RegistryFieldDefinition;
  value: CustomLogValue | undefined;
  onChange: (value: CustomLogValue) => void;
  style?: CSSProperties;
  className?: string;
}) {
  const { t } = useI18n();
  const shellClass = `space-y-1.5 rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${className}`.trim();

  if (field.kind === "text") {
    return (
      <label className={shellClass} style={style} data-bixbo-log-field-id={field.id}>
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-20 w-full rounded-2xl bg-tint p-3 text-sm ring-1 ring-border"
        />
      </label>
    );
  }

  if (field.kind === "number") {
    return (
      <label className={shellClass} style={style} data-bixbo-log-field-id={field.id}>
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <input
          type="number"
          inputMode="decimal"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          className="h-10 w-full rounded-2xl bg-tint px-3 text-sm ring-1 ring-border"
        />
      </label>
    );
  }

  if (field.kind === "toggle") {
    return (
      <div className={shellClass} style={style} data-bixbo-log-field-id={field.id}>
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange(false)} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${value === false ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("No")}</button>
          <button type="button" onClick={() => onChange(true)} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${value === true ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("Yes")}</button>
        </div>
      </div>
    );
  }

  if (field.kind === "scale") {
    const numbers = scaleValues(field);
    return (
      <div className={`${shellClass} space-y-2`} style={style} data-bixbo-log-field-id={field.id}>
        <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
        <div className="flex flex-wrap gap-1.5">
          {numbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => onChange(number)}
              className={`grid h-9 min-w-9 place-items-center rounded-full px-1.5 text-[11px] font-bold ring-1 ring-border ${value === number ? "bg-primary text-primary-foreground" : "bg-tint"}`}
            >
              {Number.isInteger(number) ? number : number.toFixed(1)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  return (
    <div className={`${shellClass} space-y-2`} style={style} data-bixbo-log-field-id={field.id}>
      <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
      <div className="flex flex-wrap gap-2">
        {safeOptions(field).map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-border ${active ? "bg-primary text-primary-foreground" : "bg-tint"}`}
            >
              {t(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CoreFeatureCustomFieldsForm({
  fields,
  values,
  onChange,
}: {
  fields: RegistryFieldDefinition[];
  values: Record<string, CustomLogValue>;
  onChange: (fieldId: string, value: CustomLogValue) => void;
}) {
  const { t } = useI18n();
  if (!fields.length) return null;

  return (
    <section className="mt-5 space-y-4 rounded-3xl bg-surface p-4 ring-1 ring-border/80">
      <div>
        <p className="text-sm font-bold">{t("Custom fields")}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{t("Admin-added supplementary fields")}</p>
      </div>
      {fields.map((field) => (
        <CoreFeatureCustomFieldInput
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
    </section>
  );
}
