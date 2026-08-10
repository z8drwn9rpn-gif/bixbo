from pathlib import Path

p = Path('src/lib/appRegistry.ts')
s = p.read_text()
if 'calendar?: boolean;' not in s.split('export interface CustomLogDefinition {',1)[1].split('}',1)[0]:
    s = s.replace('''  enabled?: boolean;\n  order: number;\n  fields: RegistryFieldDefinition[];''', '''  enabled?: boolean;\n  /** Show the custom log icon on calendar days that contain entries. */\n  calendar?: boolean;\n  order: number;\n  fields: RegistryFieldDefinition[];''')
p.write_text(s)

p = Path('src/components/CustomLogBuilder.tsx')
s = p.read_text()
s = s.replace('''      enabled: true,\n      order: (logs.at(-1)?.order ?? 0) + 10,''', '''      enabled: true,\n      calendar: true,\n      order: (logs.at(-1)?.order ?? 0) + 10,''')
anchor = '''            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">'''
insert = '''            <div className="mt-3 flex items-center justify-between rounded-2xl bg-tint px-3 py-2 ring-1 ring-border/70">\n              <div><p className="text-xs font-semibold">{t("Show in Calendar")}</p><p className="text-[10px] text-muted-foreground">{t("Display this log's icon on days with saved entries.")}</p></div>\n              <button type="button" onClick={() => patchLog(log.id, { calendar: log.calendar === false })} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${log.calendar === false ? "bg-background text-muted-foreground" : "bg-primary text-primary-foreground"}`}>{log.calendar === false ? t("Off") : t("On")}</button>\n            </div>\n\n'''
if 'Display this log\'s icon on days with saved entries.' not in s:
    s = s.replace(anchor, insert + anchor)
p.write_text(s)

p = Path('src/components/MonthCalendar.tsx')
s = p.read_text()
s = s.replace('import { getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";', 'import { customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";')
needle = '''  add("headache", Boolean(log.pain?.some((entry) => entry.headache || entry.headacheIntensity != null)));\n  return Array.from(new Set(out)).slice(0, 3);'''
replacement = '''  add("headache", Boolean(log.pain?.some((entry) => entry.headache || entry.headacheIntensity != null)));\n  for (const custom of customLogDefinitions(data)) {\n    if (custom.calendar === false) continue;\n    if (log.customLogs?.[custom.id]?.length) out.push(custom.icon);\n  }\n  return Array.from(new Set(out)).slice(0, 3);'''
if needle in s:
    s = s.replace(needle, replacement)
else:
    raise SystemExit('iconsFor anchor not found')
p.write_text(s)
