from pathlib import Path
p=Path('src/routes/index.tsx')
s=p.read_text()
old='''                  {p.parts.length > 0 && <p className="text-xs leading-relaxed text-muted-foreground">{p.parts.map(t).join(", ")}</p>}\n                  <div className="my-2 border-t border-border/60" />\n                  {p.quality.length > 0 && ('''
new='''                  {p.parts.length > 0 && (\n                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">\n                      <span className="font-semibold text-foreground">{t("Body")}:</span>{" "}\n                      {p.parts.map(t).join(", ")}\n                    </p>\n                  )}\n                  <div className="my-2 border-t border-border/60" />\n                  {p.quality.length > 0 && ('''
if old not in s:
    raise SystemExit('Pain body target not found')
s=s.replace(old,new,1)
p.write_text(s)
