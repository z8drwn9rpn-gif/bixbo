from pathlib import Path

p = Path("src/components/MonthCalendar.tsx")
s = p.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f"Missing expected MonthCalendar fragment: {label}")
    s = s.replace(old, new, 1)


replace_once(
    'import { Ico } from "@/components/icons/BixboExtraIcons";',
    'import { Check, Ico } from "@/components/icons/BixboExtraIcons";',
    "Bixbo icon import",
)

replace_once(
    'const{t}=useI18n();const cycleTrackingHidden=isCycleTrackingHidden(data);const hidePredictions=cycleTrackingHidden;const[peek,setPeek]=useState<string|null>(null);const[eventsOpen,setEventsOpen]=useState(false);const longTimer=',
    'const{t}=useI18n();const cycleTrackingHidden=isCycleTrackingHidden(data);const hidePredictions=cycleTrackingHidden;const[peek,setPeek]=useState<string|null>(null);const[eventsOpen,setEventsOpen]=useState(false);const[eventsTab,setEventsTab]=useState<"events"|"tasks">("events");const longTimer=',
    "events tab state",
)

month_events = 'const monthEvents=useMemo(()=>data.events.filter(event=>event.startDate<=monthEnd&&event.endDate>=monthStart).slice().sort((a,b)=>a.startDate.localeCompare(b.startDate)||(a.time??"").localeCompare(b.time??"")||a.title.localeCompare(b.title)),[data.events,monthStart,monthEnd]);'
replace_once(
    month_events,
    month_events + '\nconst monthTasks=useMemo(()=>data.tasks.filter(task=>task.startDate<=monthEnd&&task.endDate>=monthStart).slice().sort((a,b)=>a.startDate.localeCompare(b.startDate)||(a.done===b.done?0:a.done?1:-1)||(a.time??"").localeCompare(b.time??"")||a.title.localeCompare(b.title)),[data.tasks,monthStart,monthEnd]);',
    "month tasks memo",
)

replace_once(
    '{monthEvents.length>0?<button type="button" onClick={()=>setEventsOpen(true)}',
    '{monthEvents.length>0||monthTasks.length>0?<button type="button" onClick={()=>{setEventsTab("events");setEventsOpen(true);}}',
    "calendar strip opener",
)

start_marker = '{eventsOpen&&typeof document!=="undefined"?createPortal('
end_marker = '\n{peek&&typeof document!=="undefined"?createPortal('
start = s.find(start_marker)
end = s.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Could not locate Calendar Events dialog block")

new_overlay = r'''{eventsOpen&&typeof document!=="undefined"?createPortal(
<div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 px-5 py-[max(16px,env(safe-area-inset-top))] backdrop-blur-[1px]" onClick={()=>setEventsOpen(false)}>
<section role="dialog" aria-modal="true" aria-label={eventsTab==="events"?t("Calendar events"):t("To do list")} className="flex max-h-[calc(100dvh-40px)] w-full max-w-[370px] flex-col overflow-hidden rounded-[30px] border border-border/70 bg-background shadow-[0_24px_70px_-30px_rgba(24,31,17,.55),0_6px_20px_-12px_rgba(24,31,17,.35)]" onClick={e=>e.stopPropagation()}>
<div className="shrink-0 px-5 pb-3 pt-5">
<div className="flex items-start justify-between gap-4">
<div className="min-w-0 flex-1">
<div className="inline-flex max-w-full items-center gap-1 rounded-[14px] border border-border/55 bg-tint/35 p-1" role="tablist" aria-label={t("Calendar and tasks")}>
<button type="button" role="tab" aria-selected={eventsTab==="events"} onClick={()=>setEventsTab("events")} className={`min-w-0 rounded-[10px] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${eventsTab==="events"?"bg-background text-foreground shadow-sm ring-1 ring-border/45":"text-muted-foreground"}`}>{t("Calendar events")}</button>
<button type="button" role="tab" aria-selected={eventsTab==="tasks"} onClick={()=>setEventsTab("tasks")} className={`min-w-0 rounded-[10px] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${eventsTab==="tasks"?"bg-background text-foreground shadow-sm ring-1 ring-border/45":"text-muted-foreground"}`}>{t("To do list")}</button>
</div>
<h3 className="mt-2 text-[21px] font-black tracking-[-0.035em] text-foreground">{monthLabel(month)}</h3>
<p className="mt-1 text-[11px] font-medium text-muted-foreground">{eventsTab==="events"?`${monthEvents.length} ${monthEvents.length===1?"event":"events"}`:`${monthTasks.length} ${monthTasks.length===1?"task":"tasks"}`}</p>
</div>
<button type="button" onClick={()=>setEventsOpen(false)} aria-label={t("Close")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/70 bg-tint/70 text-lg font-bold text-foreground">×</button>
</div>
</div>
<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(18px,env(safe-area-inset-bottom))] touch-pan-y">
{eventsTab==="events"?(monthEvents.length===0?
<div className="rounded-[20px] border border-border/55 bg-tint/30 px-4 py-5 text-center text-sm text-muted-foreground">{t("No calendar events")}</div>:
<div className="relative pb-1"><span aria-hidden className="absolute bottom-5 left-[7px] top-5 w-px bg-border/75"/>{monthEvents.map((event,index)=><div key={event.id} className={`relative grid grid-cols-[16px_minmax(0,1fr)_auto] gap-3 py-3 ${index?"border-t border-border/40":""}`}><span className="relative z-[1] mt-1.5 h-[15px] w-[15px] rounded-full border-[2px] border-background shadow-[0_0_0_1px_rgba(80,86,55,.16),inset_0_1px_0_rgba(255,255,255,.72),0_2px_3px_rgba(55,60,38,.18)]" style={{background:event.color??"#7C8F4D"}}/><span className="min-w-0"><span className="block break-words text-[13px] font-extrabold leading-[1.25] text-foreground">{event.title}</span><span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{eventRangeLabel(event)}</span>{event.note?<span className="mt-1.5 block break-words text-[11px] leading-snug text-muted-foreground">{event.note}</span>:null}</span><span className="max-w-[78px] text-right text-[11px] font-bold leading-tight text-foreground">{eventTimeLabel(event)}</span></div>)}</div>
):(monthTasks.length===0?
<div className="rounded-[20px] border border-border/55 bg-tint/30 px-4 py-5 text-center text-sm text-muted-foreground">{t("No tasks this month")}</div>:
<div className="relative pb-1"><span aria-hidden className="absolute bottom-5 left-[8px] top-5 w-px bg-border/75"/>{monthTasks.map((task,index)=><div key={task.id} className={`relative grid grid-cols-[18px_minmax(0,1fr)_auto] gap-3 py-3 ${index?"border-t border-border/40":""}`}><span className={`relative z-[1] mt-1 grid h-[17px] w-[17px] place-items-center rounded-full border shadow-[0_1px_2px_rgba(55,60,38,.12)] ${task.done?"border-primary bg-primary text-primary-foreground":"border-border bg-background text-transparent"}`}>{task.done?<Check className="h-3 w-3" strokeWidth={3}/>:null}</span><span className="min-w-0"><span className={`block break-words text-[13px] font-extrabold leading-[1.25] ${task.done?"text-muted-foreground line-through decoration-current/60":"text-foreground"}`}>{task.title}</span><span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{eventRangeLabel(task)}</span>{task.note?<span className={`mt-1.5 block break-words text-[11px] leading-snug text-muted-foreground ${task.done?"opacity-70":""}`}>{task.note}</span>:null}</span><span className={`max-w-[78px] text-right text-[11px] font-bold leading-tight ${task.done?"text-muted-foreground":"text-foreground"}`}>{task.time?eventTimeLabel(task):""}</span></div>)}</div>)}</div>
</section>
</div>,document.body):null}'''

s = s[:start] + new_overlay + s[end:]
p.write_text(s)

test = Path("src/lib/__tests__/calendar-event-todo-tabs-regression.test.ts")
test.write_text(r'''import { describe, expect, it } from "vitest";
import fs from "node:fs";

const calendar = fs.readFileSync("src/components/MonthCalendar.tsx", "utf8");

describe("calendar event / To Do tabs", () => {
  it("keeps Calendar Events as the default and exposes a To Do List tab", () => {
    expect(calendar).toContain('useState<"events"|"tasks">("events")');
    expect(calendar).toContain('role="tablist"');
    expect(calendar).toContain('t("Calendar events")');
    expect(calendar).toContain('t("To do list")');
  });

  it("uses the existing BIXBO tasks collection for the displayed month", () => {
    expect(calendar).toContain("data.tasks.filter(task=>task.startDate<=monthEnd&&task.endDate>=monthStart)");
    expect(calendar).toContain("monthTasks.map((task,index)");
    expect(calendar).toContain('t("No tasks this month")');
  });

  it("renders task completion with a BIXBO icon rather than a system emoji", () => {
    expect(calendar).toContain('import { Check, Ico } from "@/components/icons/BixboExtraIcons"');
    expect(calendar).toContain('<Check className="h-3 w-3"');
  });
});
''')

print("Patched MonthCalendar with Calendar Events / To Do List tabs")
