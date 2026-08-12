from pathlib import Path
p = Path('src/routes/index.tsx')
s = p.read_text()

# 1) Make the Meds today tile on Home open the Meds log for the currently selected day.
old = '''        <div className="col-span-2 lg:col-span-1">\n          <MedsProgress data={view} />\n        </div>'''
new = '''        <div className="col-span-2 lg:col-span-1">\n          <MedsProgress\n            data={view}\n            onClick={() => {\n              setQuickCat("meds");\n              setEditPain(undefined);\n              setEditEntry(undefined);\n              setLogOpen(true);\n            }}\n          />\n        </div>'''
if old not in s:
    raise SystemExit('MedsProgress call target not found')
s = s.replace(old, new, 1)

# 2) Convert MedsProgress from a passive div to a button.
old = '''function MedsProgress({ data }: { data: BixboData }) {\n  const { t } = useI18n();'''
new = '''function MedsProgress({ data, onClick }: { data: BixboData; onClick: () => void }) {\n  const { t } = useI18n();'''
if old not in s:
    raise SystemExit('MedsProgress signature target not found')
s = s.replace(old, new, 1)

old = '''  return (\n    <div className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-border">'''
new = '''  return (\n    <button\n      type="button"\n      onClick={onClick}\n      className="flex w-full items-center justify-between rounded-2xl bg-surface p-3 text-left ring-1 ring-border transition hover:bg-tint active:scale-[0.99]"\n      aria-label={t("Open meds log")}\n    >'''
if old not in s:
    raise SystemExit('MedsProgress opening tag target not found')
s = s.replace(old, new, 1)

# Replace only the closing tag of MedsProgress, anchored by the next section comment.
old = '''      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">\n        <PillIcon size={20} />\n      </div>\n    </div>\n  );\n}\n\n/* ------------------- Day preview ------------------- */'''
new = '''      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">\n        <PillIcon size={20} />\n      </div>\n    </button>\n  );\n}\n\n/* ------------------- Day preview ------------------- */'''
if old not in s:
    raise SystemExit('MedsProgress closing tag target not found')
s = s.replace(old, new, 1)

# 3) In DayPreview, never directly toggle an entire scheduled group from the overview.
# Opening Meds preserves the granular per-item selector and Note behavior.
old = '''                  <button\n                    onClick={() =>\n                      update((d) => {\n                        const day = { ...(d.medLog[date] ?? {}) };\n                        delete day[x.key];\n                        const times = { ...(d.medLogTimes?.[date] ?? {}) };\n                        delete times[x.key];\n                        const items = { ...(d.medLogItems?.[date] ?? {}) };\n                        delete items[x.key];\n                        return { ...d, medLog: { ...d.medLog, [date]: day }, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times }, medLogItems: { ...(d.medLogItems ?? {}), [date]: items } };\n                      })\n                    }\n                    className="text-left text-green-700 hover:underline"\n                    title={t("Tap to uncheck")}\n                  >'''
new = '''                  <button\n                    onClick={() => onEdit?.("meds", undefined)}\n                    className="text-left text-green-700 hover:underline"\n                    title={t("Tap to edit meds")}\n                  >'''
if old not in s:
    raise SystemExit('Taken meds DayPreview target not found')
s = s.replace(old, new, 1)

# Remove misleading direct-uncheck helper text in the rendered row.
s = s.replace('''                        <span className="text-[10px] text-muted-foreground"> · {t("tap to uncheck")}</span>''', '''                        <span className="text-[10px] text-primary"> · {t("Tap to edit")}</span>''', 1)

old = '''                <button\n                  onClick={() => markMissedTaken(x.key)}\n                  className="flex-1 text-left text-destructive/90"\n                  title={t("Tap to mark taken")}\n                >'''
new = '''                <button\n                  onClick={() => onEdit?.("meds", undefined)}\n                  className="flex-1 text-left text-destructive/90"\n                  title={t("Tap to edit meds")}\n                >'''
if old not in s:
    raise SystemExit('Missed meds DayPreview target not found')
s = s.replace(old, new, 1)

s = s.replace('''                  <span className="text-[10px] text-muted-foreground">· {t("missed (tap if taken)")}</span>''', '''                  <span className="text-[10px] text-primary">· {t("Tap to edit")}</span>''', 1)

# 4) Remove obsolete whole-dose quick toggle helper; overview must not bypass granular MedsForm.
start = s.find('''  const markMissedTaken = (medKey: string) =>\n''')
if start < 0:
    raise SystemExit('markMissedTaken helper not found')
end_marker = '''\n\n  return (\n    <div className="space-y-3 px-5 pt-3 pb-32">'''
end = s.find(end_marker, start)
if end < 0:
    raise SystemExit('markMissedTaken helper end not found')
s = s[:start] + end_marker + s[end + len(end_marker):]

p.write_text(s)
