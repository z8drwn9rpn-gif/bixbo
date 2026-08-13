from pathlib import Path
p=Path('src/components/LogSheet.tsx')
s=p.read_text()
old='''      {activePainStepId === "score" && (\n        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6">\n'''
new='''      {activePainStepId === "score" && (\n        <div className="flex flex-1 flex-col items-center gap-5 px-1 pb-6 pt-5">\n'''
if old not in s: raise SystemExit('score container not found')
s=s.replace(old,new,1)

anchor='''          )}\n\n          <div\n            className="grid h-32 w-32 place-items-center rounded-full text-5xl font-bold text-white"\n            style={{ background: bg }}\n          >\n            {Number.isInteger(score) ? score : score.toFixed(1)}\n          </div>\n'''
replace='''          )}\n\n          <div className="mt-1 text-center">\n            <h2 className="font-serif text-[22px] leading-tight text-foreground">{t("How intense is your pain right now?")}</h2>\n            <p className="mt-1.5 text-sm text-foreground/80">{t("Rate from 0 (no pain) to 10 (worst pain imaginable).")}</p>\n          </div>\n\n          <div\n            className="grid h-32 w-32 place-items-center rounded-full text-white shadow-sm"\n            style={{ background: bg }}\n          >\n            <div className="text-center">\n              <div className="text-5xl font-bold leading-none">{Number.isInteger(score) ? score : score.toFixed(1)}</div>\n              <div className="mt-2 text-sm font-semibold">{t(getScaleDesc(data, "pain")[Math.round(score)])}</div>\n            </div>\n          </div>\n'''
if anchor not in s: raise SystemExit('pain circle anchor not found')
s=s.replace(anchor,replace,1)

# Make label slightly stronger like the approved mockup.
s=s.replace('''<p className="text-center text-xs font-medium text-muted-foreground">{t("Pain scale")}</p>''','''<p className="text-center text-sm font-semibold text-foreground">{t("Pain scale")}</p>''',1)

# Keep slider and numbers visually grouped and centered.
s=s.replace('''          <div className="w-full px-4">\n            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />\n          </div>\n          <div className="flex flex-wrap justify-center gap-1.5 px-4">\n''','''          <div className="w-full max-w-md px-3">\n            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />\n          </div>\n          <div className="flex max-w-md flex-wrap justify-center gap-1.5 px-2">\n''',1)

# Add the approved guidance sentence under the scale, before the popup conditional.
needle='''          </div>\n          {painScaleInfoOpen ? (\n'''
insert='''          </div>\n          <div className="mt-1 flex max-w-[300px] items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 text-left text-xs leading-relaxed text-foreground/80">\n            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-base">💡</span>\n            <span>{t("Use this scale to track your pain and see patterns over time.")}</span>\n          </div>\n          {painScaleInfoOpen ? (\n'''
# Replace only first occurrence after the main pain scale numeric row; nearest by searching from active score block.
pos=s.find('{activePainStepId === "score"')
idx=s.find(needle,pos)
if idx<0: raise SystemExit('popup insertion point not found')
s=s[:idx]+s[idx:].replace(needle,insert,1)

p.write_text(s)
