import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import type { BixboData } from "@/lib/storage";
import type { CustomLogDefinition, RegistryFieldDefinition, RegistryFieldKind } from "@/lib/appRegistry";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;

const FIELD_KINDS: RegistryFieldKind[] = ["chips", "text", "number", "toggle", "scale"];
const ICONS = ["🩺", "🫀", "🧠", "🫁", "🦴", "🩸", "💊", "🌡️", "💤", "⚡", "🔥", "✨", "🫐", "❤️", "🍽️", "💩", "🏃‍♀️", "📝"];

function idPart(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28) || "item";
}
function makeId(prefix: string, label: string) {
  return `${prefix}_${idPart(label)}_${Date.now().toString(36)}`;
}

export function CustomLogBuilder({ data, update }: { data: BixboData; update: UpdateFn }) {
  const { t } = useI18n();
  const logs = useMemo(() => [...(data.settings.adminConfig?.customLogs ?? [])].sort((a, b) => a.order - b.order), [data.settings.adminConfig?.customLogs]);
  const [newName, setNewName] = useState("");
  const [dragField, setDragField] = useState<{ logId: string; fieldId: string } | null>(null);

  const writeLogs = (next: CustomLogDefinition[]) => {
    update((current) => ({
      ...current,
      settings: {
        ...current.settings,
        adminConfig: { ...(current.settings.adminConfig ?? {}), enabled: true, customLogs: next },
      },
    }));
  };

  const patchLog = (id: string, patch: Partial<CustomLogDefinition>) => {
    writeLogs(logs.map((log) => (log.id === id ? { ...log, ...patch, id: log.id } : log)));
  };

  const addLog = () => {
    const label = newName.trim();
    if (!label) return;
    const next: CustomLogDefinition = {
      id: makeId("custom", label),
      label,
      icon: "🩺",
      color: "#788C45",
      enabled: true,
      order: (logs.at(-1)?.order ?? 0) + 10,
      fields: [],
    };
    writeLogs([...logs, next]);
    setNewName("");
  };

  const patchField = (log: CustomLogDefinition, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {
    patchLog(log.id, { fields: log.fields.map((field) => (field.id === fieldId ? { ...field, ...patch, id: field.id } : field)) });
  };

  const addField = (log: CustomLogDefinition, kind: RegistryFieldKind = "text") => {
    const label = t("New field");
    const field: RegistryFieldDefinition = {
      id: makeId("field", label),
      label,
      kind,
      order: (log.fields.at(-1)?.order ?? 0) + 10,
      enabled: true,
      ...(kind === "chips" ? { options: [t("Option 1"), t("Option 2")] } : {}),
      ...(kind === "scale" ? { scale: { min: 1, max: 10, step: 1 } } : {}),
    };
    patchLog(log.id, { fields: [...log.fields, field] });
  };

  const moveField = (log: CustomLogDefinition, fieldId: string, delta: -1 | 1) => {
    const ordered = [...log.fields].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((field) => field.id === fieldId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    patchLog(log.id, { fields: ordered.map((field, idx) => ({ ...field, order: (idx + 1) * 10 })) });
  };

  const dropField = (log: CustomLogDefinition, targetId: string) => {
    if (!dragField || dragField.logId !== log.id || dragField.fieldId === targetId) return;
    const ordered = [...log.fields].sort((a, b) => a.order - b.order);
    const from = ordered.findIndex((field) => field.id === dragField.fieldId);
    const to = ordered.findIndex((field) => field.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    patchLog(log.id, { fields: ordered.map((field, idx) => ({ ...field, order: (idx + 1) * 10 })) });
    setDragField(null);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
        <p className="font-serif text-lg font-bold">{t("Create a new log")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Build a log from fields. Its stable ID is kept even if you rename it later.")}</p>
        <div className="mt-3 flex gap-2">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={t("Log name")} className="h-10 min-w-0 flex-1 rounded-xl bg-background px-3 text-sm ring-1 ring-border" />
          <button type="button" onClick={addLog} className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Plus className="h-4 w-4" />{t("Add log")}</button>
        </div>
      </section>

      {logs.map((log) => {
        const fields = [...log.fields].sort((a, b) => a.order - b.order);
        return (
          <section key={log.id} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tint text-2xl">{log.icon}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <input value={log.label} onChange={(event) => patchLog(log.id, { label: event.target.value })} className="h-9 w-full rounded-xl bg-tint px-3 text-sm font-bold ring-1 ring-border" />
                <p className="text-[10px] text-muted-foreground">Stable ID: {log.id}</p>
              </div>
              <button type="button" onClick={() => patchLog(log.id, { enabled: log.enabled === false })} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${log.enabled === false ? "bg-tint text-muted-foreground" : "bg-primary text-primary-foreground"}`}>{log.enabled === false ? t("Hidden") : t("Enabled")}</button>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <label className="text-[10px] text-muted-foreground">{t("Icon")}
                <select value={log.icon} onChange={(event) => patchLog(log.id, { icon: event.target.value })} className="mt-1 h-9 w-full rounded-xl bg-tint px-3 text-sm ring-1 ring-border">{ICONS.map((icon) => <option key={icon}>{icon}</option>)}</select>
              </label>
              <label className="text-[10px] text-muted-foreground">{t("Color")}
                <input type="color" value={log.color} onChange={(event) => patchLog(log.id, { color: event.target.value })} className="mt-1 block h-9 w-14 rounded-xl bg-tint p-1 ring-1 ring-border" />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">{t("Fields")}</p>
                <p className="text-[10px] text-muted-foreground">{t("Drag fields on desktop or use the arrows on mobile.")}</p>
              </div>
              <select defaultValue="text" onChange={(event) => { addField(log, event.target.value as RegistryFieldKind); event.currentTarget.value = "text"; }} className="h-9 rounded-xl bg-tint px-2 text-[11px] font-semibold ring-1 ring-border">
                <option value="text">+ {t("Text")}</option><option value="number">+ {t("Number")}</option><option value="toggle">+ {t("Yes / No")}</option><option value="chips">+ {t("Choices")}</option><option value="scale">+ {t("Scale")}</option>
              </select>
            </div>

            <div className="mt-3 space-y-2">
              {fields.length === 0 && <div className="rounded-2xl bg-tint p-4 text-center text-xs text-muted-foreground">{t("No fields yet. Add the first field above.")}</div>}
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDragField({ logId: log.id, fieldId: field.id })}
                  onDragEnd={() => setDragField(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropField(log, field.id)}
                  className={`rounded-2xl bg-tint p-3 ring-1 ring-border/70 lg:cursor-grab ${dragField?.fieldId === field.id ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <input value={field.label} onChange={(event) => patchField(log, field.id, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-background px-3 text-xs font-semibold ring-1 ring-border" />
                    <select value={field.kind} onChange={(event) => { const kind = event.target.value as RegistryFieldKind; patchField(log, field.id, { kind, options: kind === "chips" ? (field.options?.length ? field.options : [t("Option 1")]) : undefined, scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined }); }} className="h-9 rounded-xl bg-background px-2 text-[10px] ring-1 ring-border">{FIELD_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select>
                    <button type="button" onClick={() => patchField(log, field.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[10px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>
                  </div>
                  <p className="mt-1 text-[9px] text-muted-foreground">Field ID: {field.id}</p>

                  {field.kind === "scale" && field.scale ? <div className="mt-3 grid grid-cols-3 gap-2">{(["min", "max", "step"] as const).map((key) => <label key={key} className="text-[9px] text-muted-foreground">{t(key === "min" ? "Minimum" : key === "max" ? "Maximum" : "Step")}<input type="number" step="0.5" value={field.scale?.[key] ?? ""} onChange={(event) => patchField(log, field.id, { scale: { ...field.scale!, [key]: Number(event.target.value) } })} className="mt-1 h-8 w-full rounded-lg bg-background px-2 text-xs ring-1 ring-border" /></label>)}</div> : null}

                  {field.kind === "chips" ? <div className="mt-3 space-y-1.5">
                    {(field.options ?? []).map((option, optionIndex) => <div key={`${field.id}-${optionIndex}`} className="flex gap-2"><input value={option} onChange={(event) => { const options = [...(field.options ?? [])]; options[optionIndex] = event.target.value; patchField(log, field.id, { options }); }} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] ring-1 ring-border"/><button type="button" onClick={() => patchField(log, field.id, { options: (field.options ?? []).filter((_, i) => i !== optionIndex) })} className="rounded-full bg-background px-2 text-[10px] ring-1 ring-border">×</button></div>)}
                    <button type="button" onClick={() => patchField(log, field.id, { options: [...(field.options ?? []), `${t("Option")} ${(field.options?.length ?? 0) + 1}`] })} className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border">+ {t("Add option")}</button>
                  </div> : null}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1"><button type="button" onClick={() => moveField(log, field.id, -1)} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5 rotate-90" /></button><button type="button" onClick={() => moveField(log, field.id, 1)} disabled={index === fields.length - 1} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5 rotate-90" /></button></div>
                    <button type="button" onClick={() => patchField(log, field.id, { enabled: false })} className="text-[10px] font-semibold text-destructive">{t("Hide field")}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
