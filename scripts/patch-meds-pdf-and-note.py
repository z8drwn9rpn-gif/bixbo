from pathlib import Path

# 1) Remove duplicate Home meds note rendering.
p = Path('src/routes/index.tsx')
s = p.read_text()
s = s.replace('''              const medNote = data.medLogNotes?.[date]?.[x.key];\n              const shifted = actual && actual !== x.time;''','''              const shifted = actual && actual !== x.time;''',1)
s = s.replace('''                    {medNote ? (\n                      <span className="mt-0.5 block text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {medNote}</span>\n                    ) : null}\n''','',1)
p.write_text(s)

# 2) Make PDF adherence and detailed timeline respect granular grouped-med selections.
p = Path('src/components/HealthReportPageV3.tsx')
s = p.read_text()
s = s.replace('''import { BRISTOL, EMPTY, useBixbo, type DayLog, type Med } from "@/lib/storage";''','''import { BRISTOL, EMPTY, medScheduleItems, useBixbo, type DayLog, type Med } from "@/lib/storage";''',1)
s = s.replace('''type MedLog = Record<string, Record<string, boolean>>;''','''type MedLog = Record<string, Record<string, boolean>>;\ntype MedLogItems = Record<string, Record<string, string[]>>;''',1)
old = '''function doseSummary(m:Med,days:RDay[],medLog:MedLog,now:Date) {\n  let expected=0,taken=0;\n  days.forEach(d=>(m.times??[]).forEach(time=>{const key=`${m.id}@${time}`,isTaken=!!medLog[d.key]?.[key];if(!isDoseEligibleNow(d.key,time,isTaken,now))return;expected++;if(isTaken)taken++;}));\n  return expected?{taken,expected,pct:pct(taken,expected)}:null;\n}\nfunction takenText(d:RDay,meds:Med[],medLog:MedLog) {\n  const out:string[]=[];meds.filter(m=>!m.asNeeded).forEach(m=>{const takenTimes=(m.times??[]).filter(time=>medLog[d.key]?.[`${m.id}@${time}`]===true);if(takenTimes.length)out.push(`${m.name}${takenTimes.length>1?` ${takenTimes.length}x`:""}`);});return out.join(", ")||"—";\n}'''
new = '''function doseSummary(m:Med,days:RDay[],medLog:MedLog,medLogItems:MedLogItems,now:Date) {\n  let expected=0,taken=0;\n  const scheduledItems=medScheduleItems(m);\n  days.forEach(d=>(m.times??[]).forEach(time=>{\n    const key=`${m.id}@${time}`,isTaken=!!medLog[d.key]?.[key];\n    if(!isDoseEligibleNow(d.key,time,isTaken,now))return;\n    expected+=scheduledItems.length;\n    const selected=medLogItems[d.key]?.[key]??(isTaken?scheduledItems:[]);\n    const validSelected=new Set(selected.filter(item=>scheduledItems.includes(item)));\n    taken+=validSelected.size;\n  }));\n  return expected?{taken,expected,pct:pct(taken,expected)}:null;\n}\nfunction takenText(d:RDay,meds:Med[],medLog:MedLog,medLogItems:MedLogItems) {\n  const counts=new Map<string,number>();\n  meds.filter(m=>!m.asNeeded).forEach(m=>(m.times??[]).forEach(time=>{\n    const key=`${m.id}@${time}`;\n    if(medLog[d.key]?.[key]!==true)return;\n    const all=medScheduleItems(m);\n    const selected=medLogItems[d.key]?.[key]??all;\n    selected.filter(item=>all.includes(item)).forEach(item=>counts.set(item,(counts.get(item)??0)+1));\n  }));\n  return [...counts].map(([name,count])=>`${name}${count>1?` ${count}x`:""}`).join(", ")||"—";\n}'''
if old not in s:
    raise SystemExit('doseSummary/takenText block not found')
s=s.replace(old,new,1)
s=s.replace('''function packTimeline(rows:RDay[],meds:Med[],medLog:MedLog){const pages:RDay[][]=[];let page:RDay[]=[];let budget=0;for(const d of rows){const text=[facts(d).join(" "),takenText(d,meds,medLog),extraText(d),tensText(d),contextText(d)].join(" ");''','''function packTimeline(rows:RDay[],meds:Med[],medLog:MedLog,medLogItems:MedLogItems){const pages:RDay[][]=[];let page:RDay[]=[];let budget=0;for(const d of rows){const text=[facts(d).join(" "),takenText(d,meds,medLog,medLogItems),extraText(d),tensText(d),contextText(d)].join(" ");''',1)
s=s.replace('''function Report({days,meds,medLog,range,locale}:{days:RDay[];meds:Med[];medLog:MedLog;range:string;locale:string}) {''','''function Report({days,meds,medLog,medLogItems,range,locale}:{days:RDay[];meds:Med[];medLog:MedLog;medLogItems:MedLogItems;range:string;locale:string}) {''',1)
s=s.replace('''detailPages=packTimeline([...logged].reverse(),meds,medLog),total=3+detailPages.length''','''detailPages=packTimeline([...logged].reverse(),meds,medLog,medLogItems),total=3+detailPages.length''',1)
s=s.replace('''const a=doseSummary(m,days,medLog,now);''','''const a=doseSummary(m,days,medLog,medLogItems,now);''')
s=s.replace('''<td>{takenText(d,meds,medLog)}</td>''','''<td>{takenText(d,meds,medLog,medLogItems)}</td>''')
s=s.replace('''report=<Report days={days} meds={view.meds} medLog={view.medLog} range={range} locale={locale}/>;''','''report=<Report days={days} meds={view.meds} medLog={view.medLog} medLogItems={view.medLogItems??{}} range={range} locale={locale}/>;''',1)
p.write_text(s)
