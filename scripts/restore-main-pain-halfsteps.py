from pathlib import Path
p=Path('src/components/LogSheet.tsx')
s=p.read_text()
s=s.replace('  const [score, setScore] = useState(initialEntry?.score ?? 1);','  const [score, setScore] = useState(initialEntry?.score ?? 0);',1)
old='''          <div className="flex w-full flex-nowrap items-center justify-center gap-0.5 px-0">\n            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (\n              <button\n                key={n}\n                type="button"\n                onClick={() => setScore(n)}\n                title={`${n} — ${t(getScaleDesc(data, "pain")[n])}`}\n                aria-label={`${n} — ${t(getScaleDesc(data, "pain")[n])}`}\n                className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${\n                  score === n ? "text-white ring-2 ring-foreground" : "text-foreground"\n                }`}\n                style={{ background: painColor(n) }}\n              >\n                {n}\n              </button>\n            ))}\n          </div>\n'''
new='''          <div className="w-full px-4">\n            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />\n          </div>\n          <div className="flex flex-wrap justify-center gap-1.5 px-4">\n            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (\n              <button\n                key={n}\n                type="button"\n                onClick={() => setScore(n)}\n                title={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}\n                aria-label={`${n} — ${t(getScaleDesc(data, "pain")[Math.round(n)])}`}\n                className={`h-7 w-7 shrink-0 rounded-full text-[10px] font-semibold transition ${\n                  score === n ? "text-white ring-2 ring-foreground" : "text-foreground"\n                }`}\n                style={{ background: painColor(n) }}\n              >\n                {Number.isInteger(n) ? n : n.toFixed(1)}\n              </button>\n            ))}\n          </div>\n'''
if old not in s: raise SystemExit('main pain integer row not found')
s=s.replace(old,new,1)
# restore Slider import only for main pain scale
anchor='import { Input } from "@/components/ui/input";\n'
if 'components/ui/slider' not in s:
    s=s.replace(anchor,anchor+'import { Slider } from "@/components/ui/slider";\n',1)
# Pain info legend should include 0 again; other scales remain 1-based integers.
s=s.replace('''                max={10}\n                from={1}\n                descriptions={getScaleDesc(data, "pain")}\n                value={Math.round(score)}\n                title={t("Pain scale (Mankosky)")}\n''','''                max={10}\n                from={0}\n                descriptions={getScaleDesc(data, "pain")}\n                value={Math.round(score)}\n                title={t("Pain scale (Mankosky)")}\n''',1)
p.write_text(s)
