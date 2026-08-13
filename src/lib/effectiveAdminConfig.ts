import type { AdminConfig } from "./appRegistry";

export function mergeAdminConfigs(_globalConfig: AdminConfig = {}, _localConfig: AdminConfig = {}): AdminConfig {
  return {};
}

export function getEffectiveAdminConfig(_ssrFallback: AdminConfig = {}): AdminConfig {
  return {};
}
