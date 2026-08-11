from pathlib import Path

# appRegistry: soft-delete marker and runtime exclusion while preserving definitions/history.
p = Path('src/lib/appRegistry.ts')
s = p.read_text()
old = '''export interface CustomLogDefinition {\n  id: string;\n  label: string;\n  icon: string;\n  color: string;\n  enabled?: boolean;'''
new = '''export interface CustomLogDefinition {\n  id: string;\n  label: string;\n  icon: string;\n  color: string;\n  enabled?: boolean;\n  /** Soft-deleted definitions stay in config so historical entries can be restored safely. */\n  deleted?: boolean;'''
assert old in s
s = s.replace(old, new, 1)
old = '''  return [...(activeAdminConfig(data)?.customLogs ?? [])]\n    .filter((log) => log.enabled !== false)'''
new = '''  return [...(activeAdminConfig(data)?.customLogs ?? [])]\n    .filter((log) => log.enabled !== false && log.deleted !== true)'''
assert old in s
s = s.replace(old, new, 1)
p.write_text(s)

# CustomLogBuilder: active/archived definitions, touch drag of whole log cards, safe delete/restore.
p = Path('src/components/CustomLogBuilder.tsx')
s = p.read_text()
old = '''  const logs = useMemo(() => [...(data.settings.adminConfig?.customLogs ?? [])].sort((a, b) => a.order - b.order), [data.settings.adminConfig?.customLogs]);\n  const [newName, setNewName] = useState(\"\");\n  const [dragField, setDragField] = useState<{ logId: string; fieldId: string } | null>(null);'''
new = '''  const allLogs = useMemo(() => [...(data.settings.adminConfig?.customLogs ?? [])].sort((a, b) => a.order - b.order), [data.settings.adminConfig?.customLogs]);\n  const logs = useMemo(() => allLogs.filter((log) => log.deleted !== true), [allLogs]);\n  const archivedLogs = useMemo(() => allLogs.filter((log) => log.deleted === true), [allLogs]);\n  const [newName, setNewName] = useState(\"\");\n  const [dragField, setDragField] = useState<{ logId: string; fieldId: string } | null>(null);\n  const [dragLogId, setDragLogId] = useState<string | null>(null);'''
assert old in s
s = s.replace(old, new, 1)
old = '''  const patchLog = (id: string, patch: Partial<CustomLogDefinition>) => {\n    writeLogs(logs.map((log) => (log.id === id ? { ...log, ...patch, id: log.id } : log)));\n  };'''
new = '''  const patchLog = (id: string, patch: Partial<CustomLogDefinition>) => {\n    writeLogs(allLogs.map((log) => (log.id === id ? { ...log, ...patch, id: log.id } : log)));\n  };'''
assert old in s
s = s.replace(old, new, 1)
s = s.replace('order: (logs.at(-1)?.order ?? 0) + 10,', 'order: Math.max(0, ...allLogs.map((item) => item.order)) + 10,', 1)
s = s.replace('writeLogs([...logs, next]);', 'writeLogs([...allLogs, next]);', 1)
anchor = '''  const dropField = (log: CustomLogDefinition, targetId: string) => {'''
insert = '''  const reorderLogs = (sourceId: string, targetId: string) => {\n    if (sourceId === targetId) return;\n    const active = [...logs].sort((a, b) => a.order - b.order);\n    const from = active.findIndex((log) => log.id === sourceId);\n    const to = active.findIndex((log) => log.id === targetId);\n    if (from < 0 || to < 0) return;\n    const [item] = active.splice(from, 1);\n    active.splice(to, 0, item);\n    const orderById = new Map(active.map((log, index) => [log.id, (index + 1) * 10]));\n    writeLogs(allLogs.map((log) => orderById.has(log.id) ? { ...log, order: orderById.get(log.id)! } : log));\n  };\n\n  const moveLogByPointer = (event: React.PointerEvent<HTMLElement>) => {\n    if (!dragLogId) return;\n    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(\"[data-custom-log-sort-id]\");\n    const targetId = target?.dataset.customLogSortId;\n    if (targetId && targetId !== dragLogId) reorderLogs(dragLogId, targetId);\n  };\n\n'''
assert anchor in s
s = s.replace(anchor, insert + anchor, 1)
old = '''          <section key={log.id} className=\"rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80\">\n            <div className=\"flex items-start gap-3\">'''
new = '''          <section\n            key={log.id}\n            data-custom-log-sort-id={log.id}\n            className={`rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 ${dragLogId === log.id ? \"ring-2 ring-primary\" : \"\"}`}\n          >\n            <div className=\"flex items-start gap-3\">\n              <button\n                type=\"button\"\n                aria-label={`${t(\"Drag\")} ${log.label}`}\n                onPointerDown={(event) => { event.preventDefault(); setDragLogId(log.id); try { event.currentTarget.setPointerCapture(event.pointerId); } catch {} }}\n                onPointerMove={moveLogByPointer}\n                onPointerUp={() => setDragLogId(null)}\n                onPointerCancel={() => setDragLogId(null)}\n                className=\"touch-none select-none rounded-xl bg-tint px-2 py-2 text-xs font-bold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing\"\n              >\n                ⋮⋮\n              </button>'''
assert old in s
s = s.replace(old, new, 1)
old = '''              <button type=\"button\" onClick={() => patchLog(log.id, { enabled: log.enabled === false })} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${log.enabled === false ? \"bg-tint text-muted-foreground\" : \"bg-primary text-primary-foreground\"}`}>{log.enabled === false ? t(\"Hidden\") : t(\"Enabled\")}</button>\n            </div>'''
new = '''              <div className=\"flex shrink-0 flex-col gap-1\">\n                <button type=\"button\" onClick={() => patchLog(log.id, { enabled: log.enabled === false })} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${log.enabled === false ? \"bg-tint text-muted-foreground\" : \"bg-primary text-primary-foreground\"}`}>{log.enabled === false ? t(\"Hidden\") : t(\"Enabled\")}</button>\n                <button\n                  type=\"button\"\n                  onClick={() => { if (confirm(`${t(\"Delete\")} ${log.label}?`)) patchLog(log.id, { deleted: true, enabled: false }); }}\n                  className=\"rounded-full bg-destructive/10 px-3 py-1.5 text-[10px] font-semibold text-destructive\"\n                >\n                  {t(\"Delete\")}\n                </button>\n              </div>\n            </div>'''
assert old in s
s = s.replace(old, new, 1)
# Add archived restore block before final root close.
marker = '''      {logs.map((log) => {'''
# archived block goes after logs map closing, using the final '\n    </div>\n  );' marker.
end_marker = '''    </div>\n  );\n}'''
archived = '''      {archivedLogs.length > 0 && (\n        <section className=\"rounded-3xl bg-tint p-4 ring-1 ring-border/80\">\n          <p className=\"font-serif text-base font-bold\">{t(\"Deleted custom logs\")}</p>\n          <p className=\"mt-1 text-[10px] text-muted-foreground\">{t(\"Definitions are kept so historical entries are never destroyed. Restore any log here.\")}</p>\n          <div className=\"mt-3 space-y-2\">\n            {archivedLogs.map((log) => (\n              <div key={log.id} className=\"flex items-center gap-2 rounded-2xl bg-background p-3 ring-1 ring-border\">\n                <span className=\"text-xl\">{log.icon}</span>\n                <span className=\"min-w-0 flex-1 truncate text-xs font-semibold\">{log.label}</span>\n                <button type=\"button\" onClick={() => patchLog(log.id, { deleted: false, enabled: true })} className=\"rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground\">{t(\"Restore\")}</button>\n              </div>\n            ))}\n          </div>\n        </section>\n      )}\n\n'''
assert end_marker in s
s = s.replace(end_marker, archived + end_marker, 1)
p.write_text(s)

# Home DayPreview: show/edit/delete admin-created custom log entries directly in selected-day overview.
p = Path('src/routes/index.tsx')
s = p.read_text()
import_anchor = 'import { layoutOrder } from "@/lib/layoutRegistry";\n'
assert import_anchor in s
s = s.replace(import_anchor, import_anchor + 'import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";\n', 1)
old = '''  const extraMeds = log?.extraMeds ?? [];\n  const cycleTrackingHidden = isCycleTrackingHidden(data);'''
new = '''  const extraMeds = log?.extraMeds ?? [];\n  const customLogsForDay = customLogDefinitions(data)\n    .map((definition) => ({ definition, entries: log?.customLogs?.[definition.id] ?? [] }))\n    .filter((item) => item.entries.length > 0);\n  const cycleTrackingHidden = isCycleTrackingHidden(data);'''
assert old in s
s = s.replace(old, new, 1)
old = '''    tasks.length ||\n    takenList.length ||\n    missedList.length;'''
new = '''    tasks.length ||\n    customLogsForDay.length ||\n    takenList.length ||\n    missedList.length;'''
assert old in s
s = s.replace(old, new, 1)
# insert formatter before return
anchor = '''  const markMissedTaken = (medKey: string) =>'''
formatter = '''  const formatCustomValue = (field: RegistryFieldDefinition, value: unknown): string => {\n    if (value == null || value === \"\") return \"\";\n    if (Array.isArray(value)) return value.map((item) => field.optionLabels?.[String(item)] ?? String(item)).join(\", \");\n    if (typeof value === \"boolean\") return value ? t(\"Yes\") : t(\"No\");\n    return String(value);\n  };\n\n'''
assert anchor in s
s = s.replace(anchor, formatter + anchor, 1)
# insert custom cards before notes card near end
anchor = '''      {notes.length > 0 && (\n        <Card title=\"Notes\" icon=\"📝\">'''
custom_block = '''      {customLogsForDay.map(({ definition, entries }) => (\n        <Card key={definition.id} title={definition.label} icon={definition.icon}>\n          <ul className=\"space-y-2 text-sm\">\n            {entries.map((entry) => (\n              <li key={entry.id} className=\"flex items-start gap-2\">\n                <button onClick={() => onEdit?.(`custom:${definition.id}`, entry)} className=\"min-w-0 flex-1 text-left\">\n                  <p className=\"text-xs font-semibold text-muted-foreground\">{entry.time || t(\"Entry\")}</p>\n                  {definition.fields\n                    .filter((field) => field.enabled !== false)\n                    .sort((a, b) => a.order - b.order)\n                    .map((field) => {\n                      const text = formatCustomValue(field, entry.values?.[field.id]);\n                      return text ? <p key={field.id} className=\"text-xs\"><span className=\"font-semibold\">{field.label}:</span> {text}</p> : null;\n                    })}\n                  {entry.note ? <p className=\"mt-1 whitespace-pre-line text-xs text-muted-foreground\">{entry.note}</p> : null}\n                  <p className=\"mt-1 text-[10px] text-primary\">{t(\"Tap to edit\")}</p>\n                </button>\n                <DeleteBtn\n                  onClick={() =>\n                    update((d) => {\n                      const day = d.dayLogs[date] ?? {};\n                      const customLogs = { ...(day.customLogs ?? {}) };\n                      const remaining = (customLogs[definition.id] ?? []).filter((item) => item.id !== entry.id);\n                      if (remaining.length) customLogs[definition.id] = remaining;\n                      else delete customLogs[definition.id];\n                      return { ...d, dayLogs: { ...d.dayLogs, [date]: { ...day, customLogs } } };\n                    })\n                  }\n                />\n              </li>\n            ))}\n          </ul>\n        </Card>\n      ))}\n\n'''
assert anchor in s
s = s.replace(anchor, custom_block + anchor, 1)
p.write_text(s)

print('final admin customization patch applied')