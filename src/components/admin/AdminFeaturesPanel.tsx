import type { PointerEvent as ReactPointerEvent } from "react";
import { Ico } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import {
  getRegistryFeature,
  isRegistryFeatureEnabled,
  isRegistrySurfaceEnabled,
  type AdminConfig,
  type RegistryFeatureId,
  type RegistryFeatureOverride,
  type RegistrySurface,
} from "@/lib/appRegistry";
import type { BixboData } from "@/lib/storage";
import { ADMIN_ICONS, ADMIN_SURFACES } from "./AdminEditSupport";

export function AdminFeaturesPanel({
  adminView,
  localConfig,
  currentSurface,
  features,
  draggedFeature,
  onPatchFeature,
  onMoveFeature,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResetFeature,
}: {
  adminView: BixboData;
  localConfig: AdminConfig;
  currentSurface: RegistrySurface;
  features: ReturnType<typeof getRegistryFeature>[];
  draggedFeature: RegistryFeatureId | null;
  onPatchFeature: (id: RegistryFeatureId, patch: RegistryFeatureOverride) => void;
  onMoveFeature: (featureId: RegistryFeatureId, delta: number) => void;
  onDragStart: (featureId: RegistryFeatureId) => void;
  onDragMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onResetFeature: (id: RegistryFeatureId) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
        <p className="text-sm font-bold">{t("Features & surfaces")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("Core features can be hidden but are never deleted. Current page surface is highlighted.")}</p>
      </section>
      {features.map((feature, featureIndex) => {
        const local = localConfig.features?.[feature.id];
        const enabled = isRegistryFeatureEnabled(adminView, feature.id);
        return (
          <section key={feature.id} data-admin-feature-sort-id={feature.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedFeature === feature.id ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2">
              <details className="group relative shrink-0">
                <summary className="grid h-9 w-11 cursor-pointer list-none place-items-center rounded-xl bg-tint ring-1 ring-border [&::-webkit-details-marker]:hidden" aria-label={t("Choose BIXBO icon")}>
                  <Ico e={feature.icon} size={24} />
                </summary>
                <div className="absolute left-0 top-11 z-30 grid w-[184px] grid-cols-5 gap-1 rounded-2xl bg-background p-2 shadow-xl ring-1 ring-border">
                  {[...new Set([feature.icon, ...ADMIN_ICONS])].map((icon) => (
                    <button key={icon} type="button" onClick={(event) => {
                      onPatchFeature(feature.id, { icon });
                      event.currentTarget.closest("details")?.removeAttribute("open");
                    }} className="grid h-8 w-8 place-items-center rounded-lg bg-tint ring-1 ring-border/60 transition hover:bg-primary/10" aria-label={`${t("Use icon")} ${icon}`}>
                      <Ico e={icon} size={21} />
                    </button>
                  ))}
                </div>
              </details>
              <input value={feature.label} onChange={(event) => onPatchFeature(feature.id, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-bold ring-1 ring-border" />
              <input type="color" value={feature.color} onChange={(event) => onPatchFeature(feature.id, { color: event.target.value })} className="h-9 w-10 rounded-xl bg-tint p-1 ring-1 ring-border" />
              <button type="button" onClick={() => onPatchFeature(feature.id, { enabled: !enabled })} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${enabled ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>{enabled ? t("On") : t("Hidden")}</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button type="button" disabled={featureIndex === 0} onClick={() => onMoveFeature(feature.id, -1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move up")} ${feature.label}`}>↑</button>
              <button type="button" disabled={featureIndex === features.length - 1} onClick={() => onMoveFeature(feature.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${feature.label}`}>↓</button>
              <button type="button" onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                onDragStart(feature.id);
              }} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
              {ADMIN_SURFACES.map((surface) => {
                const protectedPeriodHeatmap = feature.id === "period" && surface.id === "heatmap";
                const on = isRegistrySurfaceEnabled(adminView, feature.id, surface.id);
                return <button key={surface.id} type="button" disabled={protectedPeriodHeatmap} title={protectedPeriodHeatmap ? t("Period is a required Heatmap metric") : undefined} onClick={() => onPatchFeature(feature.id, { surfaces: { [surface.id]: !on } })} className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ring-1 ${on ? "bg-primary/10 text-primary ring-primary/25" : "bg-tint text-muted-foreground ring-border"} ${surface.id === currentSurface ? "outline outline-1 outline-primary/50" : ""} disabled:cursor-default disabled:opacity-100`}>{protectedPeriodHeatmap ? `${surface.label} · ${t("Required")}` : surface.label}</button>;
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">ID: {feature.id}</span>
              {local ? <button type="button" onClick={() => onResetFeature(feature.id)} className="rounded-full bg-tint px-3 py-1 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
