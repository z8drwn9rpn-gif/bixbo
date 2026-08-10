import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CustomLogBuilder } from "@/components/CustomLogBuilder";
import { ArrowLeft, ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import { EMPTY, useBixbo, type BixboData } from "@/lib/storage";
import {
  BIXBO_REGISTRY,
  getRegistryFeature,
  isRegistryFeatureEnabled,
  type RegistryFeatureId,
  type RegistrySurface,
  type RegistryFeatureOverride,
  BIXBO_LOG_FIELDS,
  getRegistryField,
  type RegistryFieldOverride,
} from "@/lib/appRegistry";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type AdminTab = "logs" | "fields" | "quick" | "calendar" | "insights";

const TAB_SURFACE: Record<AdminTab, RegistrySurface> = {
  logs: "log",
  fields: "log",
  quick: "quickLog",
  calendar: "calendar",
  insights: "heatmap",
};

const TAB_LABEL: Record<AdminTab, string> = {
  logs: "Logs",
  fields: "Log fields & scales",
  quick: "Quick Log",
  calendar: "Calendar",
  insights: "Insights & graphs",
};

const iconChoices = ["🔥", "⚡", "✨", "🫐", "❤️", "♨️", "🍽️", "💩", "🧘🏼‍♀️", "🌡️", "💊", "📅", "✅", "📝", "🤱", "🤕", "🥵", "🌙"];

function AdminPage() {
  const { data, update, hydrated } = useBixbo();
  const { t } = useI18n();
  const view = hydrated ? data : EMPTY;
  const [tab, setTab] = useState<AdminTab>("logs");
  const [dragged, setDragged] = useState<RegistryFeatureId | null>(null);
  const surface = TAB_SURFACE[tab];

  const features = useMemo(
    () => BIXBO_REGISTRY.map((base) => getRegistryFeature(view, base.id)).sort((a, b) => a.order - b.order),
    [view],
  );

  const patchFeature = (id: RegistryFeatureId, patch: RegistryFeatureOverride) => {
    update((current) => {
      const existing = current.settings.adminConfig?.features?.[id] ?? {};
      return {
        ...current,
        settings: {
          ...current.settings,
          adminConfig: {
            ...(current.settings.adminConfig ?? {}),
            enabled: true,
            features: {
              ...(current.settings.adminConfig?.features ?? {}),
              [id]: {
                ...existing,
                ...patch,
                surfaces: patch.surfaces ? { ...(existing.surfaces ?? {}), ...patch.surfaces } : existing.surfaces,
              },
            },
          },
        },
      };
    });
  };

  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: RegistryFieldOverride) => {
    update((current) => {
      const feature = current.settings.adminConfig?.features?.[featureId] ?? {};
      const existing = feature.fields?.[fieldId] ?? {};
      return {
        ...current,
        settings: {
          ...current.settings,
          adminConfig: {
            ...(current.settings.adminConfig ?? {}),
            enabled: true,
            features: {
              ...(current.settings.adminConfig?.features ?? {}),
              [featureId]: {
                ...feature,
                fields: { ...(feature.fields ?? {}), [fieldId]: { ...existing, ...patch, scale: patch.scale ? { ...(existing.scale ?? {}), ...patch.scale } : existing.scale } },
              },
            },
          },
        },
      };
    });
  };

  const resetFeature = (id: RegistryFeatureId) => {
    update((current) => {
      const next = { ...(current.settings.adminConfig?.features ?? {}) };
      delete next[id];
      return {
        ...current,
        settings: {
          ...current.settings,
          adminConfig: { ...(current.settings.adminConfig ?? {}), features: next },
        },
      };
    });
  };

  const move = (id: RegistryFeatureId, delta: -1 | 1) => {
    const index = features.findIndex((feature) => feature.id === id);
    const other = features[index + delta];
    const current = features[index];
    if (!current || !other) return;
    patchFeature(current.id, { order: other.order });
    patchFeature(other.id, { order: current.order });
  };

  const moveTo = (targetId: RegistryFeatureId) => {
    if (!dragged || dragged === targetId) return;
    const sourceIndex = features.findIndex((feature) => feature.id === dragged);
    const targetIndex = features.findIndex((feature) => feature.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...features];
    const [source] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, source);
    reordered.forEach((feature, index) => patchFeature(feature.id, { order: (index + 1) * 10 }));
    setDragged(null);
  };

  return (
    <AppShell
      title={
        <Link to="/profile" className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" />
          {t("Admin mode")}
        </Link>
      }
    >
      <div className="space-y-4 px-5 pb-28 pt-3 lg:px-0">
        <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
          <p className="font-serif text-xl font-bold">{t("BIXBO Registry")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("Change labels, icons, visibility and placement without editing source code. Historical data always keeps its stable ID.")}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-tint p-1 lg:grid-cols-4">
          {(Object.keys(TAB_LABEL) as AdminTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
            >
              {t(TAB_LABEL[key])}
            </button>
          ))}
        </div>

        {tab === "fields" && <CustomLogBuilder data={view} update={update} />}

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {features.map((feature, index) => {
            if (tab === "fields") {
              const fields = BIXBO_LOG_FIELDS[feature.id] ?? [];
              if (!fields.length) return null;
              return (
                <section key={feature.id} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
                  <div className="mb-3 flex items-center gap-2"><span className="text-xl">{feature.icon}</span><div><p className="text-sm font-bold">{t(feature.label)}</p><p className="text-[10px] text-muted-foreground">ID: {feature.id}</p></div></div>
                  <div className="space-y-3">
                    {fields.map((baseField) => {
                      const field = getRegistryField(view, feature.id, baseField.id)!;
                      return (
                        <div key={field.id} className="rounded-2xl bg-tint p-3 ring-1 ring-border/70">
                          <div className="flex items-center gap-2">
                            <input value={field.label} onChange={(e) => patchField(feature.id, field.id, { label: e.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-background px-3 text-xs font-semibold ring-1 ring-border" />
                            <button type="button" onClick={() => patchField(feature.id, field.id, { enabled: field.enabled === false })} className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${field.enabled === false ? "bg-tint text-muted-foreground" : "bg-primary text-primary-foreground"}`}>{field.enabled === false ? t("Hidden") : t("Enabled")}</button>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">Field ID: {field.id} · {field.kind}</p>
                          {field.scale ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {(["min", "max", "step"] as const).map((key) => (
                                <label key={key} className="text-[10px] text-muted-foreground">{t(key === "min" ? "Minimum" : key === "max" ? "Maximum" : "Step")}<input type="number" step="0.5" value={field.scale?.[key] ?? ""} onChange={(e) => patchField(feature.id, field.id, { scale: { [key]: Number(e.target.value) } })} className="mt-1 h-9 w-full rounded-xl bg-background px-2 text-xs ring-1 ring-border" /></label>
                              ))}
                            </div>
                          ) : null}
                          {baseField.options?.length ? (
                            <div className="mt-3 space-y-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Options")}</p>
                              {baseField.options.map((value, optionIndex) => {
                                const option = view.settings.adminConfig?.features?.[feature.id]?.fields?.[field.id]?.options?.[value] ?? {};
                                return <div key={value} className="flex items-center gap-2"><input defaultValue={option.label ?? value} onBlur={(e) => patchField(feature.id, field.id, { options: { ...(view.settings.adminConfig?.features?.[feature.id]?.fields?.[field.id]?.options ?? {}), [value]: { ...option, label: e.target.value, order: option.order ?? optionIndex } } })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] ring-1 ring-border"/><button type="button" onClick={() => patchField(feature.id, field.id, { options: { ...(view.settings.adminConfig?.features?.[feature.id]?.fields?.[field.id]?.options ?? {}), [value]: { ...option, enabled: option.enabled === false, order: option.order ?? optionIndex } } })} className="rounded-full bg-background px-2 py-1 text-[10px] ring-1 ring-border">{option.enabled === false ? t("Hidden") : t("Shown")}</button></div>;
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }
            const enabled = isRegistryFeatureEnabled(view, feature.id);
            const shownHere = enabled && feature.surfaces[surface];
            return (
              <section
                key={feature.id}
                draggable
                onDragStart={() => setDragged(feature.id)}
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveTo(feature.id)}
                className={`rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:cursor-grab ${dragged === feature.id ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tint text-2xl">{feature.icon}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={feature.label}
                      onChange={(event) => patchFeature(feature.id, { label: event.target.value })}
                      className="h-9 w-full rounded-xl bg-tint px-3 text-sm font-semibold outline-none ring-1 ring-border focus:ring-2 focus:ring-primary"
                      aria-label={t("Display name")}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">ID: {feature.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => patchFeature(feature.id, { enabled: !enabled })}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${enabled ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground"}`}
                  >
                    {enabled ? t("Enabled") : t("Hidden")}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <label className="text-xs text-muted-foreground">
                    {t("Icon")}
                    <select
                      value={feature.icon}
                      onChange={(event) => patchFeature(feature.id, { icon: event.target.value })}
                      className="mt-1 h-10 w-full rounded-xl bg-tint px-3 text-sm ring-1 ring-border"
                    >
                      {iconChoices.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("Color")}
                    <input
                      type="color"
                      value={feature.color}
                      onChange={(event) => patchFeature(feature.id, { color: event.target.value })}
                      className="mt-1 block h-10 w-14 rounded-xl bg-tint p-1 ring-1 ring-border"
                    />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => patchFeature(feature.id, { surfaces: { [surface]: !feature.surfaces[surface] } })}
                    disabled={!enabled}
                    className={`min-h-10 rounded-xl px-3 text-xs font-semibold ring-1 ring-border disabled:opacity-40 ${shownHere ? "bg-primary/15 text-primary" : "bg-tint text-muted-foreground"}`}
                  >
                    {shownHere ? `✓ ${t("Shown here")}` : t("Hidden here")}
                  </button>
                  {tab === "insights" ? (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => patchFeature(feature.id, { surfaces: { monthly: !feature.surfaces.monthly } })}
                        className={`rounded-xl px-2 text-[10px] font-semibold ring-1 ring-border ${feature.surfaces.monthly ? "bg-primary/15 text-primary" : "bg-tint"}`}
                      >{t("Monthly")}</button>
                      <button
                        type="button"
                        onClick={() => patchFeature(feature.id, { surfaces: { patterns: !feature.surfaces.patterns } })}
                        className={`rounded-xl px-2 text-[10px] font-semibold ring-1 ring-border ${feature.surfaces.patterns ? "bg-primary/15 text-primary" : "bg-tint"}`}
                      >{t("Patterns")}</button>
                    </div>
                  ) : <span />}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(feature.id, -1)} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move up")}><ChevronLeft className="h-4 w-4 rotate-90" /></button>
                    <button type="button" onClick={() => move(feature.id, 1)} disabled={index === features.length - 1} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move down")}><ChevronRight className="h-4 w-4 rotate-90" /></button>
                  </div>
                  <button type="button" onClick={() => resetFeature(feature.id)} className="rounded-full bg-tint px-3 py-2 text-[10px] font-semibold text-muted-foreground">{t("Reset")}</button>
                </div>
              </section>
            );
          })}
        </div>

        <section className="rounded-3xl bg-surface p-4 ring-1 ring-border/80">
          <p className="text-sm font-semibold">{t("Safe delete policy")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("Admin mode never deletes historical health data. Use Hide to stop new logging. Stable IDs remain unchanged when you rename an item.")}
          </p>
        </section>
      </div>
    </AppShell>
  );
}
