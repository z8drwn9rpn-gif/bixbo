from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


month_path = Path("src/components/MonthCalendar.tsx")
month = month_path.read_text()
month = replace_once(
    month,
    'import { toKey, periodLabel, isDateInRange, predictPeriods, avgDayPain, isIntercourseKind, isCycleTrackingHidden, type BixboData, type DayLog, type EventEntry, type PeriodLevel } from "@/lib/storage";',
    'import { toKey, todayKey, periodLabel, isDateInRange, predictPeriods, avgDayPain, isIntercourseKind, isCycleTrackingHidden, type BixboData, type DayLog, type EventEntry, type PeriodLevel } from "@/lib/storage";',
    "MonthCalendar storage import",
)
month = replace_once(
    month,
    'new Map<string,{periodColor:string|null;pAvg:number|null;predictedPeriod:boolean;icons:string[]}>()',
    'new Map<string,{periodColor:string|null;periodLevel:PeriodLevel|null;pAvg:number|null;predictedPeriod:boolean;icons:string[]}>()',
    "calendar meta type",
)
month = replace_once(
    month,
    'const log=data.dayLogs[cell.key],periodLevel=cycleTrackingHidden?undefined:(log?.periodInfo?.level??log?.period);let actual:string|null=null;',
    'const log=data.dayLogs[cell.key],periodLevel=cycleTrackingHidden?undefined:(log?.periodInfo?.level??log?.period);let actual:string|null=null;let effectivePeriodLevel:PeriodLevel|null=periodLevel??null;',
    "effective period level",
)
month = replace_once(
    month,
    'if(!cycleTrackingHidden&&data.cycle.lastPeriodStart&&data.cycle.lastPeriodEnd&&isDateInRange(cell.key,data.cycle.lastPeriodStart,data.cycle.lastPeriodEnd))actual="var(--period-medium)";',
    'if(!cycleTrackingHidden&&data.cycle.lastPeriodStart&&data.cycle.lastPeriodEnd&&isDateInRange(cell.key,data.cycle.lastPeriodStart,data.cycle.lastPeriodEnd)){actual="var(--period-medium)";if(!effectivePeriodLevel)effectivePeriodLevel="medium";}',
    "actual period metadata",
)
month = replace_once(
    month,
    'meta.set(cell.key,{periodColor:cycleTrackingHidden?null:(periodColorVar(periodLevel)??actual),pAvg:',
    'meta.set(cell.key,{periodColor:cycleTrackingHidden?null:(periodColorVar(periodLevel)??actual),periodLevel:cycleTrackingHidden?null:effectivePeriodLevel,pAvg:',
    "calendar meta value",
)
month = replace_once(
    month,
    'return <div className="px-1 landscape:px-2 lg:px-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>',
    'return <div className="bixbo-calendar px-1 landscape:px-2 lg:px-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>',
    "calendar root hook",
)
month = replace_once(
    month,
    'const meta=cellMeta.get(key),periodColor=meta?.periodColor??null,pAvg=meta?.pAvg??null,isSel=key===selected,predictedPeriod=meta?.predictedPeriod??false,icons=meta?.icons??[],ringColor=pAvg!=null?calendarPainColor(pAvg):null,showPredictionRing=predictedPeriod&&pAvg==null&&!periodColor;',
    'const meta=cellMeta.get(key),periodColor=meta?.periodColor??null,periodLevel=meta?.periodLevel??null,pAvg=meta?.pAvg??null,isSel=key===selected,isToday=key===todayKey(),predictedPeriod=meta?.predictedPeriod??false,icons=meta?.icons??[],ringColor=pAvg!=null?calendarPainColor(pAvg):null,showPredictionRing=predictedPeriod&&pAvg==null&&!periodColor;',
    "calendar day semantic state",
)
month = replace_once(
    month,
    'return <button key={ci} aria-pressed={isSel} data-bixbo-selected={isSel?"true":undefined}',
    'return <button key={ci} aria-pressed={isSel} aria-current={isToday?"date":undefined} data-bixbo-calendar-day data-bixbo-selected={isSel?"true":undefined} data-bixbo-today={isToday?"true":undefined}',
    "calendar day attributes",
)
month = replace_once(
    month,
    'className={`flex select-none flex-col items-stretch rounded-xl text-left transition ${inMonth?"":"opacity-30"}`}>',
    'className={`bixbo-calendar-day flex select-none flex-col items-stretch rounded-xl text-left transition ${inMonth?"":"opacity-30"}`}>',
    "calendar day class",
)
month = replace_once(
    month,
    '<div className="flex min-h-[62px] flex-col items-center justify-start pt-1 landscape:min-h-[44px] landscape:pt-0 lg:min-h-[84px] lg:pt-2 xl:min-h-[90px]">',
    '<div className="bixbo-calendar-day-layout flex min-h-[62px] flex-col items-center justify-start pt-1 landscape:min-h-[44px] landscape:pt-0 lg:min-h-[84px] lg:pt-2 xl:min-h-[90px]">',
    "calendar day layout class",
)
month = replace_once(
    month,
    '<div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full lg:h-[52px] lg:w-[52px] xl:h-[56px] xl:w-[56px]">',
    '<div className="bixbo-calendar-day-disc relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full lg:h-[52px] lg:w-[52px] xl:h-[56px] xl:w-[56px]">',
    "calendar disc class",
)
selected_pattern = re.compile(r'\{isSel\?<span aria-hidden className="pointer-events-none absolute -inset-\[5px\] rounded-full lg:-inset-\[6px\]" style=\{\{zIndex:6,background:"transparent",border:"2px solid #6E7C45",boxShadow:"0 0 0 2px rgba\(255,255,255,.88\), 0 3px 8px rgba\(64,74,43,.22\)"\}\}/>:null\}\n\n')
month, selected_count = selected_pattern.subn('', month, count=1)
if selected_count != 1:
    raise SystemExit(f"selected legacy ring: expected 1 match, found {selected_count}")
ring_old = 'className="pointer-events-none absolute inset-0 rounded-full"'
ring_count = month.count(ring_old)
if ring_count != 2:
    raise SystemExit(f"calendar outer rings: expected 2 matches, found {ring_count}")
month = month.replace(ring_old, 'className="bixbo-calendar-ring pointer-events-none absolute inset-0 rounded-full"')
month = replace_once(
    month,
    'className="pointer-events-none absolute left-[6px] right-[9px] top-[2px] z-[3] h-[4px] rounded-full bg-white/72 blur-[0.15px] lg:left-[9px] lg:right-[13px] lg:top-[3px] lg:h-[5px]"',
    'className="bixbo-calendar-ring-highlight pointer-events-none absolute left-[6px] right-[9px] top-[2px] z-[3] h-[4px] rounded-full bg-white/72 blur-[0.15px] lg:left-[9px] lg:right-[13px] lg:top-[3px] lg:h-[5px]"',
    "pain ring highlight hook",
)
month = replace_once(
    month,
    'className="pointer-events-none absolute bottom-[2px] left-[8px] right-[6px] z-[3] h-[3px] rounded-full bg-black/10 blur-[1px] lg:bottom-[3px] lg:left-[11px] lg:right-[9px]"',
    'className="bixbo-calendar-ring-shadow pointer-events-none absolute bottom-[2px] left-[8px] right-[6px] z-[3] h-[3px] rounded-full bg-black/10 blur-[1px] lg:bottom-[3px] lg:left-[11px] lg:right-[9px]"',
    "pain ring shadow hook",
)
month = replace_once(
    month,
    'className="pointer-events-none absolute left-[7px] right-[10px] top-[3px] z-[3] h-[4px] rounded-full bg-white/60 lg:left-[10px] lg:right-[14px] lg:top-[4px] lg:h-[5px]"',
    'className="bixbo-calendar-ring-highlight pointer-events-none absolute left-[7px] right-[10px] top-[3px] z-[3] h-[4px] rounded-full bg-white/60 lg:left-[10px] lg:right-[14px] lg:top-[4px] lg:h-[5px]"',
    "prediction ring highlight hook",
)
month = replace_once(
    month,
    '<div className={`relative z-[4] flex items-center justify-center rounded-full ${ringColor||showPredictionRing?"h-6 w-6 lg:h-[36px] lg:w-[36px] xl:h-[39px] xl:w-[39px]":"h-7 w-7 lg:h-10 lg:w-10 xl:h-11 xl:w-11"}`} style={{',
    '<div data-bixbo-period-level={periodLevel??undefined} data-bixbo-ringed={ringColor||showPredictionRing?"true":undefined} className={`bixbo-calendar-date-face relative z-[4] flex items-center justify-center rounded-full ${ringColor||showPredictionRing?"h-6 w-6 lg:h-[36px] lg:w-[36px] xl:h-[39px] xl:w-[39px]":"h-7 w-7 lg:h-10 lg:w-10 xl:h-11 xl:w-11"}`} style={{',
    "calendar date face hook",
)
month = replace_once(
    month,
    '<span aria-hidden className={`pointer-events-none absolute left-[4px] right-[6px] top-[2px] h-[2.5px] rounded-full ${periodColor?"bg-white/48":"bg-white/92"} lg:left-[6px] lg:right-[9px] lg:top-[3px] lg:h-[3px]`}/>',
    '<span aria-hidden className={`bixbo-calendar-face-highlight pointer-events-none absolute left-[4px] right-[6px] top-[2px] h-[2.5px] rounded-full ${periodColor?"bg-white/48":"bg-white/92"} lg:left-[6px] lg:right-[9px] lg:top-[3px] lg:h-[3px]`}/>',
    "calendar face highlight hook",
)
month = replace_once(
    month,
    '<span className={`relative z-[1] text-sm leading-none lg:text-base xl:text-[17px] ${periodColor?"font-semibold text-white":"font-medium text-foreground"}`}',
    '<span className={`bixbo-calendar-date-number relative z-[1] text-sm leading-none lg:text-base xl:text-[17px] ${periodColor?"font-semibold text-white":"font-medium text-foreground"}`}',
    "calendar date number hook",
)
month = replace_once(
    month,
    '<div className="mt-0.5 flex h-4 items-center justify-center leading-none lg:mt-1 lg:h-5">{icons.includes("❤️")?',
    '<div className="bixbo-calendar-icons mt-0.5 flex h-4 items-center justify-center leading-none lg:mt-1 lg:h-5">{icons.includes("❤️")?',
    "calendar icons hook",
)
month_path.write_text(month)

home_path = Path("src/features/home/HomePage.tsx")
home = home_path.read_text()
home = replace_once(home, '  const calendarRef = useRef<HTMLDivElement | null>(null);\n', '', "calendar DOM ref")
home_pattern = re.compile(
    r'\n  useEffect\(\(\) => \{\n    const root = calendarRef\.current;.*?\n  \}, \[hydrated, monthAnchor, selected, view\.dayLogs\]\);\n',
    re.S,
)
home, home_count = home_pattern.subn('\n', home, count=1)
if home_count != 1:
    raise SystemExit(f"calendar today DOM effect: expected 1 match, found {home_count}")
home = replace_once(home, '<div ref={calendarRef} className="mt-1 ', '<div className="mt-1 ', "calendar ref attribute")
home_path.write_text(home)

root_path = Path("src/routes/__root.tsx")
root = root_path.read_text()
root = replace_once(
    root,
    'import calendar3dCss from "../calendar-3d.css?url";\nimport calendarPeriodFixCss from "../calendar-period-fix.css?url";',
    'import calendarSystemCss from "../calendar-system.css?url";',
    "calendar stylesheet imports",
)
root = replace_once(
    root,
    '      { rel: "stylesheet", href: calendar3dCss },\n      { rel: "stylesheet", href: calendarPeriodFixCss },',
    '      { rel: "stylesheet", href: calendarSystemCss },',
    "calendar stylesheet links",
)
root_path.write_text(root)

test_path = Path("src/lib/__tests__/ui-layout-architecture-regression.test.ts")
test = test_path.read_text()
insertion = '''

  it("keeps calendar visuals on semantic component hooks instead of DOM-shape patches", () => {
    const calendar = readFileSync("src/components/MonthCalendar.tsx", "utf8");
    const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
    const css = readFileSync("src/calendar-system.css", "utf8");
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(calendar).toContain("data-bixbo-calendar-day");
    expect(calendar).toContain("bixbo-calendar-day-disc");
    expect(calendar).toContain("data-bixbo-period-level");
    expect(calendar).toContain('data-bixbo-today={isToday?"true":undefined}');
    expect(home).not.toContain("calendarRef");
    expect(home).not.toContain('querySelectorAll<HTMLButtonElement>("button.rounded-xl")');
    expect(css).not.toContain("nth-child");
    expect(css).not.toContain('[style*=');
    expect(css).not.toContain("> div > div");
    expect(root).toContain('import calendarSystemCss from "../calendar-system.css?url";');
    expect(root).not.toContain("calendar-3d.css");
    expect(root).not.toContain("calendar-period-fix.css");
  });
'''
close_index = test.rfind('\n});')
if close_index == -1:
    raise SystemExit("test describe close not found")
test = test[:close_index] + insertion + test[close_index:]
test_path.write_text(test)

calendar_css = '''/* BIXBO calendar visual system.
   MonthCalendar owns semantic state through explicit class/data hooks.
   This stylesheet is intentionally independent of DOM child order and inline
   style substring matching so calendar markup can evolve without silent visual regressions. */

.bixbo-calendar .bixbo-calendar-day-disc {
  isolation: isolate;
  overflow: visible;
  width: 46px !important;
  height: 46px !important;
  border-radius: 999px;
  background: transparent !important;
}

.bixbo-calendar .bixbo-calendar-day-layout {
  min-height: 72px !important;
}

.bixbo-calendar .bixbo-calendar-ring {
  overflow: hidden;
  transform: translateZ(0);
  border-width: 1px !important;
  filter: saturate(1.34) contrast(1.08) !important;
  box-shadow:
    inset 0 -3px 3px rgba(35,30,18,.24),
    inset 1px 0 1px rgba(35,30,18,.08),
    0 2px 2px rgba(57,50,32,.22),
    0 5px 6px rgba(52,48,31,.23),
    0 8px 10px rgba(52,48,31,.11) !important;
}

.bixbo-calendar .bixbo-calendar-ring-highlight {
  display: none !important;
}

.bixbo-calendar .bixbo-calendar-date-face {
  width: 38px !important;
  height: 38px !important;
  overflow: hidden;
  border: 1px solid rgba(126,111,82,.13) !important;
  background: linear-gradient(150deg,#fffefa 0%,#fbf8f0 48%,#eee8dc 76%,#e1d9c9 100%) !important;
  box-shadow:
    inset 0 -2px 3px rgba(121,105,75,.17),
    0 1px 1px rgba(77,67,46,.13),
    0 3px 4px rgba(68,59,40,.16),
    0 5px 7px rgba(68,59,40,.08) !important;
}

.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-ringed="true"] {
  width: 32px !important;
  height: 32px !important;
  border: 0 !important;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.72),
    inset 0 -2px 3px rgba(121,105,75,.15),
    0 2px 2px rgba(72,60,37,.15) !important;
}

.bixbo-calendar .bixbo-calendar-date-face::before,
.bixbo-calendar .bixbo-calendar-date-face::after {
  content: none !important;
  display: none !important;
}

.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level] {
  width: 42px !important;
  height: 42px !important;
  border: 1px solid rgba(42,32,58,.18) !important;
  filter: none !important;
  box-shadow:
    inset 0 -4px 5px rgba(20,14,33,.24),
    inset 2px 0 2px rgba(36,26,48,.10),
    0 2px 2px rgba(42,33,55,.20),
    0 5px 7px rgba(42,33,55,.14) !important;
}

.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="spotting"] { background: var(--period-spotting) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="light"] { background: var(--period-light) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="medium"] { background: var(--period-medium) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="heavy"] { background: var(--period-heavy) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="very-heavy"] { background: var(--period-veryheavy) !important; }

.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-ringed="true"][data-bixbo-period-level] {
  width: 28px !important;
  height: 28px !important;
  border: 0 !important;
  box-shadow:
    0 0 0 2px rgba(255,255,255,.94),
    inset 0 -3px 4px rgba(20,14,33,.24),
    0 2px 2px rgba(42,33,55,.18) !important;
}

.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level] .bixbo-calendar-date-number {
  position: relative;
  z-index: 2;
  font-weight: 800 !important;
  text-shadow: 0 1px 1px rgba(20,14,33,.18) !important;
}
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="spotting"] .bixbo-calendar-date-number { color: var(--period-spotting-fg) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="light"] .bixbo-calendar-date-number { color: var(--period-light-fg) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="medium"] .bixbo-calendar-date-number { color: var(--period-medium-fg) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="heavy"] .bixbo-calendar-date-number { color: var(--period-heavy-fg) !important; }
.bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level="very-heavy"] .bixbo-calendar-date-number { color: var(--period-veryheavy-fg) !important; }

.bixbo-calendar .bixbo-calendar-day[data-bixbo-today="true"] .bixbo-calendar-day-disc::after {
  content: "" !important;
  display: block !important;
  position: absolute;
  pointer-events: none;
  inset: -4px;
  z-index: 6;
  border-radius: 999px;
  border: 1.5px solid color-mix(in srgb, var(--primary) 74%, #7c8757 26%);
  box-shadow: 0 0 0 2px rgba(255,255,255,.72),0 3px 7px rgba(72,82,48,.18);
}

.bixbo-calendar .bixbo-calendar-day[data-bixbo-selected="true"] .bixbo-calendar-day-disc::before {
  content: "" !important;
  display: block !important;
  position: absolute;
  pointer-events: none;
  inset: -8px;
  z-index: 0;
  border-radius: 999px;
  border: 1px solid rgba(126,139,89,.14);
  background: radial-gradient(circle at 48% 44%,rgba(238,241,226,.82) 0%,rgba(226,232,207,.72) 58%,rgba(211,220,184,.48) 78%,rgba(211,220,184,.16) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.72),0 2px 5px rgba(90,101,60,.11),0 5px 10px rgba(78,89,52,.08);
}

.bixbo-calendar .bixbo-calendar-date-face:not([data-bixbo-period-level]) .bixbo-calendar-date-number {
  position: relative;
  z-index: 2;
  text-shadow: 0 1px 0 rgba(255,255,255,.55);
}

.bixbo-calendar .bixbo-calendar-day:active .bixbo-calendar-day-disc { transform: translateY(1px) scale(.98); }
.bixbo-calendar .bixbo-calendar-icons svg { filter: saturate(1.10) drop-shadow(0 2px 1.5px rgba(99,48,59,.27)); }

@media (min-width: 1024px) {
  .bixbo-calendar .bixbo-calendar-day-disc { width: 54px !important; height: 54px !important; }
  .bixbo-calendar .bixbo-calendar-date-face { width: 44px !important; height: 44px !important; }
  .bixbo-calendar .bixbo-calendar-date-face[data-bixbo-ringed="true"] { width: 38px !important; height: 38px !important; }
  .bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level] { width: 48px !important; height: 48px !important; }
  .bixbo-calendar .bixbo-calendar-date-face[data-bixbo-ringed="true"][data-bixbo-period-level] { width: 34px !important; height: 34px !important; }
  .bixbo-calendar .bixbo-calendar-day[data-bixbo-today="true"] .bixbo-calendar-day-disc::after { inset: -5px; }
  .bixbo-calendar .bixbo-calendar-day[data-bixbo-selected="true"] .bixbo-calendar-day-disc::before { inset: -9px; }
}

.dark .bixbo-calendar .bixbo-calendar-ring {
  filter: saturate(1.18) contrast(1.05) !important;
  box-shadow: inset 0 -3px 3px rgba(0,0,0,.34),0 3px 3px rgba(0,0,0,.42),0 6px 7px rgba(0,0,0,.20) !important;
}

.dark .bixbo-calendar .bixbo-calendar-date-face:not([data-bixbo-period-level]) {
  background: linear-gradient(150deg,color-mix(in srgb, var(--background) 90%, #fff 10%),color-mix(in srgb, var(--background) 76%, #000 24%)) !important;
  border-color: rgba(255,255,255,.07) !important;
  box-shadow: inset 0 -2px 3px rgba(0,0,0,.32),0 3px 4px rgba(0,0,0,.28) !important;
}

.dark .bixbo-calendar .bixbo-calendar-day[data-bixbo-today="true"] .bixbo-calendar-day-disc::after {
  border-color: color-mix(in srgb, var(--primary) 72%, #d7dfbb 28%);
  box-shadow: 0 0 0 2px rgba(245,244,232,.18),0 3px 7px rgba(0,0,0,.28);
}

.dark .bixbo-calendar .bixbo-calendar-day[data-bixbo-selected="true"] .bixbo-calendar-day-disc::before {
  border-color: rgba(202,213,168,.18);
  background: radial-gradient(circle at 48% 44%,rgba(126,139,89,.24) 0%,rgba(109,123,74,.20) 62%,rgba(86,99,57,.13) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06),0 3px 8px rgba(0,0,0,.20);
}
'''
Path("src/calendar-system.css").write_text(calendar_css)
Path("src/calendar-3d.css").unlink()
Path("src/calendar-period-fix.css").unlink()
Path(".github/workflows/calendar-css-refactor.yml").unlink()
Path(".github/scripts/calendar_css_refactor.py").unlink()
