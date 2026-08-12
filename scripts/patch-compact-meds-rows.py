from pathlib import Path
p=Path('src/components/LogSheet.tsx')
s=p.read_text()
repls={
'flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border':'flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 ring-1 ring-border',
'className="h-4 w-4"':'className="h-3.5 w-3.5 shrink-0"',
'className="flex-1">\n                    <p className="text-sm font-medium">{m.name}</p>':'className="min-w-0 flex-1">\n                    <p className="text-xs font-medium leading-tight">{m.name}</p>',
'className="text-xs text-muted-foreground">{t("As needed")':'className="text-[10px] leading-tight text-muted-foreground">{t("As needed")',
'className="h-8 w-24"':'className="h-7 w-20 px-2 text-xs"',
'className="h-8 min-w-0 flex-[0_1_150px]"':'className="h-7 min-w-0 flex-[0_1_125px] px-2 text-xs"',
'className="flex-1">\n                        <p className="text-sm font-medium">':'className="min-w-0 flex-1">\n                        <p className="text-xs font-medium leading-tight">',
'<span className="text-xs text-muted-foreground">· scheduled {scheduledTime}</span>':'<span className="text-[10px] font-normal text-muted-foreground">· scheduled {scheduledTime}</span>',
'{m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}':'{m.dose && <p className="text-[10px] leading-tight text-muted-foreground">{m.dose}</p>}',
}
for a,b in repls.items():
    s=s.replace(a,b)
p.write_text(s)
