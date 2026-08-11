import type {
  AdminConfig,
  RegistryFeatureId,
  RegistryFeatureOverride,
  RegistryFieldOverride,
} from "./appRegistry";
import { getDeviceAdminConfig } from "./deviceAdminConfig";
import { getCachedGlobalAdminConfig } from "./globalAdminConfig";

function mergeField(base: RegistryFieldOverride = {}, local: RegistryFieldOverride = {}): RegistryFieldOverride {
  return {
    ...base,
    ...local,
    scale: base.scale || local.scale ? { ...(base.scale ?? {}), ...(local.scale ?? {}) } : undefined,
    options: base.options || local.options ? { ...(base.options ?? {}), ...(local.options ?? {}) } : undefined,
    fields: base.fields || local.fields ? { ...(base.fields ?? {}), ...(local.fields ?? {}) } : undefined,
  };
}

function mergeFeature(base: RegistryFeatureOverride = {}, local: RegistryFeatureOverride = {}): RegistryFeatureOverride {
  const fieldIds = new Set([...Object.keys(base.fields ?? {}), ...Object.keys(local.fields ?? {})]);
  const fields: Record<string, RegistryFieldOverride> = {};
  fieldIds.forEach((id) => {
    fields[id] = mergeField(base.fields?.[id], local.fields?.[id]);
  });
  return {
    ...base,
    ...local,
    surfaces: base.surfaces || local.surfaces ? { ...(base.surfaces ?? {}), ...(local.surfaces ?? {}) } : undefined,
    scale: base.scale || local.scale ? { ...(base.scale ?? {}), ...(local.scale ?? {}) } : undefined,
    fields: fieldIds.size ? fields : undefined,
  };
}

function mergeNavigation(globalConfig: AdminConfig, localConfig: AdminConfig): AdminConfig["navigation"] {
  if (!globalConfig.navigation && !localConfig.navigation) return undefined;
  const ids = new Set([
    ...Object.keys(globalConfig.navigation?.items ?? {}),
    ...Object.keys(localConfig.navigation?.items ?? {}),
  ]);
  const items: NonNullable<NonNullable<AdminConfig["navigation"]>["items"]> = {};
  ids.forEach((id) => {
    items[id] = {
      ...(globalConfig.navigation?.items?.[id] ?? {}),
      ...(localConfig.navigation?.items?.[id] ?? {}),
    };
  });
  return {
    ...(globalConfig.navigation ?? {}),
    ...(localConfig.navigation ?? {}),
    items,
  };
}

function mergeTextOverrides(globalConfig: AdminConfig, localConfig: AdminConfig): AdminConfig["textOverrides"] {
  if (!globalConfig.textOverrides && !localConfig.textOverrides) return undefined;
  const keys = new Set([
    ...Object.keys(globalConfig.textOverrides ?? {}),
    ...Object.keys(localConfig.textOverrides ?? {}),
  ]);
  const merged: NonNullable<AdminConfig["textOverrides"]> = {};
  keys.forEach((key) => {
    merged[key] = {
      ...(globalConfig.textOverrides?.[key] ?? {}),
      ...(localConfig.textOverrides?.[key] ?? {}),
    };
  });
  return merged;
}

export function mergeAdminConfigs(globalConfig: AdminConfig = {}, localConfig: AdminConfig = {}): AdminConfig {
  const featureIds = new Set<RegistryFeatureId>([
    ...(Object.keys(globalConfig.features ?? {}) as RegistryFeatureId[]),
    ...(Object.keys(localConfig.features ?? {}) as RegistryFeatureId[]),
  ]);
  const features: Partial<Record<RegistryFeatureId, RegistryFeatureOverride>> = {};
  featureIds.forEach((id) => {
    features[id] = mergeFeature(globalConfig.features?.[id], localConfig.features?.[id]);
  });

  return {
    ...globalConfig,
    ...localConfig,
    enabled: localConfig.enabled ?? globalConfig.enabled,
    ownerEmail: localConfig.ownerEmail ?? globalConfig.ownerEmail,
    features: featureIds.size ? features : undefined,
    // Local custom-log schema is intentionally a whole-device override when present.
    customLogs: localConfig.customLogs ?? globalConfig.customLogs,
    layoutOrder: {
      ...(globalConfig.layoutOrder ?? {}),
      ...(localConfig.layoutOrder ?? {}),
    },
    navigation: mergeNavigation(globalConfig, localConfig),
    textOverrides: mergeTextOverrides(globalConfig, localConfig),
    pageBlocks: {
      ...(globalConfig.pageBlocks ?? {}),
      ...(localConfig.pageBlocks ?? {}),
    },
  };
}

export function getEffectiveAdminConfig(ssrFallback: AdminConfig = {}): AdminConfig {
  if (typeof window === "undefined") return ssrFallback;
  return mergeAdminConfigs(getCachedGlobalAdminConfig(), getDeviceAdminConfig());
}
