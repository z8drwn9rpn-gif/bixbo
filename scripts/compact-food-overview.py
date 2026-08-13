from pathlib import Path
p=Path('src/components/home/DayOverview.tsx')
s=p.read_text()
start=s.index('      {log?.food?.length ? (')
end=s.index('      {log?.bowel?.length ? (', start)
block=s[start:end]
block=block.replace('<ul className="space-y-3">','<ul className="space-y-2">',1)
block=block.replace('${index ? "border-t border-border/60 pt-3" : ""}','${index ? "border-t border-border/60 pt-2" : ""}',1)
block=block.replace('<div className="my-2 border-t border-border/60" />','<div className="my-1.5 border-t border-border/60" />',1)
block=block.replace('className="mt-2 text-xs leading-relaxed text-muted-foreground"','className="mt-1 text-xs leading-snug text-muted-foreground"')
block=block.replace('className="mt-2 text-xs leading-relaxed text-destructive"','className="mt-1 text-xs leading-snug text-destructive"')
block=block.replace('className="mt-2 whitespace-pre-line text-sm"','className="mt-1 whitespace-pre-line text-xs leading-snug"')
block=block.replace('className="mt-1 text-[10px] text-primary"','className="mt-0.5 text-[10px] text-primary"')
s=s[:start]+block+s[end:]
p.write_text(s)
