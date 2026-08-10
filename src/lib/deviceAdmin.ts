const DEVICE_ADMIN_KEY = "bixbo-admin-device";

export function isDeviceAdminEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEVICE_ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDeviceAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_ADMIN_KEY, "1");
  } catch {
    // Storage can be unavailable in restricted/private browser contexts.
  }
}

export function disableDeviceAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEVICE_ADMIN_KEY);
    window.sessionStorage.removeItem("bixbo-admin-unlocked");
  } catch {
    // Ignore unavailable storage.
  }
}
