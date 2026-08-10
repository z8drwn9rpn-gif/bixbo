from pathlib import Path

# appRegistry: browser runtime is device-local; SSR/tests can use injected data.
p = Path('src/lib/appRegistry.ts')
s = p.read_text(encoding='utf-8')
marker = 'export type RegistrySurface ='
helper = '''function activeAdminConfig(data: Pick<BixboData, "settings">): AdminConfig {\n  if (typeof window === "undefined") return data.settings.adminConfig ?? {};\n  return getDeviceAdminConfig();\n}\n\n'''
if 'function activeAdminConfig(' not in s:
    assert marker in s
    s = s.replace(marker, helper + marker, 1)
s = s.replace('getDeviceAdminConfig()?', 'activeAdminConfig(data)?')
p.write_text(s, encoding='utf-8')

# layout registry: same browser-vs-test fallback.
p = Path('src/lib/layoutRegistry.ts')
s = p.read_text(encoding='utf-8')
s = s.replace('getDeviceAdminConfig().layoutOrder?.[page]', '(typeof window === "undefined" ? data.settings.adminConfig : getDeviceAdminConfig()).layoutOrder?.[page]')
p.write_text(s, encoding='utf-8')

# Admin page: remove conditional useMemo and compute features directly after unlock.
p = Path('src/routes/admin.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace('import { useMemo, useState } from "react";', 'import { useState } from "react";')
old = '''  const features = useMemo(\n    () => BIXBO_REGISTRY.map((base) => getRegistryFeature(adminView, base.id)).sort((a, b) => a.order - b.order),\n    [adminView],\n  );'''
new = '''  const features = BIXBO_REGISTRY.map((base) => getRegistryFeature(adminView, base.id)).sort((a, b) => a.order - b.order);'''
assert old in s, 'generated Admin features useMemo not found'
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

print('Repaired test/SSR fallback while keeping browser Admin configuration device-local.')
