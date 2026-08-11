import type { CustomLogValue } from "@/lib/storage";
import type { RegistryFieldDefinition } from "@/lib/appRegistry";
import { useI18n } from "@/hooks/useI18n";

function scaleValues(field: RegistryFieldDefinition): number[] {
  const min = field.scale?.min ?? 0;
  const max = field.scale?.max ?? 10;
  const step = field.scale?.step && field.scale.step > 0 ? field.scale.step : 1;
  const count = Math.max(1, Math.min(101, Math.floor((max - min) / step) + 1));
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(4)));
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

      {fields.map((field) => {
        const value = values[field.id];
        if (field.kind === "text") {
          return (
            <label key={field.id} className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
              <textarea value={typeof value === "string" ? value : ""} onChange={(event) => onChange(field.id, event.target.value)} className="min-h-20 w-full rounded-2xl bg-tint p-3 text-sm ring-1 ring-border" />
            </label>
          );
        }
        if (field.kind === "number") {
          return (
            <label key={field.id} className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
              <input type="number" inputMode="decimal" value={typeof value === "number" ? value : ""} onChange={(event) => onChange(field.id, event.target.value === "" ? "" : Number(event.target.value))} className="h-10 w-full rounded-2xl bg-tint px-3 text-sm ring-1 ring-border" />
            </label>
          );
        }
        if (field.kind === "toggle") {
          return (
            <div key={field.id} className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => onChange(field.id, false)} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${value === false ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("No")}</button>
                <button type="button" onClick={() => onChange(field.id, true)} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${value === true ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("Yes")}</button>
              </div>
            </div>
          );
        }
        if (field.kind === "scale") {
          const numbers = scaleValues(field);
          return (
            <div key={field.id} className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
              <div className="flex flex-wrap gap-1.5">
                {numbers.map((number) => <button key={number} type="button" onClick={() => onChange(field.id, number)} className={`grid h-9 min-w-9 place-items-center rounded-full px-1.5 text-[11px] font-bold ring-1 ring-border ${value === number ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{Number.isInteger(number) ? number : number.toFixed(1)}</button>)}
              </div>
            </div>
          );
        }

        const selected = Array.isArray(value) ? value : [];
        return (
          <div key={field.id} className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">{t(field.label)}</span>
            <div className="flex flex-wrap gap-2">
              {(field.options ?? []).map((option) => {
                const active = selected.includes(option);
                return <button key={option} type="button" onClick={() => onChange(field.id, active ? selected.filter((item) => item !== option) : [...selected, option])} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-border ${active ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t(option)}</button>;
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
