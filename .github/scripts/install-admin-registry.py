from pathlib import Path

registry = r'''import type { BixboData } from "./storage";

export type RegistrySurface = "log" | "quickLog" | "calendar" | "heatmap" | "monthly" | "patterns";

export type RegistryFeatureId =
  | "pain"
  | "tetany"
  | "panic"
  | "period"
  | "sex"
  | "heat"
  | "food"
  | "bowel"
  | "workout"
  | "temp"
  | "meds"
  | "event"
  | "task"
  | "note"
  | "postpartum"
  | "headache"
  | "hotFlashes"
  | "sleep"
  | "histamine";

export interface RegistryScaleDefinition {
  min: number;
  max: number;
  step: number;
}

export interface RegistryFeatureDefinition {
  id: RegistryFeatureId;
  label: string;
  icon: string;
  color: string;
  order: number;
  surfaces: Record<RegistrySurface, boolean>;
  scale?: RegistryScaleDefinition;
}

export interface RegistryFeatureOverride {
  label?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  order?: number;
  surfaces?: Partial<Record<RegistrySurface, boolean>>;
  scale?: Partial<RegistryScaleDefinition>;
}

export interface AdminConfig {
  enabled?: boolean;
  features?: Partial<Record<RegistryFeatureId, RegistryFeatureOverride>>;
}

const s = (
  log: boolean,
  quickLog: boolean,
  calendar: boolean,
  heatmap: boolean,
  monthly: boolean,
  patterns: boolean,
): Record<RegistrySurface, boolean> => ({ log, quickLog, calendar, heatmap, monthly, patterns });

export const BIXBO_REGISTRY: RegistryFeatureDefinition[] = [
  { id: "pain", label: "Pain", icon: "🔥", color: "#F47B16", order: 10, surfaces: s(true, true, true, true, true, true), scale: { min: 0, max: 10, step: 1 } },
  { id: "tetany", label: "Tetany episode", icon: "⚡", color: "#E99BC0", order: 20, surfaces: s(true, true, false, true, true, true), scale: { min: 1, max: 5, step: 1 } },
  { id: "panic", label: "Panic episode", icon: "✨", color: "#C84C78", order: 30, surfaces: s(true, true, false, true, true, true), scale: { min: 1, max: 10, step: 1 } },
  { id: "period", label: "Blueberry", icon: "🫐", color: "#8B5CF6", order: 40, surfaces: s(true, true, true, true, false, true) },
  { id: "sex", label: "ŠukŠuk!", icon: "❤️", color: "#E45B87", order: 50, surfaces: s(true, true, true, false, false, false) },
  { id: "heat", label: "Heat / Cold / TENS", icon: "♨️", color: "#F07B4A", order: 60, surfaces: s(true, false, false, false, false, false) },
  { id: "food", label: "Food", icon: "🍽️", color: "#D9A441", order: 70, surfaces: s(true, false, false, false, false, true) },
  { id: "bowel", label: "Bowel", icon: "💩", color: "#A66A46", order: 80, surfaces: s(true, true, false, true, false, true) },
  { id: "workout", label: "Workout", icon: "🧘🏼‍♀️", color: "#5A9D78", order: 90, surfaces: s(true, false, false, false, true, true) },
  { id: "temp", label: "Temp / Sleep / Weight", icon: "🌡️", color: "#C65C69", order: 100, surfaces: s(true, false, false, false, true, false) },
  { id: "meds", label: "Meds", icon: "💊", color: "#92A83F", order: 110, surfaces: s(true, false, false, false, true, true) },
  { id: "event", label: "Event", icon: "📅", color: "#8DA05D", order: 120, surfaces: s(true, false, false, false, false, false) },
  { id: "task", label: "Task", icon: "✅", color: "#62A86E", order: 130, surfaces: s(true, false, false, false, false, false) },
  { id: "note", label: "Notes", icon: "📝", color: "#B6A778", order: 140, surfaces: s(true, false, false, false, false, false) },
  { id: "postpartum", label: "Postpartum symptoms", icon: "🤱", color: "#D98AA6", order: 150, surfaces: s(true, true, false, false, false, false) },
  { id: "headache", label: "Headache", icon: "🤕", color: "#45A7B8", order: 160, surfaces: s(false, false, false, false, true, true), scale: { min: 1, max: 10, step: 1 } },
  { id: "hotFlashes", label: "Hot flashes", icon: "🥵", color: "#EF7C42", order: 170, surfaces: s(false, false, false, true, true, true), scale: { min: 1, max: 5, step: 1 } },
  { id: "sleep", label: "Sleep", icon: "🌙", color: "#7567C8", order: 180, surfaces: s(false, false, false, true, true, true) },
  { id: "histamine", label: "Histamine flare", icon: "🔥", color: "#D95D4F", order: 190, surfaces: s(false, true, false, false, true, true) },
];

const byId = new Map(BIXBO_REGISTRY.map((feature) => [feature.id, feature]));

export function getRegistryFeature(data: Pick<BixboData, "settings">, id: RegistryFeatureId): RegistryFeatureDefinition {
  const base = byId.get(id);
  if (!base) throw new Error(`Unknown BIXBO registry feature: ${id}`);
  const override = data.settings.adminConfig?.features?.[id];
  return {
    ...base,
    ...override,
    id: base.id,
    enabled: undefined,
    order: override?.order ?? base.order,
    surfaces: { ...base.surfaces, ...(override?.surfaces ?? {}) },
    scale: base.scale ? { ...base.scale, ...(override?.scale ?? {}) } : undefined,
  } as RegistryFeatureDefinition;
}

export function isRegistryFeatureEnabled(data: Pick<BixboData, "settings">, id: RegistryFeatureId): boolean {
  return data.settings.adminConfig?.features?.[id]?.enabled !== false;
}

export function isRegistrySurfaceEnabled(
  data: Pick<BixboData, "settings">,
  id: RegistryFeatureId,
  surface: RegistrySurface,
): boolean {
  return isRegistryFeatureEnabled(data, id) && getRegistryFeature(data, id).surfaces[surface];
}

export function registryFeaturesForSurface(
  data: Pick<BixboData, "settings">,
  surface: RegistrySurface,
): RegistryFeatureDefinition[] {
  return BIXBO_REGISTRY
    .filter((feature) => isRegistrySurfaceEnabled(data, feature.id, surface))
    .map((feature) => getRegistryFeature(data, feature.id))
    .sort((a, b) => a.order - b.order);
}

export function registryFeatureLabel(data: Pick<BixboData, "settings">, id: RegistryFeatureId): string {
  return getRegistryFeature(data, id).label;
}

export function registryFeatureIcon(data: Pick<BixboData, "settings">, id: RegistryFeatureId): string {
  return getRegistryFeature(data, id).icon;
}
'''

admin = r'''import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
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
} from "@/lib/appRegistry";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type AdminTab = "logs" | "quick" | "calendar" | "insights";

const TAB_SURFACE: Record<AdminTab, RegistrySurface> = {
  logs: "log",
  quick: "quickLog",
  calendar: "calendar",
  insights: "heatmap",
};

const TAB_LABEL: Record<AdminTab, string> = {
  logs: "Logs",
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

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {features.map((feature, index) => {
            const enabled = isRegistryFeatureEnabled(view, feature.id);
            const shownHere = enabled && feature.surfaces[surface];
            return (
              <section key={feature.id} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
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
                      >Monthly</button>
                      <button
                        type="button"
                        onClick={() => patchFeature(feature.id, { surfaces: { patterns: !feature.surfaces.patterns } })}
                        className={`rounded-xl px-2 text-[10px] font-semibold ring-1 ring-border ${feature.surfaces.patterns ? "bg-primary/15 text-primary" : "bg-tint"}`}
                      >Patterns</button>
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
'''

Path('src/lib/appRegistry.ts').write_text(registry)
Path('src/routes/admin.tsx').write_text(admin)

# storage type
p = Path('src/lib/storage.ts')
s = p.read_text()
needle = '  notif?: NotificationPrefs;\n}'
repl = '  notif?: NotificationPrefs;\n  /** Admin-editable registry overrides. Stable feature IDs protect historical data. */\n  adminConfig?: import("./appRegistry").AdminConfig;\n}'
if needle not in s:
    raise SystemExit('storage settings anchor not found')
s = s.replace(needle, repl, 1)
p.write_text(s)

# LogSheet registry integration
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
anchor = 'import { POSTPARTUM_SYMPTOMS } from "@/lib/health";'
if 'from "@/lib/appRegistry"' not in s:
    s = s.replace(anchor, anchor + '\nimport { getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";', 1)
old = '''    const saved = data.settings.logOrder ?? [];
    const source = CATEGORIES.filter((category) => {
      if (category.id === "period" && cycleTrackingHidden) return false;
      if (category.id === "postpartum" && !postpartumActive) return false;
      return true;
    });'''
new = '''    const saved = data.settings.logOrder ?? [];
    const source = CATEGORIES
      .map((category) => {
        const feature = getRegistryFeature(data, category.id as RegistryFeatureId);
        return { ...category, label: feature.label, emoji: feature.icon, registryOrder: feature.order };
      })
      .filter((category) => {
        if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;
        if (category.id === "period" && cycleTrackingHidden) return false;
        if (category.id === "postpartum" && !postpartumActive) return false;
        return true;
      })
      .sort((a, b) => a.registryOrder - b.registryOrder);'''
if old not in s:
    raise SystemExit('LogSheet source anchor not found')
s = s.replace(old, new, 1)
s = s.replace('  }, [cycleTrackingHidden, data.settings.logOrder, postpartumActive]);', '  }, [cycleTrackingHidden, data, postpartumActive]);', 1)
p.write_text(s)

# QuickTags registry surface integration
p = Path('src/components/QuickTags.tsx')
s = p.read_text()
anchor = 'import { POSTPARTUM_SYMPTOMS } from "@/lib/health";'
if 'from "@/lib/appRegistry"' not in s:
    s = s.replace(anchor, anchor + '\nimport { isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";', 1)
insert_anchor = '  const cycleTrackingHidden = isCycleTrackingHidden(data);\n'
helper = '''  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const registryIdForTag = (tag: Tag): RegistryFeatureId | null => {
    if (tag.cat === "postpartum") return "postpartum";
    if (tag.cat === "thermo") return "heat";
    if (tag.cat === "hotFlashes") return "hotFlashes";
    if (tag.cat === "histamine") return "histamine";
    if (tag.cat === "headache") return "headache";
    if (["pain", "tetany", "panic", "sex", "food", "meds", "workout", "period", "bowel", "sleep"].includes(tag.cat)) {
      return tag.cat as RegistryFeatureId;
    }
    return null;
  };
  const registryAllowsQuickTag = (tag: Tag) => {
    const id = registryIdForTag(tag);
    return id ? isRegistrySurfaceEnabled(data, id, "quickLog") : true;
  };
'''
if insert_anchor not in s:
    raise SystemExit('QuickTags cycle anchor missing')
s = s.replace(insert_anchor, helper, 1)
old = '''  const allTags = [
    ...(postpartumTag ? [postpartumTag] : []),
    ...baseTags().filter((tag) => !(tag.cat === "period" && cycleTrackingHidden)),
    ...(data.settings.customQuickTags ?? [])
      .filter((tag) => !(tag.cat === "period" && cycleTrackingHidden))
      .map((tag) => customToTag(tag, data)),
  ];'''
new = '''  const allTags = [
    ...(postpartumTag ? [postpartumTag] : []),
    ...baseTags().filter((tag) => !(tag.cat === "period" && cycleTrackingHidden)),
    ...(data.settings.customQuickTags ?? [])
      .filter((tag) => !(tag.cat === "period" && cycleTrackingHidden))
      .map((tag) => customToTag(tag, data)),
  ].filter(registryAllowsQuickTag);'''
if old not in s:
    raise SystemExit('QuickTags allTags anchor missing')
s = s.replace(old, new, 1)
p.write_text(s)

# MonthCalendar surfaces
p = Path('src/components/MonthCalendar.tsx')
s = p.read_text()
anchor = 'import { useI18n } from "@/hooks/useI18n";'
if 'from "@/lib/appRegistry"' not in s:
    s = s.replace(anchor, anchor + '\nimport { isRegistrySurfaceEnabled } from "@/lib/appRegistry";', 1)
s = s.replace('function iconsFor(log: DayLog | undefined): string[] {\n  // Month calendar shows only ŠukŠuk.\n  return log?.sex?.some((e) => isIntercourseKind(e.kind)) ? ["❤️"] : [];\n}', 'function iconsFor(log: DayLog | undefined, data: BixboData): string[] {\n  // Month calendar shows only ŠukŠuk, controlled by the registry.\n  if (!isRegistrySurfaceEnabled(data, "sex", "calendar")) return [];\n  return log?.sex?.some((e) => isIntercourseKind(e.kind)) ? ["❤️"] : [];\n}', 1)
s = s.replace('        periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),\n        pAvg: avgDayPain(log) ?? null,', '        periodColor: cycleTrackingHidden || !isRegistrySurfaceEnabled(data, "period", "calendar") ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),\n        pAvg: isRegistrySurfaceEnabled(data, "pain", "calendar") ? (avgDayPain(log) ?? null) : null,', 1)
s = s.replace('        icons: iconsFor(log),', '        icons: iconsFor(log, data),', 1)
p.write_text(s)

# Insights heatmap registry filter
p = Path('src/routes/insights.tsx')
s = p.read_text()
import_anchor = 'import { useI18n } from "@/hooks/useI18n";'
if 'from "@/lib/appRegistry"' not in s:
    s = s.replace(import_anchor, import_anchor + '\nimport { isRegistrySurfaceEnabled } from "@/lib/appRegistry";', 1)
needle = '  const [metric, setMetric] = useState<HeatmapMetric>("pain");\n  const [active, setActive] = useState<string | null>(null);'
repl = '''  const availableHeatmapOptions = useMemo(
    () => HEATMAP_OPTIONS.filter((option) => isRegistrySurfaceEnabled(data, option.id, "heatmap")),
    [data],
  );
  const [metric, setMetric] = useState<HeatmapMetric>("pain");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (availableHeatmapOptions.some((option) => option.id === metric)) return;
    const fallback = availableHeatmapOptions[0]?.id;
    if (fallback) setMetric(fallback);
  }, [availableHeatmapOptions, metric]);'''
if needle not in s:
    raise SystemExit('Insights heatmap state anchor missing')
s = s.replace(needle, repl, 1)
s = s.replace('HEATMAP_OPTIONS.map((option)', 'availableHeatmapOptions.map((option)', 1)
p.write_text(s)

# Profile: add Admin mode row and navigation
p = Path('src/routes/profile.tsx')
s = p.read_text()
s = s.replace('  onNotifications,\n}: {\n  onHome: () => void;\n  onOpen: (view: HealthView) => void;\n  onNotifications: () => void;\n}) {', '  onNotifications,\n  onAdmin,\n}: {\n  onHome: () => void;\n  onOpen: (view: HealthView) => void;\n  onNotifications: () => void;\n  onAdmin: () => void;\n}) {', 1)
row_anchor = '''            <HubRow
              icon={<ProfileIcon size={22} />}
              title="About BIXBO"
              subtitle="Version, information and legal"
              onClick={() => onOpen("about")}
            />'''
row_new = '''            <HubRow
              icon={<TaskIcon size={22} />}
              title="Admin mode"
              subtitle="Configure logs, calendar, Quick Log and Insights without editing code"
              onClick={onAdmin}
            />
            <div className="ml-[4.5rem] border-t border-border/60" />

            <HubRow
              icon={<ProfileIcon size={22} />}
              title="About BIXBO"
              subtitle="Version, information and legal"
              onClick={() => onOpen("about")}
            />'''
if row_anchor not in s:
    raise SystemExit('Profile About row anchor missing')
s = s.replace(row_anchor, row_new, 1)
call_anchor = '        onNotifications={() => navigate({ to: "/notifications" as never })}\n      />'
call_new = '        onNotifications={() => navigate({ to: "/notifications" as never })}\n        onAdmin={() => navigate({ to: "/admin" as never })}\n      />'
if call_anchor not in s:
    raise SystemExit('HealthHub call anchor missing')
s = s.replace(call_anchor, call_new, 1)
p.write_text(s)

# Add registry tests
Path('src/lib/__tests__/appRegistry.test.ts').write_text(r'''import { describe, expect, it } from "bun:test";
import { EMPTY, type BixboData } from "../storage";
import { getRegistryFeature, isRegistrySurfaceEnabled, registryFeaturesForSurface } from "../appRegistry";

const clone = (): BixboData => structuredClone(EMPTY);

describe("BIXBO admin registry", () => {
  it("keeps stable IDs while allowing rename", () => {
    const data = clone();
    data.settings.adminConfig = { features: { pain: { label: "My pain" } } };
    const pain = getRegistryFeature(data, "pain");
    expect(pain.id).toBe("pain");
    expect(pain.label).toBe("My pain");
  });

  it("can hide a feature from one surface without deleting it", () => {
    const data = clone();
    data.settings.adminConfig = { features: { period: { surfaces: { heatmap: false } } } };
    expect(isRegistrySurfaceEnabled(data, "period", "heatmap")).toBe(false);
    expect(isRegistrySurfaceEnabled(data, "period", "log")).toBe(true);
  });

  it("orders features using admin overrides", () => {
    const data = clone();
    data.settings.adminConfig = { features: { bowel: { order: 1 } } };
    expect(registryFeaturesForSurface(data, "log")[0]?.id).toBe("bowel");
  });
});
''')

print('Admin registry architecture installed')
