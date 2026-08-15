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

export type RegistryFieldKind = "chips" | "scale" | "text" | "number" | "toggle";

export interface RegistryFieldDefinition {
  id: string;
  label: string;
  kind: RegistryFieldKind;
  order: number;
  enabled?: boolean;
  options?: string[];
  optionLabels?: Record<string, string>;
  scale?: RegistryScaleDefinition;
}

/** Legacy type kept only so older backups with an adminConfig key can still parse. */
export interface AdminConfig {}

export interface CustomLogDefinition {
  id: string;
  label: string;
  icon: string;
  color: string;
  enabled?: boolean;
  deleted?: boolean;
  calendar?: boolean;
  quickLog?: boolean;
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
export interface RegistryFeatureOverride {}
export interface RegistryFieldOverride {}

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
  { id: "sex", label: "ŠukŠuk!", icon: "❤️", color: "#E45B87", order: 50, surfaces: s(true, true, true, true, false, false) },
  { id: "heat", label: "Heat / Cold / TENS", icon: "♨️", color: "#F07B4A", order: 60, surfaces: s(true, false, false, false, false, false) },
  { id: "food", label: "Food", icon: "🍽️", color: "#D9A441", order: 70, surfaces: s(true, false, false, false, false, true) },
  { id: "bowel", label: "Bowel", icon: "💩", color: "#A66A46", order: 80, surfaces: s(true, true, false, true, false, true) },
  { id: "workout", label: "Workout", icon: "👟", color: "#5A9D78", order: 90, surfaces: s(true, false, false, false, true, true) },
  { id: "temp", label: "Body & Recovery", icon: "🌿", color: "#8EA44A", order: 100, surfaces: s(true, false, false, false, true, false) },
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
    { id: "details", label: "Details", kind: "text", order: 50 },
  ],
  tetany: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "duration", label: "Duration (min)", kind: "number", order: 20 },
    { id: "intensity", label: "Intensity", kind: "scale", order: 30, scale: { min: 1, max: 5, step: 1 } },
    { id: "types", label: "Type", kind: "chips", order: 40 },
    { id: "location", label: "Location", kind: "chips", order: 50 },
    { id: "triggers", label: "Triggers", kind: "chips", order: 60 },
    { id: "helped", label: "What helped?", kind: "chips", order: 70 },
    { id: "rescueMed", label: "Rescue med (what you took)", kind: "text", order: 80 },
    { id: "note", label: "Note (optional)", kind: "text", order: 90 },
  ],
  panic: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "duration", label: "Duration (min)", kind: "number", order: 20 },
    { id: "intensity", label: "Intensity", kind: "scale", order: 30, scale: { min: 1, max: 10, step: 1 } },
    { id: "physical", label: "Physical symptoms", kind: "chips", order: 40 },
    { id: "cognitive", label: "Cognitive symptoms", kind: "chips", order: 50 },
    { id: "trigger", label: "Trigger (or 'no obvious trigger')", kind: "text", order: 60 },
    { id: "place", label: "Place (optional)", kind: "text", order: 70 },
    { id: "hyperventilation", label: "Hyperventilation", kind: "chips", order: 80 },
    { id: "tetanyPresent", label: "Tetany present?", kind: "toggle", order: 90 },
    { id: "helped", label: "What helped?", kind: "chips", order: 100 },
    { id: "rescueMed", label: "Rescue med (what you took)", kind: "text", order: 110 },
    { id: "note", label: "Note (optional)", kind: "text", order: 120 },
  ],
  period: [
    { id: "flow", label: "Flow", kind: "chips", order: 10, options: ["Spotting", "Light", "Medium", "Heavy", "Very heavy"] },
    { id: "cramps", label: "Cramp pain", kind: "scale", order: 20, scale: { min: 1, max: 10, step: 1 } },
    { id: "discharge", label: "Discharge (optional)", kind: "chips", order: 30 },
    { id: "dischargeNote", label: "Discharge note (optional)", kind: "text", order: 40 },
    { id: "note", label: "Day note (optional)", kind: "text", order: 50 },
    { id: "birthControlSince", label: "Birth control since (optional)", kind: "text", order: 60 },
    { id: "pregnant", label: "Pregnant?", kind: "toggle", order: 70, enabled: false },
  ],
  workout: [
    { id: "kind", label: "Type", kind: "chips", order: 10 },
    { id: "minutes", label: "Duration (minutes)", kind: "number", order: 20 },
    { id: "distance", label: "Distance / elevation", kind: "number", order: 30 },
    { id: "exercises", label: "Exercises", kind: "text", order: 40 },
    { id: "rpe", label: "Intensity (RPE)", kind: "scale", order: 50, scale: { min: 1, max: 10, step: 1 } },
    { id: "magnesiumBefore", label: "Magnesium before workout?", kind: "toggle", order: 60 },
    { id: "triggeredSymptom", label: "Triggered a symptom? (optional)", kind: "chips", order: 70 },
    { id: "weightKg", label: "Weight after (kg, optional)", kind: "number", order: 80 },
    { id: "feel", label: "How you feel", kind: "chips", order: 90, options: ["Great", "Good", "Ok", "Tired", "Sore"] },
    { id: "note", label: "Note (optional)", kind: "text", order: 100 },
  ],
  bowel: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "bristol", label: "Bristol stool scale", kind: "scale", order: 20, scale: { min: 0, max: 7, step: 1 } },
    { id: "urinary", label: "Urinary", kind: "chips", order: 30 },
    { id: "feelings", label: "How do you feel?", kind: "chips", order: 40 },
    { id: "symptoms", label: "Symptoms", kind: "chips", order: 50 },
    { id: "note", label: "Note (optional)", kind: "text", order: 60 },
  ],
  event: [
    { id: "title", label: "Title", kind: "text", order: 10 },
    { id: "dates", label: "Dates", kind: "text", order: 20 },
    { id: "times", label: "Times", kind: "text", order: 30 },
    { id: "color", label: "Color", kind: "chips", order: 40 },
    { id: "note", label: "Note (optional)", kind: "text", order: 50 },
  ],
  task: [
    { id: "title", label: "Task", kind: "text", order: 10 },
    { id: "dates", label: "Dates", kind: "text", order: 20 },
    { id: "times", label: "Times", kind: "text", order: 30 },
    { id: "note", label: "Note (optional)", kind: "text", order: 40 },
  ],
  food: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "what", label: "What did you eat?", kind: "text", order: 20 },
    { id: "quickAdd", label: "Quick add", kind: "chips", order: 30 },
    { id: "feelings", label: "How do I feel after food?", kind: "chips", order: 40 },
    { id: "symptomsAfter", label: "Symptoms after food", kind: "chips", order: 50 },
    { id: "highHistamine", label: "High histamine food?", kind: "toggle", order: 60 },
    { id: "histamineFlare", label: "Histamine flare?", kind: "toggle", order: 70 },
    { id: "allergens", label: "Allergens in this meal", kind: "chips", order: 80 },
    { id: "reaction", label: "Reaction?", kind: "toggle", order: 90 },
    { id: "intake", label: "Water / caffeine / alcohol", kind: "number", order: 100 },
    { id: "note", label: "Additional note (optional)", kind: "text", order: 110 },
  ],
  temp: [
    { id: "temperature", label: "New temperature measurement", kind: "number", order: 10 },
    { id: "weight", label: "New weight measurement", kind: "number", order: 20 },
    { id: "sleepHours", label: "Sleep (hours)", kind: "number", order: 30 },
    { id: "sleepQuality", label: "How I slept", kind: "chips", order: 40 },
  ],
  note: [
    { id: "time", label: "Time (optional)", kind: "text", order: 10 },
    { id: "text", label: "Anything about today…", kind: "text", order: 20 },
  ],
  postpartum: [
    { id: "symptoms", label: "Symptoms today", kind: "chips", order: 10 },
    { id: "note", label: "Recovery note (optional)", kind: "text", order: 20 },
  ],
  meds: [
    { id: "scheduled", label: "Scheduled meds", kind: "text", order: 10 },
    { id: "extraDose", label: "Extra dose (one-off)", kind: "text", order: 20 },
  ],
  sex: [
    { id: "time", label: "Time", kind: "text", order: 10 },
    { id: "type", label: "Type", kind: "chips", order: 20 },
    { id: "feelingAfter", label: "How I feel after", kind: "chips", order: 30 },
    { id: "painful", label: "Painful?", kind: "chips", order: 40 },
    { id: "note", label: "Note (optional)", kind: "text", order: 50 },
  ],
  heat: [
    { id: "type", label: "Type", kind: "chips", order: 10 },
    { id: "start", label: "Start", kind: "text", order: 20 },
    { id: "duration", label: "Duration (min)", kind: "number", order: 30 },
    { id: "note", label: "Note (optional)", kind: "text", order: 40 },
  ],
};

const byId = new Map(BIXBO_REGISTRY.map((feature) => [feature.id, feature]));

export function getRegistryField(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
  fieldId: string,
): RegistryFieldDefinition | undefined {
  void data;
  const base = BIXBO_LOG_FIELDS[featureId]?.find((field) => field.id === fieldId);
  if (!base) return undefined;
  return {
    ...base,
    options: base.options ? [...base.options] : undefined,
    optionLabels: base.optionLabels ? { ...base.optionLabels } : undefined,
    scale: base.scale ? { ...base.scale } : undefined,
  };
}

export function registryFieldsForFeature(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  void data;
  return [...(BIXBO_LOG_FIELDS[featureId] ?? [])]
    .filter((field) => field.enabled !== false)
    .sort((a, b) => a.order - b.order);
}

export function registryCustomFieldsForFeature(_data: Pick<BixboData, "settings">, _featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return [];
}

export function registryAdminHeatmapFieldsForFeature(_data: Pick<BixboData, "settings">, _featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return [];
}

export function registryAdminMonthlyFieldsForFeature(_data: Pick<BixboData, "settings">, _featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return [];
}

export function registryAdminCycleFieldsForFeature(_data: Pick<BixboData, "settings">, _featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return [];
}

export function registryAdminTreatmentFieldsForFeature(_data: Pick<BixboData, "settings">, _featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return [];
}

export function registryAdminCorrelationThreshold(
  _data: Pick<BixboData, "settings">,
  _featureId: RegistryFeatureId,
  _fieldId: string,
): RegistryCorrelationThreshold | undefined {
  return undefined;
}

export function registryAdminCorrelationFieldsForFeature(_data: Pick<BixboData, "settings">, _featureId: RegistryFeatureId): RegistryFieldDefinition[] {
  return [];
}

export function registryFieldLabel(data: Pick<BixboData, "settings">, featureId: RegistryFeatureId, fieldId: string, fallback: string): string {
  return getRegistryField(data, featureId, fieldId)?.label ?? fallback;
}

export function registryFieldScale(
  data: Pick<BixboData, "settings">,
  featureId: RegistryFeatureId,
  fieldId: string,
  fallback: RegistryScaleDefinition,
): RegistryScaleDefinition {
  const configured = getRegistryField(data, featureId, fieldId)?.scale;
  return configured ? { ...configured } : fallback;
}

export function registryFieldOptions(
  _data: Pick<BixboData, "settings">,
  _featureId: RegistryFeatureId,
  _fieldId: string,
  base: string[],
): string[] {
  return [...base];
}

export function registryOptionLabel(
  _data: Pick<BixboData, "settings">,
  _featureId: RegistryFeatureId,
  _fieldId: string,
  value: string,
): string {
  return value;
}

export function isRegistryOptionEnabled(
  _data: Pick<BixboData, "settings">,
  _featureId: RegistryFeatureId,
  _fieldId: string,
  _value: string,
): boolean {
  return true;
}

export function customLogDefinitions(_data: Pick<BixboData, "settings">): CustomLogDefinition[] {
  return [];
}

export function getRegistryFeature(data: Pick<BixboData, "settings">, id: RegistryFeatureId): RegistryFeatureDefinition {
  void data;
  const base = byId.get(id);
  if (!base) throw new Error(`Unknown BIXBO registry feature: ${id}`);
  return {
    ...base,
    surfaces: { ...base.surfaces },
    scale: base.scale ? { ...base.scale } : undefined,
    fields: base.fields ? [...base.fields] : undefined,
  };
}

export function isRegistryFeatureEnabled(_data: Pick<BixboData, "settings">, _id: RegistryFeatureId): boolean {
  return true;
}

export function isRegistrySurfaceEnabled(
  data: Pick<BixboData, "settings">,
  id: RegistryFeatureId,
  surface: RegistrySurface,
): boolean {
  return getRegistryFeature(data, id).surfaces[surface];
}

export function registryFeaturesForSurface(
  data: Pick<BixboData, "settings">,
  surface: RegistrySurface,
): RegistryFeatureDefinition[] {
  return BIXBO_REGISTRY
    .map((definition) => getRegistryFeature(data, definition.id))
    .filter((feature) => feature.surfaces[surface])
    .sort((a, b) => a.order - b.order);
}
