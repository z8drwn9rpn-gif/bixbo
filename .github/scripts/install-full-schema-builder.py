from pathlib import Path

# storage.ts: generic custom log values/entries + per-day storage
p = Path('src/lib/storage.ts')
s = p.read_text()
needle = '''export interface HistamineEntry {\n  id: string;\n  time: string;\n  flare: boolean;\n  note?: string;\n}\n'''
insert = needle + '''\nexport type CustomLogValue = string | number | boolean | string[];\nexport interface CustomLogEntry {\n  id: string;\n  time: string;\n  values: Record<string, CustomLogValue>;\n  note?: string;\n}\n'''
if 'export interface CustomLogEntry' not in s:
    s = s.replace(needle, insert)
if 'customLogs?: Record<string, CustomLogEntry[]>;' not in s:
    s = s.replace('''  histamine?: HistamineEntry[];\n  /** Pregnancy-mode daily log''', '''  histamine?: HistamineEntry[];\n  /** Admin-created generic logs. Keys are stable custom-log IDs. */\n  customLogs?: Record<string, CustomLogEntry[]>;\n  /** Pregnancy-mode daily log''')
p.write_text(s)

# appRegistry.ts: custom log definitions and helpers
p = Path('src/lib/appRegistry.ts')
s = p.read_text()
custom_types = '''\nexport interface CustomLogDefinition {\n  id: string;\n  label: string;\n  icon: string;\n  color: string;\n  enabled?: boolean;\n  order: number;\n  fields: RegistryFieldDefinition[];\n}\n'''
if 'export interface CustomLogDefinition' not in s:
    s = s.replace('''export interface RegistryFeatureDefinition {''', custom_types + '''\nexport interface RegistryFeatureDefinition {''')
if 'customLogs?: CustomLogDefinition[];' not in s:
    s = s.replace('''export interface AdminConfig {\n  enabled?: boolean;\n  features?: Partial<Record<RegistryFeatureId, RegistryFeatureOverride>>;\n}''', '''export interface AdminConfig {\n  enabled?: boolean;\n  features?: Partial<Record<RegistryFeatureId, RegistryFeatureOverride>>;\n  customLogs?: CustomLogDefinition[];\n}''')
helper = '''\nexport function customLogDefinitions(data: Pick<BixboData, "settings">): CustomLogDefinition[] {\n  return [...(data.settings.adminConfig?.customLogs ?? [])]\n    .filter((log) => log.enabled !== false)\n    .map((log) => ({ ...log, fields: [...(log.fields ?? [])].sort((a, b) => a.order - b.order) }))\n    .sort((a, b) => a.order - b.order);\n}\n'''
if 'export function customLogDefinitions' not in s:
    s = s.replace('\nconst byId = new Map(BIXBO_REGISTRY.map((feature) => [feature.id, feature]));', helper + '\nconst byId = new Map(BIXBO_REGISTRY.map((feature) => [feature.id, feature]));')
p.write_text(s)

# admin.tsx: mount custom log builder on the fields tab
p = Path('src/routes/admin.tsx')
s = p.read_text()
if 'CustomLogBuilder' not in s:
    s = s.replace('import { AppShell } from "@/components/AppShell";', 'import { AppShell } from "@/components/AppShell";\nimport { CustomLogBuilder } from "@/components/CustomLogBuilder";')
anchor = '''        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">'''
if '{tab === "fields" && <CustomLogBuilder' not in s:
    s = s.replace(anchor, '''        {tab === "fields" && <CustomLogBuilder data={view} update={update} />}\n\n''' + anchor)
p.write_text(s)

# LogSheet.tsx: custom categories + generic form
p = Path('src/components/LogSheet.tsx')
s = p.read_text()
if 'CustomLogForm' not in s:
    s = s.replace('import { Ico, IcoText } from "@/components/icons/BixboIcons";', 'import { Ico, IcoText } from "@/components/icons/BixboIcons";\nimport { CustomLogForm } from "@/components/CustomLogForm";')
s = s.replace('import { getRegistryFeature, isRegistrySurfaceEnabled, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, type RegistryFeatureId } from "@/lib/appRegistry";', 'import { getRegistryFeature, isRegistrySurfaceEnabled, registryFieldLabel, registryFieldOptions, registryFieldScale, registryOptionLabel, customLogDefinitions, type RegistryFeatureId } from "@/lib/appRegistry";')
if '| `custom:${string}`;' not in s:
    s = s.replace('''  | "event"\n  | "note";''', '''  | "event"\n  | "note"\n  | `custom:${string}`;''')

old = '''  const orderedCats = useMemo(() => {\n    const saved = data.settings.logOrder ?? [];\n    const source = CATEGORIES\n      .map((category) => {\n        const feature = getRegistryFeature(data, category.id as RegistryFeatureId);\n        return { ...category, label: feature.label, emoji: feature.icon, registryOrder: feature.order };\n      })\n      .filter((category) => {\n        if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;\n        if (category.id === "period" && cycleTrackingHidden) return false;\n        if (category.id === "postpartum" && !postpartumActive) return false;\n        return true;\n      })\n      .sort((a, b) => a.registryOrder - b.registryOrder);\n    const byId = new Map(source.map((c) => [c.id, c]));\n    const seen = new Set<string>();\n    const out: typeof CATEGORIES = [];\n    for (const id of saved) {\n      const c = byId.get(id as Category);\n      if (c && !seen.has(id)) {\n        out.push(c);\n        seen.add(id);\n      }\n    }\n    for (const c of source) if (!seen.has(c.id)) out.push(c);\n    return out;\n  }, [cycleTrackingHidden, data, postpartumActive]);'''
new = '''  const orderedCats = useMemo(() => {\n    const saved = data.settings.logOrder ?? [];\n    const builtins = CATEGORIES\n      .map((category) => {\n        const feature = getRegistryFeature(data, category.id as RegistryFeatureId);\n        return { ...category, label: feature.label, emoji: feature.icon, registryOrder: feature.order };\n      })\n      .filter((category) => {\n        if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;\n        if (category.id === "period" && cycleTrackingHidden) return false;\n        if (category.id === "postpartum" && !postpartumActive) return false;\n        return true;\n      });\n    const customs = customLogDefinitions(data).map((definition) => ({\n      id: `custom:${definition.id}` as Category,\n      label: definition.label,\n      emoji: definition.icon,\n      hint: "Custom log",\n      registryOrder: 1000 + definition.order,\n    }));\n    const source = [...builtins, ...customs].sort((a, b) => a.registryOrder - b.registryOrder);\n    const byId = new Map(source.map((c) => [c.id, c]));\n    const seen = new Set<string>();\n    const out: typeof source = [];\n    for (const id of saved) {\n      const c = byId.get(id as Category);\n      if (c && !seen.has(id)) {\n        out.push(c);\n        seen.add(id);\n      }\n    }\n    for (const c of source) if (!seen.has(c.id)) out.push(c);\n    return out;\n  }, [cycleTrackingHidden, data, postpartumActive]);'''
if old in s:
    s = s.replace(old, new)
else:
    raise SystemExit('orderedCats block not found')

s = s.replace('<SheetTitle className="font-serif text-lg">{t(CATEGORIES.find((c) => c.id === active)?.label ?? "")}</SheetTitle>', '<SheetTitle className="font-serif text-lg">{t(orderedCats.find((c) => c.id === active)?.label ?? CATEGORIES.find((c) => c.id === active)?.label ?? "")}</SheetTitle>')
s = s.replace('<LogSchemaContext.Provider value={active ? { data, featureId: active as RegistryFeatureId } : null}>', '<LogSchemaContext.Provider value={active && !active.startsWith("custom:") ? { data, featureId: active as RegistryFeatureId } : null}>')

custom_render = '''              {active?.startsWith("custom:") && (() => {\n                const id = active.slice("custom:".length);\n                const definition = customLogDefinitions(data).find((item) => item.id === id);\n                return definition ? <CustomLogForm definition={definition} date={date} data={data} update={update} onDone={close} /> : null;\n              })()}\n\n'''
needle = '''              {active === "postpartum" && ('''
if 'active?.startsWith("custom:")' not in s:
    s = s.replace(needle, custom_render + needle)
p.write_text(s)

print('full schema builder patch ready')
