import type { BixboData } from "./storage";

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
