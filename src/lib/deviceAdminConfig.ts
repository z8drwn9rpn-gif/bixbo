import type { AdminConfig } from "./appRegistry";

const DEVICE_ADMIN_CONFIG_KEY = "bixbo-admin-config-v1";
const DEVICE_ADMIN_CONFIG_EVENT = "bixbo-device-admin-config";

export function getDeviceAdminConfig(): AdminConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEVICE_ADMIN_CONFIG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AdminConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function hasDeviceAdminConfig(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEVICE_ADMIN_CONFIG_KEY) != null;
  } catch {
    return false;
  }
}

export function setDeviceAdminConfig(config: AdminConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_ADMIN_CONFIG_KEY, JSON.stringify(config ?? {}));
    window.dispatchEvent(new CustomEvent(DEVICE_ADMIN_CONFIG_EVENT));
  } catch {
    // Device storage can be unavailable in private/restricted browser contexts.
  }
}

/** Preserve this device's pre-migration Admin setup once, without syncing it. */
export function migrateLegacyAdminConfig(legacy?: AdminConfig): void {
  if (!legacy || hasDeviceAdminConfig()) return;
  setDeviceAdminConfig(legacy);
}

export function clearDeviceAdminConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEVICE_ADMIN_CONFIG_KEY);
    window.dispatchEvent(new CustomEvent(DEVICE_ADMIN_CONFIG_EVENT));
  } catch {
    // Ignore unavailable storage.
  }
}

export const DEVICE_ADMIN_CONFIG_CHANGED = DEVICE_ADMIN_CONFIG_EVENT;
