from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# 1) PDF: iOS/PWA-safe print window instead of relying only on standalone window.print().
report = 'src/routes/report.tsx'
replace_once(
    report,
    '  const title = monthLabel(month, locale);\n\n  return <AppShell',
    '''  const title = monthLabel(month, locale);\n\n  const printReport = () => {\n    const reportPage = document.querySelector<HTMLElement>(\".pdf-page\");\n    const styleNode = document.querySelector<HTMLStyleElement>(\"style[data-bixbo-pdf-styles]\");\n    if (!reportPage || !styleNode) {\n      window.print();\n      return;\n    }\n\n    const popup = window.open(\"\", \"_blank\");\n    if (!popup) {\n      window.print();\n      return;\n    }\n\n    popup.document.open();\n    popup.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>${title} — BIXBO</title><style>${styleNode.textContent ?? \"\"}</style></head><body><div class=\"pdf-report-root\">${reportPage.outerHTML}</div></body></html>`);\n    popup.document.close();\n    popup.focus();\n    window.setTimeout(() => popup.print(), 180);\n  };\n\n  return <AppShell'''
)
replace_once(report, '    <style>{`', '    <style data-bixbo-pdf-styles>{`')
replace_once(report, 'onClick={() => window.print()}', 'onClick={printReport}')

# 2) Blueberry: hide the pregnancy yes/no field while preserving any historical data.
registry = 'src/lib/appRegistry.ts'
replace_once(
    registry,
    '{ id: "pregnant", label: "Pregnant?", kind: "toggle", order: 70 },',
    '{ id: "pregnant", label: "Pregnant?", kind: "toggle", order: 70, enabled: false },'
)

# 3) Meds log: use the same sticky top SaveBar as the other log forms and remove the bottom Done footer.
logsheet = 'src/components/LogSheet.tsx'
replace_once(
    logsheet,
    '  return (\n    <div className="flex flex-col gap-4">\n      <div className="flex flex-col gap-4">\n      <RegistryFieldBlock fieldId="scheduled">',
    '  return (\n    <div className="flex flex-col gap-4">\n      <SaveBar onCancel={onDone} onSave={() => { schema?.saveAdminCustomFields(); onDone(); }} />\n      <div className="flex flex-col gap-4">\n      <RegistryFieldBlock fieldId="scheduled">'
)
replace_once(
    logsheet,
    '''      </div>\n      <SheetFooter className="mt-2">\n        <div className="mt-5 flex justify-end border-t border-border/50 pt-4">\n          <button\n            type="button"\n            onClick={() => { schema?.saveAdminCustomFields(); onDone(); }}\n            className="inline-flex h-10 min-w-[78px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"\n          >\n            <span>{t("Done")}</span>\n            <span aria-hidden="true" className="text-base leading-none">✓</span>\n          </button>\n        </div>\n      </SheetFooter>\n    </div>''',
    '''      </div>\n    </div>'''
)

# 4) New custom log: allow Heatmap by entry presence even before a numeric/scale field exists.
builder = 'src/components/CustomLogBuilder.tsx'
replace_once(
    builder,
    '{t("Choose a numeric or scale field to expose in Insights Heatmap.")}',
    '{t("Choose entry presence or a numeric/scale field to expose in Insights Heatmap.")}'
)
replace_once(
    builder,
    '<option value="">{t("Off")}</option>\n                    {metricFields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}',
    '<option value="">{t("Off")}</option>\n                    <option value="__count__">{t("Entries / days logged")}</option>\n                    {metricFields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}'
)

insights = 'src/routes/insights.tsx'
replace_once(
    insights,
    '''    const customs = customLogDefinitions(data).flatMap((log) => {\n      if (!log.heatmapFieldId) return [];\n      const field = log.fields.find((item) => item.id === log.heatmapFieldId && item.enabled !== false && (item.kind === "number" || item.kind === "scale"));\n      if (!field) return [];\n      return [{ id: `custom:${log.id}:${field.id}` as HeatmapMetric, label: `${log.label} · ${field.label}` }];\n    });''',
    '''    const customs = customLogDefinitions(data).flatMap((log) => {\n      if (!log.heatmapFieldId) return [];\n      if (log.heatmapFieldId === "__count__") {\n        return [{ id: `custom:${log.id}:__count__` as HeatmapMetric, label: log.label }];\n      }\n      const field = log.fields.find((item) => item.id === log.heatmapFieldId && item.enabled !== false && (item.kind === "number" || item.kind === "scale"));\n      if (!field) return [];\n      return [{ id: `custom:${log.id}:${field.id}` as HeatmapMetric, label: `${log.label} · ${field.label}` }];\n    });'''
)
replace_once(
    insights,
    '''        const definition = customLogDefinitions(data).find((item) => item.id === logId);\n        const field = definition?.fields.find((item) => item.id === fieldId);\n        const entries = log.customLogs?.[logId] ?? [];\n        const values = entries.map((entry) => strictAdminNumericValue(entry.values[fieldId])).filter((value) => Number.isFinite(value));\n        if (!definition || !field || !values.length) return null;''',
    '''        const definition = customLogDefinitions(data).find((item) => item.id === logId);\n        const entries = log.customLogs?.[logId] ?? [];\n        if (!definition || !entries.length) return null;\n        if (fieldId === "__count__") {\n          return {\n            color: definition.color,\n            tooltipColor: definition.color,\n            value: `${entries.length}×`,\n            popupValue: `${definition.label} · ${entries.length}×`,\n            description: entries.length === 1 ? "1 entry" : `${entries.length} entries`,\n            entryCount: entries.length,\n          };\n        }\n        const field = definition.fields.find((item) => item.id === fieldId);\n        const values = entries.map((entry) => strictAdminNumericValue(entry.values[fieldId])).filter((value) => Number.isFinite(value));\n        if (!field || !values.length) return null;'''
)

# 5) Notes: make the native iOS keyboard bridge actually focusable during the touch gesture.
notes_editor = 'src/routes/notes-editor.tsx'
replace_once(
    notes_editor,
    '''          <textarea\n            ref={keyboardBridgeRef}\n            aria-hidden="true"\n            tabIndex={-1}\n            className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0 text-base"\n          />''',
    '''          <textarea\n            ref={keyboardBridgeRef}\n            tabIndex={0}\n            inputMode="text"\n            autoCapitalize="sentences"\n            className="fixed left-0 top-0 h-px w-px opacity-0 text-base"\n            aria-label={t("Note keyboard input")}\n          />'''
)
replace_once(
    notes_editor,
    '''    bridge.focus({ preventScroll: true });\n    window.requestAnimationFrame(() => {\n      editor.focus({ preventScroll: true });''',
    '''    bridge.focus({ preventScroll: true });\n    editor.focus({ preventScroll: true });\n    window.requestAnimationFrame(() => {\n      editor.focus({ preventScroll: true });'''
)

# 6) Profile: remove only the standalone "Your health hub" hero tile, not any hub settings/statistics rows.
profile = 'src/routes/profile.tsx'
replace_once(
    profile,
    '''        <section className="overflow-hidden rounded-3xl bg-primary/10 p-5 ring-1 ring-primary/20">\n          <div className="flex items-center gap-4">\n            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-surface ring-1 ring-border/60">\n              <ProfileIcon size={38} />\n            </span>\n\n            <div className="min-w-0">\n              <p className="font-serif text-2xl font-bold text-foreground">{t("Your health hub")}</p>\n              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">\n                {t("Your health profile, journey, milestones and app preferences.")}\n              </p>\n            </div>\n          </div>\n        </section>\n\n''',
    ''
)

print('Applied requested UI fixes successfully.')
