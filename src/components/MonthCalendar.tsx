import { Link } from "@tanstack/react-router";
import { toKey, type BixboData } from "@/lib/storage";

const WEEKDAYS = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
const MONTHS = [
  "Január", "Február", "Marec", "Apríl", "Máj", "Jún",
  "Júl", "August", "September", "Október", "November", "December",
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
  const startWeekday = first.getDay(); // 0=Sun
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
          const periodColor = periodColorVar(log?.period);
          const ringColor = painRingColor(log?.pain);
          const isToday = key === todayK;

          const inner = (
            <div className={`flex aspect-square items-center justify-center ${inMonth ? "" : "opacity-30"}`}>
              <div
                className="relative flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  background: periodColor ?? "transparent",
                  boxShadow: log?.pain != null ? `0 0 0 2.5px ${ringColor}` : undefined,
                  border: isToday && !periodColor ? "1.5px dashed var(--primary)" : undefined,
                }}
              >
                <span
                  className={`text-sm ${periodColor ? "font-semibold text-white" : "text-foreground"}`}
                >
                  {date.getDate()}
                </span>
                {(hasNote || hasTodo) && (
                  <span className="absolute -bottom-1 flex gap-0.5">
                    {hasNote && <span className="h-1 w-1 rounded-full bg-primary" />}
                    {hasTodo && <span className="h-1 w-1 rounded-full bg-foreground/60" />}
                  </span>
                )}
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
