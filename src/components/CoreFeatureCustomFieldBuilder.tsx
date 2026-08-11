import { useMemo } from "react";

import { useI18n } from "@/hooks/useI18n";
import {
  BIXBO_REGISTRY,
  getRegistryFeature,
  type RegistryFieldDefinition,
  type RegistryFieldKind,
  type RegistryFeatureId,
} from "@/lib/appRegistry";
import { getDeviceAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";
import type { BixboData } from "@/lib/storage";

const FIELD_KINDS: RegistryFieldKind[] = ["text", "number", "toggle", "chips", "scale"];

function makeFieldId() {
  return `admin_field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CoreFeatureCustomFieldBuilder({ data }: { data: BixboData }) {
  const { t } = useI18n();
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
    const field: RegistryFieldDefinition = {
      id: makeFieldId(),
      label: t("New field"),
      kind,
      order: (existing.at(-1)?.order ?? 0) + 10,
      enabled: true,
      ...(kind === "chips" ? { options: [t("Option 1"), t("Option 2")] } : {}),
      ...(kind === "scale" ? { scale: { min: 1, max: 10, step: 1 } } : {}),
    };
    writeFields(featureId, [...existing, field]);
  };

  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {
    const current = getDeviceAdminConfig();
    const fields = current.features?.[featureId]?.customFields ?? [];
    writeFields(featureId, fields.map((field) => field.id === fieldId ? { ...field, ...patch, id: field.id } : field));
  };

  const deleteField = (featureId: RegistryFeatureId, fieldId: string) => {
    const current = getDeviceAdminConfig();
    const feature = current.features?.[featureId] ?? {};
    const fields = feature.customFields ?? [];
    const heatmapFieldIds = (feature.heatmapFieldIds ?? []).filter((id) => id !== fieldId);
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      features: {
        ...(current.features ?? {}),
        [featureId]: { ...feature, customFields: fields.filter((field) => field.id !== fieldId), heatmapFieldIds },
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
                              scale: kind === "scale" ? (field.scale ?? { min: 1, max: 10, step: 1 }) : undefined,
                            });
                          }}
                          className="h-8 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border"
                        >
                          {FIELD_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                        </select>
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
                            <div key={`${field.id}-${index}`} className="flex gap-1">
                              <input value={option} onChange={(event) => { const options = [...(field.options ?? [])]; options[index] = event.target.value; patchField(feature.id, field.id, { options }); }} className="h-7 min-w-0 flex-1 rounded-lg bg-tint px-2 text-[9px] ring-1 ring-border" />
                              <button type="button" onClick={() => patchField(feature.id, field.id, { options: (field.options ?? []).filter((_, optionIndex) => optionIndex !== index) })} className="rounded-full px-2 text-[10px] ring-1 ring-border">×</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => patchField(feature.id, field.id, { options: [...(field.options ?? []), `${t("Option")} ${(field.options?.length ?? 0) + 1}`] })} className="rounded-full bg-tint px-3 py-1 text-[9px] font-semibold ring-1 ring-border">+ {t("Add option")}</button>
                        </div>
                      ) : null}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">ID: {field.id}</span>
                        {(field.kind === "number" || field.kind === "scale") ? (
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
