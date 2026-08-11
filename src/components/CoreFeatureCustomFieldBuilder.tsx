import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useI18n } from "@/hooks/useI18n";
import {
  BIXBO_LOG_FIELDS,
  BIXBO_REGISTRY,
  getRegistryFeature,
  getRegistryField,
  type RegistryFieldDefinition,
  type RegistryFieldKind,
  type RegistryFeatureId,
} from "@/lib/appRegistry";
import { getDeviceAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";
import type { BixboData } from "@/lib/storage";

const FIELD_KINDS: RegistryFieldKind[] = ["text", "number", "toggle", "chips", "scale"];

function sanitizeOptions(options: string[] | undefined): string[] {
  const seen = new Set<string>();
  return (options ?? [])
    .map((option) => option.trim())
    .filter((option) => option.length > 0 && !seen.has(option) && Boolean(seen.add(option)));
}

function sanitizeOptionLabels(options: string[] | undefined, labels: Record<string, string> | undefined): Record<string, string> | undefined {
  const allowed = new Set(options ?? []);
  const out = Object.fromEntries(
    Object.entries(labels ?? {})
      .filter(([value]) => allowed.has(value))
      .map(([value, label]) => [value, label.trim()])
      .filter(([value, label]) => Boolean(label) && label !== value),
  );
  return Object.keys(out).length ? out : undefined;
}

function displayOptionLabel(field: RegistryFieldDefinition, option: string): string {
  return field.optionLabels?.[option] ?? option;
}

function sanitizeScale(scale: RegistryFieldDefinition["scale"]): NonNullable<RegistryFieldDefinition["scale"]> {
  const rawMin = Number(scale?.min);
  const rawMax = Number(scale?.max);
  const rawStep = Number(scale?.step);
  const min = Number.isFinite(rawMin) ? rawMin : 1;
  const maxCandidate = Number.isFinite(rawMax) ? rawMax : 10;
  const max = maxCandidate > min ? maxCandidate : min + 1;
  const stepCandidate = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1;
  const span = max - min;
  const step = Math.min(stepCandidate, span);
  return { min, max, step };
}

function makeFieldId() {
  return `admin_field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CoreFeatureCustomFieldBuilder({ data }: { data: BixboData }) {
  const { t } = useI18n();
  const [draggedOption, setDraggedOption] = useState<{ featureId: RegistryFeatureId; fieldId: string; value: string } | null>(null);
  const config = getDeviceAdminConfig();
  const adminView = { ...data, settings: { ...data.settings, adminConfig: config } } as BixboData;

  const features = useMemo(
    () => BIXBO_REGISTRY
      .filter((feature) => feature.surfaces.log)
      .map((feature) => getRegistryFeature(adminView, feature.id))
      .sort((a, b) => a.order - b.order),
    [adminView],
  );

  const writeFields = (featureId: RegistryFeatureId, fields: RegistryFieldDefinition[]) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      features: {
        ...(current.features ?? {}),
        [featureId]: { ...feature, customFields: fields },
      },
    });
  };

  const addField = (featureId: RegistryFeatureId, kind: RegistryFieldKind) => {
    const current = getDeviceAdminConfig();
    const existing = current.features?.[featureId]?.customFields ?? [];
    const currentView = { ...data, settings: { ...data.settings, adminConfig: current } } as BixboData;
    const builtinOrders = (BIXBO_LOG_FIELDS[featureId] ?? []).map((base) => getRegistryField(currentView, featureId, base.id)?.order ?? base.order);
    const maxOrder = Math.max(0, ...builtinOrders, ...existing.map((item) => item.order));
    const field: RegistryFieldDefinition = {
      id: makeFieldId(),
      label: t("New field"),
      kind,
      order: maxOrder + 10,
      enabled: true,
      ...(kind === "chips" ? { options: [t("Option 1"), t("Option 2")] } : {}),
      ...(kind === "scale" ? { scale: { min: 1, max: 10, step: 1 } } : {}),
    };
    writeFields(featureId, [...existing, field]);
  };

  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {
    const current = getDeviceAdminConfig();
    const fields = current.features?.[featureId]?.customFields ?? [];
    writeFields(featureId, fields.map((field) => {
      if (field.id !== fieldId) return field;
      const next = { ...field, ...patch, id: field.id };
      return {
        ...next,
        label: next.label.trimStart(),
        ...(next.kind === "chips"
          ? (() => {
              const options = sanitizeOptions(next.options);
              return { options, optionLabels: sanitizeOptionLabels(options, next.optionLabels) };
            })()
          : { options: undefined, optionLabels: undefined }),
        ...(next.kind === "scale" ? { scale: sanitizeScale(next.scale) } : { scale: undefined }),
      };
    }));
  };

  const unifiedFieldIds = (featureId: RegistryFeatureId) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const currentView = { ...data, settings: { ...data.settings, adminConfig: current } } as BixboData;
    const builtin = (BIXBO_LOG_FIELDS[featureId] ?? []).map((base) => ({
      id: base.id,
      order: getRegistryField(currentView, featureId, base.id)?.order ?? base.order,
      custom: false,
    }));
    const custom = (feature.customFields ?? []).map((field) => ({ id: field.id, order: field.order, custom: true }));
    return [...builtin, ...custom]
      .sort((a, b) => a.order - b.order || (a.custom === b.custom ? a.id.localeCompare(b.id) : a.custom ? 1 : -1))
      .map((field) => field.id);
  };

  const canMoveField = (featureId: RegistryFeatureId, fieldId: string, delta: -1 | 1) => {
    const ids = unifiedFieldIds(featureId);
    const index = ids.indexOf(fieldId);
    const target = index + delta;
    return index >= 0 && target >= 0 && target < ids.length;
  };

  const moveCustomOption = (featureId: RegistryFeatureId, fieldId: string, sourceValue: string, targetValue: string) => {
    if (sourceValue === targetValue) return;
    const current = getDeviceAdminConfig();
    const field = current.features?.[featureId]?.customFields?.find((item) => item.id === fieldId);
    if (!field?.options?.length) return;
    const options = [...field.options];
    const from = options.indexOf(sourceValue);
    const to = options.indexOf(targetValue);
    if (from < 0 || to < 0) return;
    const [item] = options.splice(from, 1);
    options.splice(to, 0, item);
    patchField(featureId, fieldId, { options });
  };

  const moveDraggedOptionByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId, fieldId: string) => {
    if (!draggedOption || draggedOption.featureId !== featureId || draggedOption.fieldId !== fieldId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-custom-option-value]");
    const targetValue = target?.dataset.adminCustomOptionValue;
    if (targetValue && target?.dataset.adminCustomOptionFeature === featureId && target?.dataset.adminCustomOptionField === fieldId && targetValue !== draggedOption.value) {
      moveCustomOption(featureId, fieldId, draggedOption.value, targetValue);
    }
  };

  const moveField = (featureId: RegistryFeatureId, fieldId: string, delta: -1 | 1) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const currentView = { ...data, settings: { ...data.settings, adminConfig: current } } as BixboData;
    const builtin = (BIXBO_LOG_FIELDS[featureId] ?? []).map((base) => ({
      id: base.id,
      order: getRegistryField(currentView, featureId, base.id)?.order ?? base.order,
      custom: false,
    }));
    const custom = (feature.customFields ?? []).map((field) => ({ id: field.id, order: field.order, custom: true }));
    const ordered = [...builtin, ...custom].sort((a, b) => a.order - b.order || (a.custom === b.custom ? a.id.localeCompare(b.id) : a.custom ? 1 : -1));
    const from = ordered.findIndex((field) => field.id === fieldId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ordered.length) return;
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);

    const orderById = new Map(ordered.map((field, index) => [field.id, (index + 1) * 10]));
    const fields = { ...(feature.fields ?? {}) };
    builtin.forEach((field) => { fields[field.id] = { ...(fields[field.id] ?? {}), order: orderById.get(field.id) }; });
    const customFields = (feature.customFields ?? []).map((field) => ({ ...field, order: orderById.get(field.id) ?? field.order }));
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      features: { ...(current.features ?? {}), [featureId]: { ...feature, fields, customFields } },
    });
  };

  const deleteField = (featureId: RegistryFeatureId, fieldId: string) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const fields = feature.customFields ?? [];
    const heatmapFieldIds = (feature.heatmapFieldIds ?? []).filter((id) => id !== fieldId);
    const monthlyFieldIds = (feature.monthlyFieldIds ?? []).filter((id) => id !== fieldId);
    const cycleFieldIds = (feature.cycleFieldIds ?? []).filter((id) => id !== fieldId);
    const treatmentFieldIds = (feature.treatmentFieldIds ?? []).filter((id) => id !== fieldId);
    const correlationFieldIds = (feature.correlationFieldIds ?? []).filter((id) => id !== fieldId);
    const correlationThresholds = { ...(feature.correlationThresholds ?? {}) };
    delete correlationThresholds[fieldId];
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      features: {
        ...(current.features ?? {}),
        [featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds, monthlyFieldIds, cycleFieldIds, treatmentFieldIds, correlationFieldIds, correlationThresholds },
      },
    });
  };

  const setHeatmapFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const selected = new Set(feature.heatmapFieldIds ?? []);
    if (enabled) selected.add(fieldId);
    else selected.delete(fieldId);
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      features: {
        ...(current.features ?? {}),
        [featureId]: { ...feature, heatmapFieldIds: [...selected] },
      },
    });
  };

  const setMonthlyFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const selected = new Set(feature.monthlyFieldIds ?? []);
    if (enabled) selected.add(fieldId);
    else selected.delete(fieldId);
    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, monthlyFieldIds: [...selected] } } });
  };

  const setCycleFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const selected = new Set(feature.cycleFieldIds ?? []);
    if (enabled) selected.add(fieldId); else selected.delete(fieldId);
    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, cycleFieldIds: [...selected] } } });
  };

  const setTreatmentFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const selected = new Set(feature.treatmentFieldIds ?? []);
    if (enabled) selected.add(fieldId); else selected.delete(fieldId);
    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, treatmentFieldIds: [...selected] } } });
  };

  const setCorrelationFieldEnabled = (featureId: RegistryFeatureId, fieldId: string, enabled: boolean) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const selected = new Set(feature.correlationFieldIds ?? []);
    if (enabled) selected.add(fieldId); else selected.delete(fieldId);
    const thresholds = { ...(feature.correlationThresholds ?? {}) };
    if (enabled && !thresholds[fieldId]) thresholds[fieldId] = { operator: "gte", value: 0 };
    setDeviceAdminConfig({ ...current, enabled: true, features: { ...(current.features ?? {}), [featureId]: { ...feature, correlationFieldIds: [...selected], correlationThresholds: thresholds } } });
  };

  const setCorrelationThreshold = (featureId: RegistryFeatureId, fieldId: string, patch: { operator?: "gte" | "lte"; value?: number }) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const previous = feature.correlationThresholds?.[fieldId] ?? { operator: "gte" as const, value: 0 };
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      features: {
        ...(current.features ?? {}),
        [featureId]: { ...feature, correlationThresholds: { ...(feature.correlationThresholds ?? {}), [fieldId]: { ...previous, ...patch } } },
      },
    });
  };

  return (
    <section className="rounded-3xl bg-surface p-3 ring-1 ring-border/80">
      <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
        <p className="text-sm font-bold">{t("Additional custom fields")}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{t("Add supplementary fields to any core log. Core calculations do not use these values.")}</p>
      </div>

      <div className="mt-3 space-y-3">
        {features.map((feature) => {
          const fields = [...(config.features?.[feature.id]?.customFields ?? [])].sort((a, b) => a.order - b.order);
          return (
            <div key={feature.id} className="rounded-2xl bg-tint p-3 ring-1 ring-border/70">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">{feature.icon} {feature.label}</p>
                <select
                  defaultValue=""
                  onChange={(event) => {
                    if (!event.target.value) return;
                    addField(feature.id, event.target.value as RegistryFieldKind);
                    event.currentTarget.value = "";
                  }}
                  className="h-8 rounded-xl bg-background px-2 text-[10px] font-semibold ring-1 ring-border"
                >
                  <option value="">+ {t("Add field")}</option>
                  {FIELD_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                </select>
              </div>

              {fields.length ? (
                <div className="mt-2 space-y-2">
                  {fields.map((field) => (
                    <div key={field.id} className="rounded-xl bg-background p-2 ring-1 ring-border">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={field.label}
                          onChange={(event) => patchField(feature.id, field.id, { label: event.target.value })}
                          className="h-8 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[10px] font-semibold ring-1 ring-border"
                        />
                        <select
                          value={field.kind}
                          onChange={(event) => {
                            const kind = event.target.value as RegistryFieldKind;
                            patchField(feature.id, field.id, {
                              kind,
                              options: kind === "chips" ? (field.options?.length ? field.options : [t("Option 1")]) : undefined,
                              optionLabels: kind === "chips" ? field.optionLabels : undefined,
                              scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined,
                            });
                          }}
                          className="h-8 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border"
                        >
                          {FIELD_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                        </select>
                        <button type="button" disabled={!canMoveField(feature.id, field.id, -1)} onClick={() => moveField(feature.id, field.id, -1)} aria-label={t("Move field up")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-bold ring-1 ring-border disabled:opacity-30">↑</button>
                        <button type="button" disabled={!canMoveField(feature.id, field.id, 1)} onClick={() => moveField(feature.id, field.id, 1)} aria-label={t("Move field down")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-bold ring-1 ring-border disabled:opacity-30">↓</button>
                        <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className={`rounded-full px-2 py-1 text-[9px] font-semibold ring-1 ring-border ${field.enabled === false ? "bg-tint text-muted-foreground" : "bg-primary/10 text-primary"}`}>{field.enabled === false ? t("Hidden") : t("Shown")}</button>
                        <button type="button" onClick={() => deleteField(feature.id, field.id)} className="rounded-full px-2 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>
                      </div>

                      {field.kind === "scale" && field.scale ? (
                        <div className="mt-2 grid grid-cols-3 gap-1">
                          {(["min", "max", "step"] as const).map((key) => (
                            <label key={key} className="text-[8px] text-muted-foreground">{key}
                              <input type="number" step="0.5" value={field.scale?.[key] ?? ""} onChange={(event) => patchField(feature.id, field.id, { scale: { ...field.scale!, [key]: Number(event.target.value) } })} className="mt-1 h-7 w-full rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" />
                            </label>
                          ))}
                        </div>
                      ) : null}

                      {field.kind === "chips" ? (
                        <div className="mt-2 space-y-1">
                          {(field.options ?? []).map((option, index) => (
                            <div
                              key={`${field.id}-${option}-${index}`}
                              data-admin-custom-option-value={option}
                              data-admin-custom-option-feature={feature.id}
                              data-admin-custom-option-field={field.id}
                              className={`flex gap-1 ${draggedOption?.featureId === feature.id && draggedOption.fieldId === field.id && draggedOption.value === option ? "opacity-60" : ""}`}
                            >
                              <button
                                type="button"
                                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedOption({ featureId: feature.id, fieldId: field.id, value: option }); }}
                                onPointerMove={(event) => moveDraggedOptionByPointer(event, feature.id, field.id)}
                                onPointerUp={() => setDraggedOption(null)}
                                onPointerCancel={() => setDraggedOption(null)}
                                style={{ touchAction: "none" }}
                                className="inline-flex h-7 shrink-0 items-center rounded-lg bg-tint px-2 text-[10px] text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing"
                                aria-label={t("Drag to reorder")}
                              >⋮⋮</button>
                              <input
                                value={displayOptionLabel(field, option)}
                                onChange={(event) => patchField(feature.id, field.id, {
                                  optionLabels: { ...(field.optionLabels ?? {}), [option]: event.target.value },
                                })}
                                className="h-7 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border"
                              />
                              <button type="button" disabled={(field.options?.length ?? 0) <= 1} onClick={() => {
                                const options = (field.options ?? []).filter((_, optionIndex) => optionIndex !== index);
                                const optionLabels = { ...(field.optionLabels ?? {}) };
                                delete optionLabels[option];
                                patchField(feature.id, field.id, { options, optionLabels });
                              }} className="rounded-full px-2 text-[10px] ring-1 ring-border">×</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            const existing = sanitizeOptions(field.options);
                            let index = existing.length + 1;
                            let label = `${t("Option")} ${index}`;
                            while (existing.includes(label)) { index += 1; label = `${t("Option")} ${index}`; }
                            patchField(feature.id, field.id, { options: [...existing, label] });
                          }} className="rounded-full bg-tint px-3 py-1 text-[9px] font-semibold ring-1 ring-border">+ {t("Add option")}</button>
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="w-full min-w-0 truncate text-[8px] text-muted-foreground">ID: {field.id}</span>
                        {(field.kind === "toggle" || field.kind === "chips") ? (
                          <button type="button" onClick={() => setCorrelationFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>
                            Correlations {(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}
                          </button>
                        ) : null}
                        {(field.kind === "number" || field.kind === "scale") ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setHeatmapFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id))}
                              className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${
                                (config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id)
                                  ? "bg-primary text-primary-foreground ring-primary/30"
                                  : "bg-tint text-muted-foreground ring-border"
                              }`}
                            >
                              Heatmap {(config.features?.[feature.id]?.heatmapFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setMonthlyFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.monthlyFieldIds ?? []).includes(field.id))}
                              className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${
                                (config.features?.[feature.id]?.monthlyFieldIds ?? []).includes(field.id)
                                  ? "bg-primary text-primary-foreground ring-primary/30"
                                  : "bg-tint text-muted-foreground ring-border"
                              }`}
                            >
                              Monthly {(config.features?.[feature.id]?.monthlyFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}
                            </button>
                            <button type="button" onClick={() => setCycleFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>
                              Cycle {(config.features?.[feature.id]?.cycleFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}
                            </button>
                            <button type="button" onClick={() => setTreatmentFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>
                              Treatment {(config.features?.[feature.id]?.treatmentFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}
                            </button>
                            <button type="button" onClick={() => setCorrelationFieldEnabled(feature.id, field.id, !(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id))} className={`rounded-full px-2 py-1 text-[8px] font-semibold ring-1 ${(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? "bg-primary text-primary-foreground ring-primary/30" : "bg-tint text-muted-foreground ring-border"}`}>
                              Correlations {(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? t("On") : t("Off")}
                            </button>
                            {(config.features?.[feature.id]?.correlationFieldIds ?? []).includes(field.id) ? (
                              <>
                                <select value={config.features?.[feature.id]?.correlationThresholds?.[field.id]?.operator ?? "gte"} onChange={(event) => setCorrelationThreshold(feature.id, field.id, { operator: event.target.value as "gte" | "lte" })} className="h-7 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" aria-label={t("Correlation threshold operator")}>
                                  <option value="gte">≥</option><option value="lte">≤</option>
                                </select>
                                <input type="number" step={field.kind === "scale" ? field.scale?.step ?? 1 : "any"} value={config.features?.[feature.id]?.correlationThresholds?.[field.id]?.value ?? 0} onChange={(event) => setCorrelationThreshold(feature.id, field.id, { value: Number(event.target.value) })} className="h-7 w-16 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" aria-label={t("Correlation threshold value")} />
                              </>
                            ) : null}
                          </>
                        ) : null}
                        <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className="rounded-full bg-tint px-2 py-1 text-[8px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
