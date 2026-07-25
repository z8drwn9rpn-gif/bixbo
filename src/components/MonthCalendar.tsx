import { useRef } from "react";
import {
  toKey, hasAnyLog, painColor, isDateInRange, predictPeriods, avgDayPain,
  type BixboData, type DayLog,
} from "@/lib/storage";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function periodColorVar(level?: string) {
  switch (level) {
    case "spotting":  return "var(--period-spotting)";
    case "light":     return "var(--period-light)";
    case "medium":    return "var(--period-medium)";
    case "heavy":     return "var(--period-heavy)";
    case "veryheavy": return "var(--period-veryheavy)";
    default: return null;
  }
}
function iconsFor(log: DayLog | undefined, hasMed: boolean): string[] {
  const out: string[] = [];
  if (hasMed) out.push("💊");
  if (log?.bowel?.some((b) => b.bristol > 0)) out.push("💩");
  // ❤️ for any ŠukŠuk entry
  if (log?.sex?.length) out.push("❤️");
  if (log?.heat?.length) out.push("🔥");
  if (log?.workout?.length) out.push("🧘🏼‍♀️");
  if (log?.panic?.length) out.push("⚡");
  return out;
}

export function MonthCalendar({
  month, data, selected, onSelect, onSwipeMonth,
}: {
  month: Date;
  data: BixboData;
  selected: string;
  onSelect: (k: string) => void;
  onSwipeMonth?: (delta: -1 | 1) => void;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  // Week starts on Monday
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    if (dayNum < 1) cells.push({ date: new Date(y, m - 1, prevDays + dayNum), inMonth: false });
    else if (dayNum > daysInMonth) cells.push({ date: new Date(y, m + 1, dayNum - daysInMonth), inMonth: false });
    else cells.push({ date: new Date(y, m, dayNum), inMonth: true });
  }

  const predicted = predictPeriods(data.cycle, cells[0].date, cells[cells.length - 1].date);
  const isPredicted = (k: string) =>
    predicted.some((p) => isDateInRange(k, p.start, p.end)) &&
    !(data.dayLogs[k]?.period || data.dayLogs[k]?.periodInfo?.level);
  const isActualPeriod = (k: string) => {
    const c = data.cycle;
    if (!c.lastPeriodStart || !c.lastPeriodEnd) return false;
    return isDateInRange(k, c.lastPeriodStart, c.lastPeriodEnd);
  };

  // Swipe — horizontal only, ignore vertical scroll
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !onSwipeMonth) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      onSwipeMonth(dx > 0 ? -1 : 1);
    }
    touchStart.current = null;
  };

  return (
    <div className="px-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }, i) => {
          const key = toKey(date);
          const log = data.dayLogs[key];
          const takenToday = data.medLog[key] ?? {};
          const hasMed = Object.values(takenToday).some(Boolean) || !!log?.extraMeds?.length;
          const periodLevel = log?.periodInfo?.level ?? log?.period;
          const periodColor = periodColorVar(periodLevel) ?? (isActualPeriod(key) ? "var(--period-medium)" : null);
          const pAvg = avgDayPain(log);
          const isSel = key === selected;
          const predictedOrange = isPredicted(key);
          const icons = iconsFor(log, hasMed);

          const dayEvents = data.events.filter((e) => isDateInRange(key, e.startDate, e.endDate));
          const dayTasks = data.tasks.filter((t) => isDateInRange(key, t.startDate, t.endDate));
          const bars = [
            ...dayEvents.map((e) => ({ title: e.title, color: e.color ?? "var(--primary)", done: false })),
            ...dayTasks.map((t) => ({ title: t.title, color: "#f472b6", done: t.done })),
          ].slice(0, 2);
          const extraBars = dayEvents.length + dayTasks.length - bars.length;
          const marked = hasAnyLog(log);

          return (
            <button
              key={i}
              onClick={() => onSelect(key)}
              className={`flex flex-col items-stretch overflow-hidden rounded-xl text-left transition ${
                inMonth ? "" : "opacity-30"
              } ${isSel ? "ring-2 ring-primary" : ""}`}
            >
              <div className="relative flex aspect-square items-center justify-center pt-0.5">
                {pAvg != null && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-1.5 rounded-full"
                    style={{ boxShadow: `0 0 0 4px ${painColor(pAvg)}` }}
                  />
                )}
                {predictedOrange && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-2 rounded-full"
                    style={{ boxShadow: `0 0 0 2.5px var(--predicted)` }}
                  />
                )}
                <div
                  className="relative flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: periodColor ?? "transparent",
                  }}
                >
                  <span className={`text-sm ${
                    periodColor ? "font-semibold text-white" : "text-foreground"
                  }`}>
                    {date.getDate()}
                  </span>
                </div>
                {icons.length > 0 && (
                  <span className="absolute bottom-0 flex gap-0.5 text-[9px] leading-none">
                    {icons.slice(0, 3).map((ic, idx) => <span key={idx}>{ic}</span>)}
                  </span>
                )}
                {icons.length === 0 && marked && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/70" />
                )}
              </div>
              {bars.length > 0 && (
                <div className="flex flex-col gap-0.5 px-0.5 pb-0.5">
                  {bars.map((b, bi) => (
                    <span
                      key={bi}
                      className={`truncate rounded-sm px-1 text-[8px] leading-tight text-white ${b.done ? "opacity-50 line-through" : ""}`}
                      style={{ background: b.color }}
                    >
                      {b.title}
                    </span>
                  ))}
                  {extraBars > 0 && (
                    <span className="text-[8px] text-muted-foreground">+{extraBars}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
