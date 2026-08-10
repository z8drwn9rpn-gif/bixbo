import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AdminConfig } from "./appRegistry";

const GLOBAL_CACHE_KEY = "bixbo-global-admin-config-v1";
const GLOBAL_VERSION_KEY = "bixbo-global-admin-config-version-v1";
const GLOBAL_CONFIG_EVENT = "bixbo-global-admin-config";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getCachedGlobalAdminConfig(): AdminConfig {
  return readJson<AdminConfig>(GLOBAL_CACHE_KEY, {});
}

export function getCachedGlobalAdminVersion(): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(GLOBAL_VERSION_KEY) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function setGlobalCache(config: AdminConfig, version: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(config ?? {}));
    window.localStorage.setItem(GLOBAL_VERSION_KEY, String(version || 0));
    window.dispatchEvent(new CustomEvent(GLOBAL_CONFIG_EVENT));
  } catch {
    // The app still works with built-in defaults when storage is unavailable.
  }
}

export async function refreshPublishedGlobalAdminConfig(): Promise<AdminConfig> {
  const { data, error } = await supabase
    .from("app_global_config")
    .select("config, version")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.warn("refreshPublishedGlobalAdminConfig", error);
    return getCachedGlobalAdminConfig();
  }

  const config = (data?.config ?? {}) as unknown as AdminConfig;
  setGlobalCache(config, Number(data?.version ?? 0));
  return config;
}

export async function publishGlobalAdminConfig(config: AdminConfig, pin: string): Promise<number> {
  const { data, error } = await supabase.rpc("publish_global_admin_config", {
    _pin: pin,
    _config: config as unknown as Json,
  });
  if (error) throw error;
  const version = Number(data ?? 0);
  setGlobalCache(config, version);
  return version;
}

/** Load published config at app start and refresh when the app returns to foreground. */
export function useGlobalAdminConfigSync(): void {
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!active) return;
      await refreshPublishedGlobalAdminConfig();
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

export const GLOBAL_ADMIN_CONFIG_CHANGED = GLOBAL_CONFIG_EVENT;
