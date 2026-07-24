import { Link } from "@tanstack/react-router";
import { toKey, hasAnyLog, type BixboData, type DayLog } from "@/lib/storage";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function periodColorVar(level?: string) {
  switch (level) {
    case "spotting": return "var(--period-spotting)";
    case "light": return "var(--period-light)";
    case "medium": return "var(--period-medium)";
    case "heavy": return "var(--period-heavy)";
    case "veryheavy": return "var(--period-veryheavy)";
    default: return null;
  }
}
function painRingColor(pain?: number) {
  if (pain == null) return "transparent";
  if (pain <= 3) return "var(--pain-low)";
  if (pain <= 6) return "var(--pain-mid)";
  return "var(--pain-high)";
}

function maxPain(log?: DayLog): number | undefined {
  if (!log?.pain?.length) return undefined;
  return log.pain.reduce((m, p) => Math.max(m, p.score), 0);
}

function iconsFor(log: DayLog | undefined, hasMed: boolean): string[] {
  const out: string[] = [];
  if (hasMed) out.push("💊");
  if (log?.bowel?.length) out.push("💩");
  if (log?.sex && log.sex.type !== "none") out.push("❤️");
  if (log?.heat?.length) out.push("🔥");
  if (log?.temperature != null || log?.weight != null) out.push("🌡️");
  return out;
}

export function MonthCalendar({
  month,
  data,
  interactive = true,
}: {
  month: Date;
  data: BixboData;
  interactive?: boolean;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    if (dayNum < 1) {
      cells.push({ date: new Date(y, m - 1, prevDays + dayNum), inMonth: false });
    } else if (dayNum > daysInMonth) {
      cells.push({ date: new Date(y, m + 1, dayNum - daysInMonth), inMonth: false });
    } else {
      cells.push({ date: new Date(y, m, dayNum), inMonth: true });
    }
  }

  const todayK = toKey(new Date());

  return (
    <div className="px-3">
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }, i) => {
          const key = toKey(date);
          const log = data.dayLogs[key];
          const hasNote = (data.dayNotes[key]?.length ?? 0) > 0;
          const hasTodo = (data.todos[key]?.length ?? 0) > 0;
          const takenToday = data.medLog[key] ?? {};
          const hasMed = Object.values(takenToday).some(Boolean) || !!(log?.extraMeds?.length);
          const periodColor = periodColorVar(log?.period);
          const pMax = maxPain(log);
          const ringColor = painRingColor(pMax);
          const isToday = key === todayK;
          const icons = iconsFor(log, hasMed);
          const marked = hasAnyLog(log) || hasNote || hasTodo || hasMed;

          const inner = (
            <div className={`flex aspect-square items-center justify-center ${inMonth ? "" : "opacity-30"}`}>
              <div className="relative flex h-11 w-11 items-center justify-center">
                {/* Outer pain ring — thick, sits OUTSIDE the period fill so it stays visible */}
                {pMax != null && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ boxShadow: `0 0 0 3.5px ${ringColor}` }}
                  />
                )}
                <div
                  className="relative flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: periodColor ?? "transparent",
                    border: isToday && !periodColor ? "1.5px dashed var(--primary)" : undefined,
                  }}
                >
                  <span className={`text-sm ${periodColor ? "font-semibold text-white" : "text-foreground"}`}>
                    {date.getDate()}
                  </span>
                </div>
                {icons.length > 0 ? (
                  <span className="absolute -bottom-2 flex gap-0.5 text-[9px] leading-none">
                    {icons.slice(0, 3).map((ic, idx) => <span key={idx}>{ic}</span>)}
                  </span>
                ) : marked ? (
                  <span className="absolute -bottom-1 flex gap-0.5">
                    {hasNote && <span className="h-1 w-1 rounded-full bg-primary" />}
                    {hasTodo && <span className="h-1 w-1 rounded-full bg-foreground/60" />}
                  </span>
                ) : null}
              </div>
            </div>
          );

          if (!interactive) return <div key={i}>{inner}</div>;
          return (
            <Link key={i} to="/day/$date" params={{ date: key }} className="block">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
