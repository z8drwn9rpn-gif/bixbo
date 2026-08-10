from pathlib import Path

# -----------------------------------------------------------------------------
# 1) Supabase migration: public read, PIN-gated SECURITY DEFINER publish RPC.
# -----------------------------------------------------------------------------
Path('supabase/migrations/20260811014000_global_admin_config.sql').write_text(r'''create extension if not exists pgcrypto;

create table if not exists public.app_global_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  published_at timestamptz not null default now()
);

insert into public.app_global_config (id, config)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_global_config enable row level security;

drop policy if exists "Global app config is readable" on public.app_global_config;
create policy "Global app config is readable"
on public.app_global_config
for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.app_global_config from anon, authenticated;
grant select on public.app_global_config to anon, authenticated;

create or replace function public.publish_global_admin_config(_pin text, _config jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  next_version bigint;
begin
  if encode(digest(coalesce(_pin, ''), 'sha256'), 'hex') <> 'dc4bc886825c446e6ae02d4d0c6a8787af0395079effcc3afc0f8bdc40cbd161' then
    raise exception 'Invalid admin PIN' using errcode = '42501';
  end if;

  insert into public.app_global_config (id, config, version, published_at)
  values ('default', coalesce(_config, '{}'::jsonb), 1, now())
  on conflict (id) do update
    set config = excluded.config,
        version = public.app_global_config.version + 1,
        published_at = now()
  returning version into next_version;

  return next_version;
end;
$$;

revoke all on function public.publish_global_admin_config(text, jsonb) from public;
grant execute on function public.publish_global_admin_config(text, jsonb) to anon, authenticated;
''', encoding='utf-8')

# -----------------------------------------------------------------------------
# 2) Global published config runtime + local cache.
# -----------------------------------------------------------------------------
Path('src/lib/globalAdminConfig.ts').write_text(r'''import { useEffect } from "react";
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
''', encoding='utf-8')

# -----------------------------------------------------------------------------
# 3) Pure merge: global published config -> local device override.
# -----------------------------------------------------------------------------
Path('src/lib/effectiveAdminConfig.ts').write_text(r'''import type {
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
  };
}

export function getEffectiveAdminConfig(ssrFallback: AdminConfig = {}): AdminConfig {
  if (typeof window === "undefined") return ssrFallback;
  return mergeAdminConfigs(getCachedGlobalAdminConfig(), getDeviceAdminConfig());
}
''', encoding='utf-8')

# -----------------------------------------------------------------------------
# 4) Registry/layout read effective config, not only local config.
# -----------------------------------------------------------------------------
p = Path('src/lib/appRegistry.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('import { getDeviceAdminConfig } from "./deviceAdminConfig";\n', 'import { getEffectiveAdminConfig } from "./effectiveAdminConfig";\n')
old = '''function activeAdminConfig(data: Pick<BixboData, "settings">): AdminConfig {\n  if (typeof window === "undefined") return data.settings.adminConfig ?? {};\n  return getDeviceAdminConfig();\n}'''
new = '''function activeAdminConfig(data: Pick<BixboData, "settings">): AdminConfig {\n  return getEffectiveAdminConfig(data.settings.adminConfig ?? {});\n}'''
assert old in s, 'activeAdminConfig block not found'
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

p = Path('src/lib/layoutRegistry.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('import { getDeviceAdminConfig } from "./deviceAdminConfig";', 'import { getEffectiveAdminConfig } from "./effectiveAdminConfig";')
s = s.replace('(typeof window === "undefined" ? (data.settings.adminConfig ?? {}) : getDeviceAdminConfig()).layoutOrder?.[page]', 'getEffectiveAdminConfig(data.settings.adminConfig ?? {}).layoutOrder?.[page]')
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 5) Root runtime downloads global published config on every device.
# -----------------------------------------------------------------------------
p = Path('src/routes/__root.tsx')
s = p.read_text(encoding='utf-8')
needle = 'import { useI18n } from "@/hooks/useI18n";\n'
if 'useGlobalAdminConfigSync' not in s:
    assert needle in s
    s = s.replace(needle, needle + 'import { useGlobalAdminConfigSync } from "@/lib/globalAdminConfig";\n', 1)
marker = '  useNotificationRuntime();\n'
if '  useGlobalAdminConfigSync();' not in s:
    assert marker in s
    s = s.replace(marker, marker + '  useGlobalAdminConfigSync();\n', 1)
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 6) Admin UI: local draft remains local; explicit Publish globally asks PIN.
# -----------------------------------------------------------------------------
p = Path('src/routes/admin.tsx')
s = p.read_text(encoding='utf-8')
needle = 'import { getDeviceAdminConfig, migrateLegacyAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";\n'
if 'publishGlobalAdminConfig' not in s:
    assert needle in s
    s = s.replace(needle, needle + 'import { getCachedGlobalAdminVersion, publishGlobalAdminConfig } from "@/lib/globalAdminConfig";\n', 1)

state = '  const [configRevision, setConfigRevision] = useState(0);\n'
if 'publishPin' not in s:
    assert state in s
    s = s.replace(state, state + '''  const [publishOpen, setPublishOpen] = useState(false);\n  const [publishPin, setPublishPin] = useState("");\n  const [publishing, setPublishing] = useState(false);\n  const [publishStatus, setPublishStatus] = useState("");\n''', 1)

before_return = '  return (\n    <AppShell\n'
if 'const publishToAllDevices' not in s:
    assert before_return in s
    handler = r'''  const publishToAllDevices = async () => {
    if (publishPin.length !== 4) return;
    setPublishing(true);
    setPublishStatus("");
    try {
      const version = await publishGlobalAdminConfig(getDeviceAdminConfig(), publishPin);
      setPublishStatus(`${t("Published globally")} · v${version}`);
      setPublishPin("");
      setPublishOpen(false);
    } catch (error) {
      console.error("publishGlobalAdminConfig", error);
      setPublishStatus(t("Global publish failed. Check the PIN and connection."));
    } finally {
      setPublishing(false);
    }
  };

'''
    s = s.replace(before_return, handler + before_return, 1)

registry_section_end = '''        </section>\n\n        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-tint p-1 lg:grid-cols-6">'''
if 'Publish globally' not in s:
    assert registry_section_end in s
    publish_ui = r'''        </section>

        <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{t("Device-local draft")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("Changes here stay on this device. Publish globally only when you want every device to use this configuration as its new default.")}
              </p>
              <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
                {t("Published version")}: {getCachedGlobalAdminVersion() || "—"}
              </p>
            </div>
            <button type="button" onClick={() => { setPublishOpen((value) => !value); setPublishStatus(""); }} className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              {t("Publish globally")}
            </button>
          </div>
          {publishOpen ? (
            <div className="mt-3 rounded-2xl bg-tint p-3 ring-1 ring-border/70">
              <p className="text-xs font-semibold">{t("Confirm global publish")}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{t("This will change the default configuration on every device. Local device overrides will still stay local and keep priority on that device.")}</p>
              <div className="mt-3 flex gap-2">
                <input type="password" inputMode="numeric" maxLength={4} value={publishPin} onChange={(event) => setPublishPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={t("Admin PIN")} className="h-10 min-w-0 flex-1 rounded-xl bg-background px-3 text-center font-bold tracking-[0.35em] ring-1 ring-border" />
                <button type="button" disabled={publishing || publishPin.length !== 4} onClick={() => void publishToAllDevices()} className="rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-40">{publishing ? t("Publishing…") : t("Confirm")}</button>
              </div>
            </div>
          ) : null}
          {publishStatus ? <p className="mt-2 text-xs font-semibold text-primary">{publishStatus}</p> : null}
        </section>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-tint p-1 lg:grid-cols-6">'''
    s = s.replace(registry_section_end, publish_ui, 1)
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 7) Supabase generated types for table + RPC.
# -----------------------------------------------------------------------------
p = Path('src/integrations/supabase/types.ts')
s = p.read_text(encoding='utf-8')
if 'app_global_config:' not in s:
    marker = '    Tables: {\n'
    assert marker in s
    table = '''    Tables: {\n      app_global_config: {\n        Row: {\n          config: Json\n          id: string\n          published_at: string\n          version: number\n        }\n        Insert: {\n          config?: Json\n          id: string\n          published_at?: string\n          version?: number\n        }\n        Update: {\n          config?: Json\n          id?: string\n          published_at?: string\n          version?: number\n        }\n        Relationships: []\n      }\n'''
    s = s.replace(marker, table, 1)
if 'publish_global_admin_config:' not in s:
    marker = '    Functions: {\n'
    assert marker in s
    fn = '''    Functions: {\n      publish_global_admin_config: {\n        Args: { _config: Json; _pin: string }\n        Returns: number\n      }\n'''
    s = s.replace(marker, fn, 1)
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 8) Regression tests for precedence semantics.
# -----------------------------------------------------------------------------
test = Path('src/lib/__tests__/effectiveAdminConfig.test.ts')
test.write_text(r'''import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";

describe("global + device Admin configuration", () => {
  it("uses globally published values when the device has no override", () => {
    const result = mergeAdminConfigs({
      features: { pain: { label: "Global pain", surfaces: { heatmap: false } } },
      layoutOrder: { home: ["home.quickLog", "home.calendar"] },
    }, {});
    expect(result.features?.pain?.label).toBe("Global pain");
    expect(result.features?.pain?.surfaces?.heatmap).toBe(false);
    expect(result.layoutOrder?.home?.[0]).toBe("home.quickLog");
  });

  it("keeps device-local changes above the global default", () => {
    const result = mergeAdminConfigs(
      { features: { pain: { label: "Global pain", surfaces: { heatmap: false, calendar: true } } } },
      { features: { pain: { label: "My phone pain", surfaces: { heatmap: true } } } },
    );
    expect(result.features?.pain?.label).toBe("My phone pain");
    expect(result.features?.pain?.surfaces?.heatmap).toBe(true);
    expect(result.features?.pain?.surfaces?.calendar).toBe(true);
  });

  it("keeps global page order except pages overridden on this device", () => {
    const result = mergeAdminConfigs(
      { layoutOrder: { home: ["a", "b"], insights: ["x", "y"] } },
      { layoutOrder: { home: ["b", "a"] } },
    );
    expect(result.layoutOrder?.home).toEqual(["b", "a"]);
    expect(result.layoutOrder?.insights).toEqual(["x", "y"]);
  });
});
''', encoding='utf-8')

print('Installed local-draft + global-published Admin config architecture.')
