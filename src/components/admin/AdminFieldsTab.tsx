import type { PointerEvent as ReactPointerEvent } from "react";
import { CoreFeatureCustomFieldBuilder } from "@/components/CoreFeatureCustomFieldBuilder";
import { Ico } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import {
  BIXBO_LOG_FIELDS,
  getRegistryFeature,
  getRegistryField,
  isRegistryOptionEnabled,
  registryOptionLabel,
  type AdminConfig,
  type RegistryFeatureId,
  type RegistryFieldDefinition,
  type RegistryFieldOverride,
} from "@/lib/appRegistry";
import type { BixboData } from "@/lib/storage";
import { isRequiredCoreField } from "./AdminEditRuntime";

export type AdminUnifiedField =
  | { source: "builtin"; id: string; order: number; baseField: RegistryFieldDefinition }
  | { source: "custom"; id: string; order: number; customField: RegistryFieldDefinition };

export type DraggedAdminOption = { featureId: RegistryFeatureId; fieldId: string; value: string } | null;
export type DraggedAdminField = { featureId: RegistryFeatureId; fieldId: string } | null;

export function AdminFieldsTab({
  adminView,
  localConfig,
  orderedUnifiedFields,
  orderedFieldOptionValues,
  draggedField,
  draggedOption,
  onPatchCustomField,
  onPatchField,
  onSetDraggedField,
  onMoveDraggedField,
  onSetDraggedOption,
  onMoveDraggedOption,
  onMoveFieldOption,
  onDeleteCustomOption,
  onAddFieldOption,
}: {
  adminView: BixboData;
  localConfig: AdminConfig;
  orderedUnifiedFields: (featureId: RegistryFeatureId) => AdminUnifiedField[];
  orderedFieldOptionValues: (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => string[];
  draggedField: DraggedAdminField;
  draggedOption: DraggedAdminOption;
  onPatchCustomField: (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => void;
  onPatchField: (featureId: RegistryFeatureId, fieldId: string, patch: RegistryFieldOverride) => void;
  onSetDraggedField: (value: DraggedAdminField) => void;
  onMoveDraggedField: (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId) => void;
  onSetDraggedOption: (value: DraggedAdminOption) => void;
  onMoveDraggedOption: (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => void;
  onMoveFieldOption: (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], value: string, delta: number) => void;
  onDeleteCustomOption: (featureId: RegistryFeatureId, fieldId: string, value: string) => void;
  onAddFieldOption: (featureId: RegistryFeatureId, fieldId: string) => void;
}) {
  const { t } = useI18n();

  return <>
    <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
      <p className="text-sm font-bold">{t("Log fields, choices & scales")}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("Historical values keep their stable field IDs.")}</p>
    </section>
    {(Object.keys(BIXBO_LOG_FIELDS) as RegistryFeatureId[]).map((featureId) => {
      const feature = getRegistryFeature(adminView, featureId);
      return <section key={featureId} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">
        <p className="flex items-center gap-1.5 text-xs font-bold"><Ico e={feature.icon} size={16} /><span>{feature.label}</span></p>
        <div className="mt-2 space-y-2">
          {orderedUnifiedFields(featureId).map((item) => {
            if (item.source === "custom") {
              const customField = item.customField;
              return <div key={customField.id} data-admin-field-sort-id={customField.id} data-admin-field-feature={featureId} className={`rounded-xl border border-dashed border-primary/35 bg-primary/5 p-2 ring-1 ring-primary/10 ${draggedField?.featureId === featureId && draggedField.fieldId === customField.id ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSetDraggedField({ featureId, fieldId: customField.id }); }} onPointerMove={(event) => onMoveDraggedField(event, featureId)} onPointerUp={() => onSetDraggedField(null)} onPointerCancel={() => onSetDraggedField(null)} style={{ touchAction: "none" }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-background px-2 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                  <input value={customField.label} onChange={(event) => onPatchCustomField(featureId, customField.id, { label: event.target.value })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] font-semibold ring-1 ring-border" />
                  <button type="button" onClick={() => onPatchCustomField(featureId, customField.id, { enabled: customField.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{customField.enabled === false ? t("Hidden") : t("Shown")}</button>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary">{t("Custom field")} · {customField.kind}</span><span className="min-w-0 truncate text-[8px] text-muted-foreground">Field ID: {customField.id}</span></div>
              </div>;
            }

            const baseField = item.baseField;
            const field = getRegistryField(adminView, featureId, baseField.id) ?? baseField;
            const localField = localConfig.features?.[featureId]?.fields?.[baseField.id];
            const optionValues = orderedFieldOptionValues(featureId, baseField.id, baseField.options ?? []);
            const draggable = featureId === "pain" || featureId === "panic" || featureId === "tetany" || featureId === "bowel" || featureId === "period" || featureId === "workout" || featureId === "event" || featureId === "task" || featureId === "food" || featureId === "temp" || featureId === "note" || featureId === "postpartum" || featureId === "meds" || featureId === "sex" || featureId === "heat";
            return <div key={baseField.id} data-admin-field-sort-id={baseField.id} data-admin-field-feature={featureId} className={`rounded-xl bg-tint p-2 ring-1 ring-border/70 ${draggedField?.featureId === featureId && draggedField.fieldId === baseField.id ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2">
                {draggable ? <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSetDraggedField({ featureId, fieldId: baseField.id }); }} onPointerMove={(event) => onMoveDraggedField(event, featureId)} onPointerUp={() => onSetDraggedField(null)} onPointerCancel={() => onSetDraggedField(null)} style={{ touchAction: "none" }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-background px-2 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button> : null}
                <input value={field.label} onChange={(event) => onPatchField(featureId, baseField.id, { label: event.target.value })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] font-semibold ring-1 ring-border" />
                {isRequiredCoreField(featureId, baseField.id) ? <span title={t("Required to save this log")} className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary ring-1 ring-primary/20">{t("Required")}</span> : <button type="button" onClick={() => onPatchField(featureId, baseField.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>}
              </div>
              {field.scale ? <div className="mt-2 grid grid-cols-3 gap-1.5">{(["min", "max", "step"] as const).map((key) => <label key={key} className="text-[8px] text-muted-foreground">{key}<input type="number" step="0.5" value={field.scale?.[key] ?? ""} onChange={(event) => onPatchField(featureId, baseField.id, { scale: { [key]: Number(event.target.value) } })} className="mt-1 h-7 w-full rounded-lg bg-background px-2 text-[10px] ring-1 ring-border" /></label>)}</div> : null}
              {baseField.kind === "chips" ? <div className="mt-2 space-y-1">
                {optionValues.map((option, optionIndex) => {
                  const override = localField?.options?.[option];
                  const shown = isRegistryOptionEnabled(adminView, featureId, baseField.id, option);
                  const label = registryOptionLabel(adminView, featureId, baseField.id, option);
                  const custom = option.startsWith("custom:");
                  return <div key={option} data-admin-option-sort-value={option} data-admin-option-feature={featureId} data-admin-option-field={baseField.id} className={`flex items-center gap-1.5 ${draggedOption?.featureId === featureId && draggedOption.fieldId === baseField.id && draggedOption.value === option ? "opacity-60" : ""}`}>
                    <button type="button" disabled={optionIndex === 0} onClick={() => onMoveFieldOption(featureId, baseField.id, baseField.options ?? [], option, -1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move up")} ${label}`}>↑</button>
                    <button type="button" disabled={optionIndex === optionValues.length - 1} onClick={() => onMoveFieldOption(featureId, baseField.id, baseField.options ?? [], option, 1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${label}`}>↓</button>
                    <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onSetDraggedOption({ featureId, fieldId: baseField.id, value: option }); }} onPointerMove={(event) => onMoveDraggedOption(event, featureId, baseField.id, baseField.options ?? [])} onPointerUp={() => onSetDraggedOption(null)} onPointerCancel={() => onSetDraggedOption(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center rounded-full bg-background px-2 text-[8px] text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}>⋮⋮</button>
                    <input value={label} onChange={(event) => onPatchField(featureId, baseField.id, { options: { [option]: { ...override, label: event.target.value, order: override?.order ?? (optionIndex + 1) * 10 } } })} className="h-7 min-w-0 flex-1 rounded-lg bg-background px-2 text-[10px] ring-1 ring-border" />
                    {custom ? <button type="button" onClick={() => onDeleteCustomOption(featureId, baseField.id, option)} className="rounded-full bg-background px-2 py-1 text-[8px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button> : <button type="button" onClick={() => onPatchField(featureId, baseField.id, { options: { [option]: { ...override, enabled: !shown, order: override?.order ?? optionIndex } } })} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border">{shown ? t("On") : t("Hidden")}</button>}
                  </div>;
                })}
                <button type="button" onClick={() => onAddFieldOption(featureId, baseField.id)} className="mt-1 w-full rounded-lg border border-dashed border-primary/40 bg-background px-2 py-1.5 text-[9px] font-bold text-primary">+ {t("Add custom")}</button>
              </div> : null}
              <p className="mt-1 text-[8px] text-muted-foreground">Field ID: {baseField.id}</p>
            </div>;
          })}
        </div>
      </section>;
    })}
    <CoreFeatureCustomFieldBuilder data={adminView} />
  </>;
}
