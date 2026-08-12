from pathlib import Path

p = Path('src/routes/report.tsx')
s = p.read_text()
old = 'className="pdf-print-preview fixed inset-0 z-[10050] overflow-y-auto bg-background px-3 pb-24 pt-[calc(env(safe-area-inset-top)+.75rem)]"'
new = 'className="pdf-print-preview fixed inset-0 z-[10050] overflow-y-auto bg-background px-3 pb-24 pt-[max(calc(env(safe-area-inset-top)+.75rem),4rem)]"'
if old not in s:
    raise SystemExit('PDF preview wrapper pattern not found')
s = s.replace(old, new, 1)
old2 = 'className="pdf-preview-toolbar sticky top-[env(safe-area-inset-top)] z-10 mx-auto mb-3 flex max-w-[820px] items-center gap-2 rounded-2xl bg-background/95 p-2 shadow-lg ring-1 ring-border backdrop-blur"'
new2 = 'className="pdf-preview-toolbar sticky top-0 z-10 mx-auto mb-3 flex max-w-[820px] items-center gap-2 rounded-2xl bg-background/95 p-2 shadow-lg ring-1 ring-border backdrop-blur"'
if old2 not in s:
    raise SystemExit('PDF preview toolbar pattern not found')
s = s.replace(old2, new2, 1)
p.write_text(s)
print('Fixed iOS PWA PDF toolbar safe-area spacing')
