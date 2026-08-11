import type { BixboData } from "./storage";
import { getEffectiveAdminConfig } from "./effectiveAdminConfig";

function activeAdminConfig(data: Pick<BixboData, "settings">): AdminConfig {
  return getEffectiveAdminConfig(data.settings.adminConfig ?? {});
}

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

export type RegistryFieldKind = "chips" | "scale" | "text" | "number" | "toggle";

export interface RegistryFieldDefinition {
  id: string;
  label: string;
  kind: RegistryFieldKind;
  order: number;
  enabled?: boolean;
  options?: string[];
  scale?: RegistryScaleDefinition;
}

export interface RegistryFieldOverride {
  label?: string;
  enabled?: boolean;
  order?: number;
  options?: Record<string, { label?: string; enabled?: boolean; order?: number }>;
  scale?: Partial<RegistryScaleDefinition>;
  fields?: Record<string, RegistryFieldOverride>;
}

export interface CustomLogDefinition {
  id: string;
  label: string;
  icon: string;
  color: string;
  enabled?: boolean;
  /** Show the custom log icon on calendar days that contain entries. */
  calendar?: boolean;
  /** Show a shortcut in Quick Log. */
  quickLog?: boolean;
  /** Numeric/scale field exposed as a Heatmap metric. */
  heatmapFieldId?: string;
  order: number;
  fields: RegistryFieldDefinition[];
}

export interface RegistryFeatureDefinition {
  id: RegistryFeatureId;
  label: string;
  icon: string;
  color: string;
  order: number;
  surfaces: Record<RegistrySurface, boolean>;
  scale?: RegistryScaleDefinition;
  fields?: RegistryFieldDefinition[];
}

export type RegistryCorrelationThreshold = { operator: "gte" | "lte"; value: number };

export type AdminPageBlock = {
  id: string;
  title: string;
  body: string;
  order: number;
  hidden?: boolean;
};

export interface RegistryFeatureOverride {
  label?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  order?: number;
  surfaces?: Partial<Record<RegistrySurface, boolean>>;
  scale?: Partial<RegistryScaleDefinition>;
  fields?: Record<string, RegistryFieldOverride>;
  /** Admin-created supplementary fields. Core calculations never depend on these. */
  customFields?: RegistryFieldDefinition[];
  /** Supplementary numeric/scale field IDs explicitly exposed to Heatmap. */
  heatmapFieldIds?: string[];
  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Monthly. */
  monthlyFieldIds?: string[];
  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Cycle. */
  cycleFieldIds?: string[];
  /** Supplementary numeric/scale field IDs explicitly exposed to Patterns → Treatment. */
  treatmentFieldIds?: string[];
  /** Supplementary fields explicitly exposed to Patterns → Triggers/Correlations. */
  correlationFieldIds?: string[];
  /** Explicit daily-average thresholds required before Number/Scale fields can act as correlation events. */
  correlationThresholds?: Record<string, RegistryCorrelationThreshold>;
}

export interface AdminConfig {
  enabled?: boolean;
  features?: Partial<Record<RegistryFeatureId, RegistryFeatureOverride>>;
  customLogs?: CustomLogDefinition[];
  /** Per-page whole-section ordering. IDs are stable layout section IDs. */
  layoutOrder?: Record<string, string[]>;
  /** Admin overrides for stable navigation item IDs. BIXBO branding is not a navigation item. */
  navigation?: { items?: Record<string, { label?: string; hidden?: boolean; order?: number }> };
  /** Route-scoped visible text overrides. BIXBO brand strings are rejected by the editor runtime. */
  textOverrides?: Record<string, { label?: string; hidden?: boolean }>;
  /** Route-scoped admin-created content blocks. These never participate in health calculations. */
  pageBlocks?: Record<string, AdminPageBlock[]>;
  /** Reserved for Google-account ownership once app authentication is enabled. */
  ownerEmail?: string;
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

export const BIXBO_LOG_FIELDS: Partial<Record<RegistryFeatureId, RegistryFieldDefinition[]>> = {
  pain: [
    { id: "score", label: "Pain scale", kind: "scale", order: 10, scale: { min: 0, max: 10, step: 1 } },
    { id: "parts", label: "Where does it hurt?", kind: "chips", order: 20, options: ["Head", "Neck", "Shoulder", "Chest", "Upper back", "Lower back", "Abdomen", "Pelvis", "Hip", "Arm", "Hand", "Leg", "Knee", "Foot"] },
    { id: "quality", label: "How does it hurt?", kind: "chips", order: 30, options: ["Sharp", "Dull", "Throbbing", "Burning", "Cramping", "Pressure", "Stabbing", "Aching"] },
    { id: "symptoms", label: "Other symptoms", kind: "chips", order: 40 },
  ],
  tetany: [
    { id: "intensity", label: "Intensity", kind: "scale", order: 10, scale: { min: 1, max: 5, step: 1 } },
    { id: "types", label: "Type", kind: "chips", order: 20 },
    { id: "location", label: "Location", kind: "chips", order: 30 },
    { id: "triggers", label: "Triggers", kind: "chips", order: 40 },
    { id: "helped", label: "What helped?", kind: "chips", order: 50 },
  ],
  panic: [
    { id: "intensity", label: "Intensity", kind: "scale", order: 10, scale: { min: 1, max: 10, step: 1 } },
    { id: "physical", label: "Physical symptoms", kind: "chips", order: 20 },
    { id: "cognitive", label: "Cognitive symptoms", kind: "chips", order: 30 },
    { id: "helped", label: "What helped?", kind: "chips", order: 40 },
  ],
  period: [
    { id: "flow", label: "Bleeding", kind: "chips", order: 10, options: ["Spotting", "Light", "Medium", "Heavy", "Very heavy"] },
    { id: "cramps", label: "Cramp pain", kind: "scale", order: 20, scale: { min: 1, max: 10, step: 1 } },
    { id: "discharge", label: "Discharge (optional)", kind: "chips", order: 30 },
  ],
  workout: [
    { id: "kind", label: "Type", kind: "chips", order: 10 },
    { id: "minutes", label: "Duration (minutes)", kind: "number", order: 20 },
    { id: "rpe", label: "Intensity (RPE)", kind: "scale", order: 30, scale: { min: 1, max: 10, step: 1 } },
    { id: "feel", label: "How you feel", kind: "chips", order: 40, options: ["Great", "Good", "Ok", "Tired", "Sore"] },
  ],
  bowel: [
    { id: "bristol", label: "Bristol type", kind: "scale", order: 10, scale: { min: 0, max: 7, step: 1 } },
    { id: "urinary", label: "Urinary", kind: "chips", order: 20 },
  ],
};

export function getRegistryField(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string): RegistryFieldDefinition | undefined {
  const base = BIXBO_LOG_FIELDS[featureId]?.find((field) => field.id === fieldId);
  if (!base) return undefined;
  const override = activeAdminConfig(data)?.features?.[featureId]?.fields?.[fieldId];
  return {
    ...base,
    ...override,
    id: base.id,
    options: base.options,
    scale: base.scale ? { ...base.scale, ...(override?.scale ?? {}) } : undefined,
  };
}

export function registryFieldsForFeature(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return (BIXBO_LOG_FIELDS[featureId] ?? [])
    .map((field) => getRegistryField(data, featureId, field.id)!)
    .filter((field) => field.enabled !== false)
    .sort((a, b) => a.order - b.order);
}

export function registryCustomFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  return [...(activeAdminConfig(data)?.features?.[featureId]?.customFields ?? [])]
    .filter((field) => field.enabled !== false)
    .sort((a, b) => a.order - b.order);
}

export function registryAdminHeatmapFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  const feature = activeAdminConfig(data)?.features?.[featureId];
  const selected = new Set(feature?.heatmapFieldIds ?? []);
  return [...(feature?.customFields ?? [])]
    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))
    .sort((a, b) => a.order - b.order);
}

export function registryAdminMonthlyFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  const feature = activeAdminConfig(data)?.features?.[featureId];
  const selected = new Set(feature?.monthlyFieldIds ?? []);
  return [...(feature?.customFields ?? [])]
    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))
    .sort((a, b) => a.order - b.order);
}

export function registryAdminCycleFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  const feature = activeAdminConfig(data)?.features?.[featureId];
  const selected = new Set(feature?.cycleFieldIds ?? []);
  return [...(feature?.customFields ?? [])]
    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))
    .sort((a, b) => a.order - b.order);
}

export function registryAdminTreatmentFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  const feature = activeAdminConfig(data)?.features?.[featureId];
  const selected = new Set(feature?.treatmentFieldIds ?? []);
  return [...(feature?.customFields ?? [])]
    .filter((field) => field.enabled !== false && (field.kind === "number" || field.kind === "scale") && selected.has(field.id))
    .sort((a, b) => a.order - b.order);
}

export function registryAdminCorrelationThreshold(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
  fieldId: string,
): RegistryCorrelationThreshold | undefined {
  const threshold = activeAdminConfig(data)?.features?.[featureId]?.correlationThresholds?.[fieldId];
  if (!threshold || !Number.isFinite(threshold.value) || (threshold.operator !== "gte" && threshold.operator !== "lte")) return undefined;
  return threshold;
}

export function registryAdminCorrelationFieldsForFeature(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
): RegistryFieldDefinition[] {
  const feature = activeAdminConfig(data)?.features?.[featureId];
  const selected = new Set(feature?.correlationFieldIds ?? []);
  return [...(feature?.customFields ?? [])]
    .filter((field) => {
      if (field.enabled === false || !selected.has(field.id)) return false;
      if (field.kind === "toggle" || field.kind === "chips") return true;
      if (field.kind === "number" || field.kind === "scale") return Boolean(registryAdminCorrelationThreshold(data, featureId, field.id));
      return false;
    })
    .sort((a, b) => a.order - b.order);
}

export function registryFieldLabel(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, fallback: string): string {
  return getRegistryField(data, featureId, fieldId)?.label ?? fallback;
}

export function registryFieldScale(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, fallback: RegistryScaleDefinition): RegistryScaleDefinition {
  const configured = getRegistryField(data, featureId, fieldId)?.scale;
  if (!configured) return fallback;
  const min = Number.isFinite(configured.min) ? configured.min : fallback.min;
  const max = Number.isFinite(configured.max) ? configured.max : fallback.max;
  const step = Number.isFinite(configured.step) && configured.step > 0 ? configured.step : fallback.step;
  return { min: Math.min(min, max), max: Math.max(min, max), step };
}

export function registryFieldOptions(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, base: string[]): string[] {
  const overrides = activeAdminConfig(data)?.features?.[featureId]?.fields?.[fieldId]?.options ?? {};
  const values = [...base];
  for (const value of Object.keys(overrides)) {
    if (!values.includes(value)) values.push(value);
  }
  return values
    .filter((value) => overrides[value]?.enabled !== false)
    .sort((a, b) => (overrides[a]?.order ?? values.indexOf(a)) - (overrides[b]?.order ?? values.indexOf(b)));
}

export function registryOptionLabel(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, value: string): string {
  return activeAdminConfig(data)?.features?.[featureId]?.fields?.[fieldId]?.options?.[value]?.label ?? value;
}

export function isRegistryOptionEnabled(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
  fieldId: string,
  value: string,
): boolean {
  return activeAdminConfig(data)?.features?.[featureId]?.fields?.[fieldId]?.options?.[value]?.enabled !== false;
}

export function customLogDefinitions(data: Pick<BixboData, "settings">): CustomLogDefinition[] {
  return [...(activeAdminConfig(data)?.customLogs ?? [])]
    .filter((log) => log.enabled !== false)
    .map((log) => ({ ...log, fields: [...(log.fields ?? [])].sort((a, b) => a.order - b.order) }))
    .sort((a, b) => a.order - b.order);
}

const byId = new Map(BIXBO_REGISTRY.map((feature) => [feature.id, feature]));

export function getRegistryFeature(data: Pick<BixboData, "settings">, id: RegistryFeatureId): RegistryFeatureDefinition {
  const base = byId.get(id);
  if (!base) throw new Error(`Unknown BIXBO registry feature: ${id}`);
  const override = activeAdminConfig(data)?.features?.[id];
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
  return activeAdminConfig(data)?.features?.[id]?.enabled !== false;
}

export function isRegistrySurfaceEnabled(
  data: Pick<BixboData, "settings">,
  id: RegistryFeatureId,
  surface: RegistrySurface,
): boolean {
  // Period is a core Heatmap metric. A stale local/global admin override must
  // never make it impossible to get Period back into the Heatmap selector.
  if (id === "period" && surface === "heatmap") return true;
  return isRegistryFeatureEnabled(data, id) && getRegistryFeature(data, id).surfaces[surface];
}

export function registryFeaturesForSurface(
  data: Pick<BixboData, "settings">,
  surface: RegistrySurface,
): RegistryFeatureDefinition[] {
  return BIXBO_REGISTRY
    .map((definition) => getRegistryFeature(data, definition.id))
    .filter((feature) => isRegistrySurfaceEnabled(data, feature.id, surface))
    .sort((a, b) => a.order - b.order);
}
