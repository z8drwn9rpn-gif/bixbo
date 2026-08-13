from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

# 1) Remove the obsolete hidden inline Tetany/Panic implementation from PainWizard.
start_marker = '          <div className="hidden" aria-hidden="true">\n          <Field label="Tetany episode?">'
end_marker = '          </div>\n        </div>\n      )}\n\n      {activePainStepId === "details" && ('
start = s.find(start_marker)
if start < 0:
    raise SystemExit('hidden inline Tetany/Panic block start not found')
end = s.find(end_marker, start)
if end < 0:
    raise SystemExit('hidden inline Tetany/Panic block end not found')
# Keep the symptoms-step closing wrappers, drop only the hidden legacy block.
s = s[:start] + '        </div>\n      )}\n\n      {activePainStepId === "details" && (' + s[end + len(end_marker):]

# 2) Remove obsolete PainWizard-only state for the hidden Tetany/Panic implementation.
state_start = '  // Extended\n  const [tetany, setTetany] = useState(false);'
state_end = '  const [bodyBattery, setBodyBattery] = useState<number | undefined>(initialEntry?.bodyBattery);'
a = s.find(state_start)
b = s.find(state_end, a)
if a < 0 or b < 0:
    raise SystemExit('legacy PainWizard Tetany/Panic state block not found')
s = s[:a] + state_end + s[b + len(state_end):]

# 3) The quick symptom shortcut no longer needs to reset dead inline episode state.
s = s.replace('    setTetany(false);\n    setPanic(false);\n\n', '', 1)

# 4) Remove obsolete save side effects that could create hidden Tetany/Panic entries from PainWizard.
save_start = '    if (tetany) {\n      const t: TetanyEpisode = {'
save_end = '    schema?.saveAdminCustomFields();'
a = s.find(save_start)
b = s.find(save_end, a)
if a < 0 or b < 0:
    raise SystemExit('legacy PainWizard Tetany/Panic save block not found')
s = s[:a] + save_end + s[b + len(save_end):]

# 5) Add an optional note directly to Add symptoms so a quick follow-up can include context
# without forcing the user into the full Pain wizard.
footer_marker = '      {quickSymptomUpdate && activePainStepId === "symptoms" && (\n        <SheetFooter'
note_block = '''      {quickSymptomUpdate && activePainStepId === "symptoms" && (\n        <div className="mt-1 rounded-2xl border border-border/70 bg-surface/70 p-3">\n          <Field label="Note (optional)">\n            <Textarea\n              rows={3}\n              value={note}\n              onChange={(e) => setNote(e.target.value)}\n              placeholder={t("Add a note about what changed, what you were doing, or anything else…")}\n            />\n          </Field>\n        </div>\n      )}\n\n'''
if footer_marker not in s:
    raise SystemExit('quick symptom footer marker not found')
s = s.replace(footer_marker, note_block + footer_marker, 1)

p.write_text(s)

# 6) Extend regression protection: quick symptom updates must keep notes, and the hidden
# PainWizard Tetany/Panic duplicate UI must stay removed.
t = Path('src/lib/__tests__/pain-symptom-update-regression.test.ts')
ts = t.read_text()
if 'quick Add symptoms keeps an optional note field' not in ts:
    ts += '''\n\nit("quick Add symptoms keeps an optional note field", () => {\n  const source = readFileSync(join(process.cwd(), "src/components/LogSheet.tsx"), "utf8");\n  expect(source).toContain('quickSymptomUpdate && activePainStepId === "symptoms"');\n  expect(source).toContain('placeholder={t("Add a note about what changed, what you were doing, or anything else…")}');\n  expect(source).toContain('note: note.trim()');\n});\n\nit("PainWizard no longer contains hidden duplicate Tetany/Panic forms", () => {\n  const source = readFileSync(join(process.cwd(), "src/components/LogSheet.tsx"), "utf8");\n  expect(source).not.toContain('<div className="hidden" aria-hidden="true">\\n          <Field label="Tetany episode?">');\n  expect(source).not.toContain('// Panic (full inline log — under Tetany)');\n});\n'''
    t.write_text(ts)
