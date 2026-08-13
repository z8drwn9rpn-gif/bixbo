from pathlib import Path

p = Path('src/components/LogSheet.tsx')
s = p.read_text()
old = '''          <div className="grid w-fit max-w-full grid-cols-7 justify-center gap-1.5 px-2">\n            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (\n              <button\n                key={n}\n                type="button"\n                onClick={() => setScore(n)}\n                title={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}\n                aria-label={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}\n                className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${\n                  score === n ? "text-white ring-2 ring-foreground" : "text-foreground"\n                }`}'''
new = '''          <div className="grid w-fit max-w-full grid-cols-7 justify-center gap-2 px-1">\n            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (\n              <button\n                key={n}\n                type="button"\n                onClick={() => setScore(n)}\n                title={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}\n                aria-label={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}\n                className={`h-9 w-9 shrink-0 rounded-full text-xs font-semibold transition ${\n                  score === n ? "text-white ring-[3px] ring-foreground" : "text-foreground"\n                }`}'''
if old not in s:
    raise SystemExit('main pain ball block not found')
s = s.replace(old, new, 1)
p.write_text(s)
