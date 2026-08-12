from pathlib import Path
p=Path('src/routes/index.tsx')
s=p.read_text()
s=s.replace('  ClockIcon,\n  FlameIcon,', '  BlueberryIcon,\n  ClockIcon,\n  FlameIcon,', 1)
old='''        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">\n          <Ico e="💊" size={20} />\n        </span>'''
new='''        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">\n          <BlueberryIcon size={20} />\n        </span>'''
if old not in s:
    raise SystemExit('Birth control pill icon block not found')
s=s.replace(old,new,1)
p.write_text(s)
