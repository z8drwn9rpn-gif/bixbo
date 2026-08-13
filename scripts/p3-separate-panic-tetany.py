from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()

# 1) Expose Panic and Tetany as first-class Log categories.
old = '''  { id: "pain", label: "Pain", emoji: "🔥", hint: "0–10, body, quality" },\n  { id: "period", label: "Blueberry", emoji: "🫐", hint: "Flow · discharge · notes" },'''
new = '''  { id: "pain", label: "Pain", emoji: "🔥", hint: "0–10, body, quality" },\n  { id: "tetany", label: "Tetany episode", emoji: "⭐", hint: "Type · location · intensity" },\n  { id: "panic", label: "Panic attack", emoji: "✨", hint: "Intensity · symptoms · trigger" },\n  { id: "period", label: "Blueberry", emoji: "🫐", hint: "Flow · discharge · notes" },'''
if old not in s:
    raise SystemExit('category anchor missing')
s = s.replace(old, new, 1)

# 2) Put Pain quick-save at the top of step 1 so it is visible without scrolling.
old_quick = '''          {!initialEntry && !quickSymptomUpdate ? (\n            <div className="w-full px-2">\n              <QuickSaveAction label="Save pain now — add details later" onSave={save} />\n            </div>\n          ) : null}\n'''
if s.count(old_quick) != 1:
    raise SystemExit(f'expected one pain quick-save block, found {s.count(old_quick)}')
s = s.replace(old_quick, '', 1)

score_open = '''      {activePainStepId === "score" && (\n        <div className="flex flex-col items-center gap-4 py-6">\n'''
score_new = '''      {activePainStepId === "score" && (\n        <div className="flex flex-col items-center gap-4 py-6">\n          {!initialEntry && !quickSymptomUpdate ? (\n            <div className="sticky top-0 z-20 w-full px-2 pb-1 bg-background/95 backdrop-blur">\n              <QuickSaveAction label="Save pain now — add details later" onSave={save} />\n            </div>\n          ) : null}\n'''
if score_open not in s:
    raise SystemExit('pain score opener missing')
s = s.replace(score_open, score_new, 1)

# 3) Remove embedded Panic/Tetany controls from Pain's details step visually.
# Keep their state declarations/backward-compatible save code untouched for now;
# defaults are false, so hidden controls cannot create duplicate episodes.
tetany_start = '''          <Field label="Tetany episode?">\n'''
if s.count(tetany_start) != 1:
    raise SystemExit(f'expected one embedded tetany field, found {s.count(tetany_start)}')
s = s.replace(tetany_start, '''          <div className="hidden" aria-hidden="true">\n          <Field label="Tetany episode?">\n''', 1)

panic_tail = '''              <Field label="Note (optional)">\n                <Textarea rows={2} value={panicNote} onChange={(e) => setPanicNote(e.target.value)} />\n              </Field>\n            </div>\n          )}\n        </div>\n      )}'''
panic_tail_new = '''              <Field label="Note (optional)">\n                <Textarea rows={2} value={panicNote} onChange={(e) => setPanicNote(e.target.value)} />\n              </Field>\n            </div>\n          )}\n          </div>\n        </div>\n      )}'''
if s.count(panic_tail) != 1:
    raise SystemExit(f'embedded panic tail anchor mismatch: {s.count(panic_tail)}')
s = s.replace(panic_tail, panic_tail_new, 1)

p.write_text(s)
