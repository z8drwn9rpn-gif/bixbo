from pathlib import Path

# AdminConfig schema
p = Path('src/lib/appRegistry.ts')
text = p.read_text()
needle = '  /** Route-scoped admin-created content blocks. These never participate in health calculations. */\n  pageBlocks?: Record<string, AdminPageBlock[]>;\n'
insert = needle + '  /** HAK overlay labels/layout. Stable item IDs; HAK calculations never depend on these values. */\n  hak?: { items?: Record<string, { label?: string; hidden?: boolean; order?: number }> };\n'
if needle not in text: raise SystemExit('appRegistry pageBlocks marker not found')
text = text.replace(needle, insert, 1)
p.write_text(text)

# Effective merge
p = Path('src/lib/effectiveAdminConfig.ts')
text = p.read_text()
marker = 'function mergeTextOverrides(globalConfig: AdminConfig, localConfig: AdminConfig): AdminConfig["textOverrides"] {'
if marker not in text: raise SystemExit('mergeText marker not found')
helper = '''function mergeHak(globalConfig: AdminConfig, localConfig: AdminConfig): AdminConfig["hak"] {
  if (!globalConfig.hak && !localConfig.hak) return undefined;
  return {
    ...(globalConfig.hak ?? {}),
    ...(localConfig.hak ?? {}),
    items: {
      ...(globalConfig.hak?.items ?? {}),
      ...(localConfig.hak?.items ?? {}),
    },
  };
}

'''
text = text.replace(marker, helper + marker, 1)
needle = '    pageBlocks: {\n      ...(globalConfig.pageBlocks ?? {}),\n      ...(localConfig.pageBlocks ?? {}),\n    },\n'
insert = needle + '    hak: mergeHak(globalConfig, localConfig),\n'
if needle not in text: raise SystemExit('pageBlocks merge marker not found')
text = text.replace(needle, insert, 1)
p.write_text(text)

# HAK overlay storage -> AdminConfig, preserving legacy fallback
p = Path('src/components/HakAdminEditOverlay.tsx')
text = p.read_text()
needle = 'import { getRegistryFeature } from "@/lib/appRegistry";\n'
insert = needle + 'import { getEffectiveAdminConfig } from "@/lib/effectiveAdminConfig";\nimport { DEVICE_ADMIN_CONFIG_CHANGED, getDeviceAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";\nimport { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";\n'
if needle not in text: raise SystemExit('HAK import marker not found')
text = text.replace(needle, insert, 1)
old = '''function readConfig(): HakConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HakConfig) : {};
  } catch {
    return {};
  }
}

function writeConfig(config: HakConfig) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("bixbo:hak-admin-change"));
}
'''
new = '''function readLegacyConfig(): HakConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HakConfig) : {};
  } catch {
    return {};
  }
}

function readConfig(): HakConfig {
  const hak = getEffectiveAdminConfig().hak;
  if (hak?.items) return hak.items as HakConfig;
  return readLegacyConfig();
}

function writeConfig(config: HakConfig) {
  const current = getDeviceAdminConfig();
  setDeviceAdminConfig({
    ...current,
    enabled: true,
    hak: { ...(current.hak ?? {}), items: config },
  });
}
'''
if old not in text: raise SystemExit('HAK storage helpers not found')
text = text.replace(old, new, 1)
old = '''    window.addEventListener("storage", refresh);
    window.addEventListener("bixbo:hak-admin-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("bixbo:hak-admin-change", refresh);
    };
'''
new = '''    window.addEventListener("storage", refresh);
    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
    window.addEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
      window.removeEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    };
'''
if old not in text: raise SystemExit('HAK refresh events not found')
text = text.replace(old, new, 1)
p.write_text(text)

Path('src/lib/__tests__/admin-hak-config.test.ts').write_text('''import { describe, expect, it } from "bun:test";\nimport { mergeAdminConfigs } from "../effectiveAdminConfig";\n\ndescribe("HAK admin config merge", () => {\n  it("merges HAK items by stable ID and lets local overrides win", () => {\n    const merged = mergeAdminConfigs(\n      { hak: { items: { protection: { label: "Protection", hidden: false }, sex: { label: "Sex" } } } },\n      { hak: { items: { protection: { label: "Protected", hidden: true } } } },\n    );\n    expect(merged.hak?.items?.protection).toEqual({ label: "Protected", hidden: true });\n    expect(merged.hak?.items?.sex).toEqual({ label: "Sex" });\n  });\n});\n''')
