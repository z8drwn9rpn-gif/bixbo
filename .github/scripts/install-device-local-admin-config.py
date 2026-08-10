from pathlib import Path

# -----------------------------------------------------------------------------
# 1) Device-local Admin configuration storage
# -----------------------------------------------------------------------------
Path('src/lib/deviceAdminConfig.ts').write_text('''import type { AdminConfig } from "./appRegistry";

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
''', encoding='utf-8')

# -----------------------------------------------------------------------------
# 2) Registry reads ONLY device-local config. Synced settings.adminConfig is
#    intentionally ignored so one device cannot change another device's UI.
# -----------------------------------------------------------------------------
p = Path('src/lib/appRegistry.ts')
s = p.read_text(encoding='utf-8')
imp = 'import type { BixboData } from "./storage";\n'
if 'from "./deviceAdminConfig"' not in s:
    assert imp in s
    s = s.replace(imp, imp + 'import { getDeviceAdminConfig } from "./deviceAdminConfig";\n', 1)
s = s.replace('data.settings.adminConfig?', 'getDeviceAdminConfig()?')
p.write_text(s, encoding='utf-8')

# Layout ordering is device-local too.
p = Path('src/lib/layoutRegistry.ts')
s = p.read_text(encoding='utf-8')
imp = 'import type { BixboData } from "./storage";\n'
if 'from "./deviceAdminConfig"' not in s:
    assert imp in s
    s = s.replace(imp, imp + 'import { getDeviceAdminConfig } from "./deviceAdminConfig";\n', 1)
s = s.replace('data.settings.adminConfig?.layoutOrder?.[page]', 'getDeviceAdminConfig().layoutOrder?.[page]')
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 3) Admin page writes to the device-local config, not BixboData.
# -----------------------------------------------------------------------------
p = Path('src/routes/admin.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace('import { ArrowLeft, ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";', 'import { ArrowLeft } from "@/components/icons/BixboIcons";')
needle = 'import { enableDeviceAdmin } from "@/lib/deviceAdmin";\n'
if 'from "@/lib/deviceAdminConfig"' not in s:
    assert needle in s
    s = s.replace(needle, needle + 'import { getDeviceAdminConfig, migrateLegacyAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";\n', 1)

# revision for immediate Admin UI refresh
state = '  const [pinError, setPinError] = useState(false);\n'
if 'configRevision' not in s:
    assert state in s
    s = s.replace(state, state + '  const [configRevision, setConfigRevision] = useState(0);\n', 1)

view_line = '  const view = hydrated ? data : EMPTY;\n'
if 'const adminView =' not in s:
    assert view_line in s
    s = s.replace(view_line, view_line + '''  void configRevision;\n  const adminView: BixboData = { ...view, settings: { ...view.settings, adminConfig: getDeviceAdminConfig() } };\n  const deviceUpdate = (recipe: (current: BixboData) => BixboData) => {\n    const current: BixboData = { ...view, settings: { ...view.settings, adminConfig: getDeviceAdminConfig() } };\n    const next = recipe(current);\n    setDeviceAdminConfig(next.settings.adminConfig ?? {});\n    setConfigRevision((value) => value + 1);\n  };\n''', 1)

# Migrate only on the device where the user enters the Admin PIN; then clear the
# old synced copy from normal BIXBO data so future cloud writes do not carry it.
unlock = '        window.sessionStorage.setItem("bixbo-admin-unlocked", "1");\n        enableDeviceAdmin();\n'
if 'migrateLegacyAdminConfig(view.settings.adminConfig);' not in s:
    assert unlock in s
    s = s.replace(unlock, '        window.sessionStorage.setItem("bixbo-admin-unlocked", "1");\n        enableDeviceAdmin();\n        migrateLegacyAdminConfig(view.settings.adminConfig);\n        update((current) => ({ ...current, settings: { ...current.settings, adminConfig: undefined } }));\n', 1)

# All Admin calculations/edits operate on adminView/deviceUpdate.
s = s.replace('getRegistryFeature(view, base.id)', 'getRegistryFeature(adminView, base.id)')
s = s.replace('[view],\n  );', '[adminView],\n  );', 1)
s = s.replace('update((current) => {', 'deviceUpdate((current) => {')
s = s.replace('<CustomLogBuilder data={view} update={update} />', '<CustomLogBuilder data={adminView} update={deviceUpdate} />')
s = s.replace('<LayoutOrderEditor data={view} update={update} />', '<LayoutOrderEditor data={adminView} update={deviceUpdate} />')
s = s.replace('getRegistryField(view, feature.id, baseField.id)', 'getRegistryField(adminView, feature.id, baseField.id)')
s = s.replace('view.settings.adminConfig?', 'adminView.settings.adminConfig?')
s = s.replace('isRegistryFeatureEnabled(view, feature.id)', 'isRegistryFeatureEnabled(adminView, feature.id)')

# moveTo should keep drag active while touch pointer traverses rows.
s = s.replace('    setDragged(null);\n  };\n\n  return (', '  };\n\n  const moveDraggedByPointer = (event: React.PointerEvent<HTMLElement>) => {\n    if (!dragged) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-feature-sort-id]");\n    const targetId = target?.dataset.featureSortId as RegistryFeatureId | undefined;\n    if (targetId && targetId !== dragged) moveTo(targetId);\n  };\n\n  return (', 1)

# Add data id and keep native desktop DnD finish behaviour.
s = s.replace('                key={feature.id}\n                draggable', '                key={feature.id}\n                data-feature-sort-id={feature.id}\n                draggable')
s = s.replace('                onDrop={() => moveTo(feature.id)}', '                onDrop={() => { moveTo(feature.id); setDragged(null); }}')

# Replace arrow controls with a pointer/touch drag handle.
old = '''                  <div className="flex gap-1">\n                    <button type="button" onClick={() => move(feature.id, -1)} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move up")}><ChevronLeft className="h-4 w-4 rotate-90" /></button>\n                    <button type="button" onClick={() => move(feature.id, 1)} disabled={index === features.length - 1} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move down")}><ChevronRight className="h-4 w-4 rotate-90" /></button>\n                  </div>'''
new = '''                  <button\n                    type="button"\n                    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragged(feature.id); }}\n                    onPointerMove={moveDraggedByPointer}\n                    onPointerUp={() => setDragged(null)}\n                    onPointerCancel={() => setDragged(null)}\n                    style={{ touchAction: "none" }}\n                    className="inline-flex h-9 items-center gap-2 rounded-full bg-tint px-3 text-[11px] font-semibold text-muted-foreground cursor-grab active:cursor-grabbing"\n                    aria-label={t("Drag to reorder")}\n                  ><span className="text-base leading-none">⋮⋮</span>{t("Drag")}</button>'''
assert old in s, 'admin arrow controls not found'
s = s.replace(old, new, 1)
# old move function is now unused
start = s.find('  const move = (id: RegistryFeatureId, delta: -1 | 1) => {')
if start >= 0:
    end = s.find('\n  };', start) + len('\n  };')
    s = s[:start] + s[end:]
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 4) Layout editor: pointer drag works with touch/mouse; remove arrow UI.
# -----------------------------------------------------------------------------
p = Path('src/components/LayoutOrderEditor.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace('import { ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";\n', '')
# Remove move function
start = s.find('  const move = (id: string, delta: -1 | 1) => {')
if start >= 0:
    end = s.find('\n  };', start) + len('\n  };')
    s = s[:start] + s[end:]
# drop no longer ends drag; pointer up / native drop does
s = s.replace('    writeOrder(ids);\n    setDragged(null);\n  };', '    writeOrder(ids);\n  };', 1)
if 'moveDraggedByPointer' not in s:
    marker = '  const reset = () => update((current) => {'
    insert = '''  const moveDraggedByPointer = (event: React.PointerEvent<HTMLElement>) => {\n    if (!dragged) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-layout-sort-id]");\n    const targetId = target?.dataset.layoutSortId;\n    if (targetId && targetId !== dragged) drop(targetId);\n  };\n\n'''
    assert marker in s
    s = s.replace(marker, insert + marker, 1)
s = s.replace('          <div key={section.id} draggable', '          <div key={section.id} data-layout-sort-id={section.id} draggable')
s = s.replace('onDrop={() => drop(section.id)}', 'onDrop={() => { drop(section.id); setDragged(null); }}')
old = '''            <button type="button" onClick={() => move(section.id, -1)} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move up")}><ChevronLeft className="h-4 w-4 rotate-90" /></button>\n            <button type="button" onClick={() => move(section.id, 1)} disabled={index === sections.length - 1} className="grid h-9 w-9 place-items-center rounded-full bg-tint disabled:opacity-30" aria-label={t("Move down")}><ChevronRight className="h-4 w-4 rotate-90" /></button>'''
new = '''            <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragged(section.id); }} onPointerMove={moveDraggedByPointer} onPointerUp={() => setDragged(null)} onPointerCancel={() => setDragged(null)} style={{ touchAction: "none" }} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-tint px-3 text-[11px] font-semibold text-muted-foreground cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-base">⋮⋮</span>{t("Drag")}</button>'''
assert old in s, 'layout arrows not found'
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 5) Custom log field ordering: pointer/touch drag instead of arrows.
# -----------------------------------------------------------------------------
p = Path('src/components/CustomLogBuilder.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace('import { Plus, ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";', 'import { Plus } from "@/components/icons/BixboIcons";')
# Remove moveField arrow helper
start = s.find('  const moveField = (log: CustomLogDefinition, fieldId: string, delta: -1 | 1) => {')
if start >= 0:
    end = s.find('\n  };', start) + len('\n  };')
    s = s[:start] + s[end:]
# keep drag state until pointer up/native drop
s = s.replace('    patchLog(log.id, { fields: ordered.map((field, idx) => ({ ...field, order: (idx + 1) * 10 })) });\n    setDragField(null);\n  };', '    patchLog(log.id, { fields: ordered.map((field, idx) => ({ ...field, order: (idx + 1) * 10 })) });\n  };', 1)
if 'moveFieldByPointer' not in s:
    marker = '  return (\n'
    insert = '''  const moveFieldByPointer = (event: React.PointerEvent<HTMLElement>, log: CustomLogDefinition) => {\n    if (!dragField || dragField.logId !== log.id) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-field-sort-id]");\n    const raw = target?.dataset.fieldSortId;\n    if (!raw) return;\n    const [logId, fieldId] = raw.split(":");\n    if (logId === log.id && fieldId && fieldId !== dragField.fieldId) dropField(log, fieldId);\n  };\n\n'''
    assert marker in s
    s = s.replace(marker, insert + marker, 1)
s = s.replace('                  key={field.id}\n                  draggable', '                  key={field.id}\n                  data-field-sort-id={`${log.id}:${field.id}`}\n                  draggable')
s = s.replace('                  onDrop={() => dropField(log, field.id)}', '                  onDrop={() => { dropField(log, field.id); setDragField(null); }}')
old = '''                    <div className="flex gap-1"><button type="button" onClick={() => moveField(log, field.id, -1)} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5 rotate-90" /></button><button type="button" onClick={() => moveField(log, field.id, 1)} disabled={index === fields.length - 1} className="grid h-8 w-8 place-items-center rounded-full bg-background disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5 rotate-90" /></button></div>'''
new = '''                    <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragField({ logId: log.id, fieldId: field.id }); }} onPointerMove={(event) => moveFieldByPointer(event, log)} onPointerUp={() => setDragField(null)} onPointerCancel={() => setDragField(null)} style={{ touchAction: "none" }} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-background px-2.5 text-[10px] font-semibold text-muted-foreground cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>'''
assert old in s, 'custom field arrows not found'
s = s.replace(old, new, 1)
# Update explanatory copy
s = s.replace('Drag fields on desktop or use the arrows on mobile.', 'Drag fields to reorder them on mobile or desktop.')
p.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 6) Guard against any runtime direct reads of synced adminConfig outside Admin
#    editors. The editors receive adminView whose config is device-local.
# -----------------------------------------------------------------------------
# i18n keys are optional because English fallback is the key itself; add SK values
# if the dictionary file contains the existing admin labels, but don't risk parser.

print('Installed device-local Admin config and pointer/touch drag ordering.')
