import { Ico, IcoText } from "@/components/icons/BixboIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  toKey,
  periodLabel,
  isDateInRange,
  predictPeriods,
  avgDayPain,
  isIntercourseKind,
  isCycleTrackingHidden,
  type BixboData,
  type DayLog,
  type EventEntry,
  type PeriodLevel,
} from "@/lib/storage";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Calendar pain rings use the same vivid severity progression, ending in true red rather than pink. */
const CALENDAR_PAIN_COLORS = [
  "#72C64A", // 0 — green
  "#91CD3A", // 1
  "#B7D12F", // 2
  "#DFD11F", // 3 — yellow-green
  "#F3C30D", // 4 — yellow
  "#F5A20B", // 5 — amber
  "#F47B16", // 6 — orange
  "#F05A28", // 7 — red-orange
  "#EF4444", // 8 — red
  "#DC2626", // 9 — dark red
  "#B91C1C", // 10 — deepest red
] as const;

function calendarPainColor(value: number): string {
  const index = Math.max(0, Math.min(10, Math.round(value)));
  return CALENDAR_PAIN_COLORS[index];
}

function periodColorVar(level?: PeriodLevel) {
  switch (level) {
    case "spotting":
      return "var(--period-spotting)";
    case "light":
      return "var(--period-light)";
    case "medium":
      return "var(--period-medium)";
    case "heavy":
      return "var(--period-heavy)";
    case "very-heavy":
      return "var(--period-veryheavy)";
    default:
      return null;
  }
}
function iconsFor(log: DayLog | undefined): string[] {
  // Month calendar shows only ŠukŠuk.
  return log?.sex?.some((e) => isIntercourseKind(e.kind)) ? ["❤️"] : [];
}

function daySummaryLines(log: DayLog | undefined, cycleTrackingHidden: boolean): string[] {
  if (!log) return [];
  const out: string[] = [];
  if (log.pain?.length) out.push(`🔥 Pain: ${log.pain.map((p) => `${p.time} ${p.score}/10`).join(", ")}`);
  if (log.tetany?.length) out.push(`⚡ Tetany episode: ${log.tetany.map((t) => `${t.time} ${t.intensity}/5`).join(", ")}`);
  if (log.panic?.length) out.push(`🫯 Panic episode: ${log.panic.map((p) => `${p.time} ${p.intensity}/10`).join(", ")}`);
  const hf = log.pain?.filter((p) => (p.hotFlashes ?? 0) > 0) ?? [];
  if (hf.length) out.push(`🥵 Hot flashes: ${hf.map((p) => `${p.hotFlashes}/5`).join(", ")}`);
  const ha = log.pain?.filter((p) => p.headacheIntensity != null || (p.headacheTypes?.length ?? 0) > 0) ?? [];
  if (ha.length)
    out.push(
      `🤕 Headache: ${ha.map((p) => `${p.headacheTypes?.join("/") ?? "yes"}${p.headacheIntensity != null ? ` ${p.headacheIntensity}/10` : ""}`).join(", ")}`,
    );
  if (log.extraMeds?.length) out.push(`💊 Extra meds: ${log.extraMeds.map((m) => m.name).join(", ")}`);
  if (log.sex?.length) out.push(`❤️ ŠukŠuk: ${log.sex.length}×`);
  if (log.food?.length)
    out.push(
      `🍽️ Food: ${
        log.food
          .map((f) => f.what)
          .filter(Boolean)
          .join(", ") || `${log.food.length} entries`
      }`,
    );
  if (log.bowel?.length) out.push(`💩 Bowel: ${log.bowel.map((b) => `type ${b.bristol}`).join(", ")}`);
  if (log.heat?.length)
    out.push(`♨️ Heat/Cold/TENS: ${log.heat.map((h) => (h.kind === "tens" ? "⭐ TENS" : h.kind)).join(", ")}`);
  if (log.workout?.length) out.push(`🧘🏼‍♀️ Workout: ${log.workout.map((w) => `${w.kind} ${w.minutes}min`).join(", ")}`);
  if (log.weight != null) out.push(`⚖️ Weight: ${log.weight} kg`);
  if (log.temperature != null) out.push(`🌡️ Temp: ${log.temperature} °C`);
  if (log.sleepHours != null) out.push(`😴 Sleep: ${log.sleepHours} h`);
  if (!cycleTrackingHidden && (log.periodInfo?.level ?? log.period)) {
    out.push(`🫐 Period: ${periodLabel(log.periodInfo?.level ?? log.period)}`);
  }
  return out;
}

export function MonthCalendar({
  month,
  data,
  selected,
  onSelect,
  onSwipeMonth,
}: {
  month: Date;
  data: BixboData;
  selected: string;
  onSelect: (k: string) => void;
  onSwipeMonth?: (delta: -1 | 1) => void;
}) {
  const isMale = data.settings.gender === "male";
  /** Shared rule: hide cycle UI for male, pregnancy and postpartum modes. */
  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const hidePredictions = cycleTrackingHidden;
  const [peek, setPeek] = useState<string | null>(null);
  const longTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const dayPointerStart = useRef<{ x: number; y: number } | null>(null);
  const dayPointerMoved = useRef(false);

  useEffect(() => {
    if (!peek) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [peek]);

  const clearLong = () => {
    if (longTimer.current !== null) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };
  const y = month.getFullYear();
  const m = month.getMonth();

  const { cells, weeks } = useMemo(() => {
    const first = new Date(y, m, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    const nextCells: { date: Date; inMonth: boolean; key: string }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      let d: Date;
      let inMonth = true;
      if (dayNum < 1) {
        d = new Date(y, m - 1, prevDays + dayNum);
        inMonth = false;
      } else if (dayNum > daysInMonth) {
        d = new Date(y, m + 1, dayNum - daysInMonth);
        inMonth = false;
      } else {
        d = new Date(y, m, dayNum);
      }
      nextCells.push({ date: d, inMonth, key: toKey(d) });
    }

    const nextWeeks: (typeof nextCells)[] = [];
    for (let i = 0; i < nextCells.length; i += 7) nextWeeks.push(nextCells.slice(i, i + 7));

    return { cells: nextCells, weeks: nextWeeks };
  }, [m, y]);

  const predictedKeys = useMemo(() => {
    const result = new Set<string>();
    if (hidePredictions || cells.length === 0) return result;

    const predicted = predictPeriods(data.cycle, cells[0].date, cells[cells.length - 1].date);
    for (const cell of cells) {
      const hasLoggedPeriod = !!(data.dayLogs[cell.key]?.period || data.dayLogs[cell.key]?.periodInfo?.level);
      if (!hasLoggedPeriod && predicted.some((p) => isDateInRange(cell.key, p.start, p.end))) {
        result.add(cell.key);
      }
    }
    return result;
  }, [cells, data.cycle, data.dayLogs, hidePredictions]);

  const cellMeta = useMemo(() => {
    const meta = new Map<
      string,
      {
        periodColor: string | null;
        pAvg: number | null;
        predictedPeriod: boolean;
        icons: string[];
      }
    >();

    for (const cell of cells) {
      const log = data.dayLogs[cell.key];
      const periodLevel = cycleTrackingHidden ? undefined : (log?.periodInfo?.level ?? log?.period);

      let actualPeriodColor: string | null = null;
      if (!cycleTrackingHidden && data.cycle.lastPeriodStart && data.cycle.lastPeriodEnd) {
        if (isDateInRange(cell.key, data.cycle.lastPeriodStart, data.cycle.lastPeriodEnd)) {
          actualPeriodColor = "var(--period-medium)";
        }
      }

      meta.set(cell.key, {
        periodColor: cycleTrackingHidden ? null : (periodColorVar(periodLevel) ?? actualPeriodColor),
        pAvg: avgDayPain(log) ?? null,
        predictedPeriod: predictedKeys.has(cell.key),
        icons: iconsFor(log),
      });
    }

    return meta;
  }, [cells, cycleTrackingHidden, data.cycle.lastPeriodEnd, data.cycle.lastPeriodStart, data.dayLogs, predictedKeys]);

  const weekLayouts = useMemo(() => {
    return weeks.map((week) => {
      const weekStart = week[0].key;
      const weekEnd = week[6].key;
      const segments = data.events
        .filter((event) => event.startDate <= weekEnd && event.endDate >= weekStart)
        .map((event) => {
          const startIdx = Math.max(
            0,
            week.findIndex((cell) => cell.key >= event.startDate && cell.key <= event.endDate),
          );
          let endIdx = startIdx;
          for (let i = week.length - 1; i >= 0; i--) {
            if (week[i].key >= event.startDate && week[i].key <= event.endDate) {
              endIdx = i;
              break;
            }
          }
          return {
            event,
            startIdx,
            endIdx,
            showTitle: event.startDate >= weekStart || startIdx === 0,
          };
        });

      const rows: (typeof segments)[] = [[], []];
      const usedByCell: boolean[][] = [new Array(7).fill(false), new Array(7).fill(false)];

      for (const segment of segments) {
        for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
          let available = true;
          for (let i = segment.startIdx; i <= segment.endIdx; i++) {
            if (usedByCell[rowIndex][i]) {
              available = false;
              break;
            }
          }
          if (available) {
            rows[rowIndex].push(segment);
            for (let i = segment.startIdx; i <= segment.endIdx; i++) {
              usedByCell[rowIndex][i] = true;
            }
            break;
          }
        }
      }

      const overflowByCell = new Array(7).fill(0);
      for (const segment of segments) {
        if (rows[0].includes(segment) || rows[1].includes(segment)) continue;
        for (let i = segment.startIdx; i <= segment.endIdx; i++) overflowByCell[i]++;
      }

      return { rows, overflowByCell };
    });
  }, [data.events, weeks]);

  // Swipe
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
    <div className="px-1 landscape:px-2 lg:px-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="grid grid-cols-7 gap-0.5 pb-1 text-center text-[11px] font-semibold text-muted-foreground landscape:pb-0 landscape:text-[10px] lg:pb-2 lg:text-sm xl:text-[15px]">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="space-y-0.5 lg:space-y-1.5 xl:space-y-2">
        {weeks.map((week, wi) => {
          const { rows, overflowByCell } = weekLayouts[wi];

          return (
            <div key={wi} className="grid grid-cols-7 gap-x-0.5 gap-y-0.5 lg:gap-x-1 lg:gap-y-1 xl:gap-x-1.5 xl:gap-y-1.5">
              {week.map(({ date, inMonth, key }, ci) => {
                const meta = cellMeta.get(key);
                const periodColor = meta?.periodColor ?? null;
                const pAvg = meta?.pAvg ?? null;
                const isSel = key === selected;
                const predictedPeriod = meta?.predictedPeriod ?? false;
                const icons = meta?.icons ?? [];

                return (
                  <button
                    key={ci}
                    onPointerDown={(event) => {
                      longFired.current = false;
                      dayPointerMoved.current = false;
                      dayPointerStart.current = { x: event.clientX, y: event.clientY };
                      clearLong();

                      longTimer.current = window.setTimeout(() => {
                        if (dayPointerMoved.current) return;
                        longFired.current = true;
                        if (navigator.vibrate) {
                          try {
                            navigator.vibrate(15);
                          } catch {
                            /* noop */
                          }
                        }
                        setPeek(key);
                      }, 500);
                    }}
                    onPointerMove={(event) => {
                      const start = dayPointerStart.current;
                      if (!start) return;
                      if (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8) {
                        dayPointerMoved.current = true;
                        clearLong();
                      }
                    }}
                    onPointerUp={() => {
                      clearLong();
                      const moved = dayPointerMoved.current;
                      dayPointerStart.current = null;
                      dayPointerMoved.current = false;
                      if (!moved && !longFired.current) onSelect(key);
                    }}
                    onPointerLeave={() => {
                      dayPointerMoved.current = true;
                      dayPointerStart.current = null;
                      clearLong();
                    }}
                    onPointerCancel={() => {
                      dayPointerMoved.current = true;
                      dayPointerStart.current = null;
                      clearLong();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`flex select-none flex-col items-stretch rounded-lg text-left transition ${
                      inMonth ? "" : "opacity-30"
                    } ${isSel ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="relative flex h-[58px] items-center justify-center pt-0.5 landscape:h-8 landscape:pt-0 lg:h-[78px] lg:pt-1 xl:h-[84px]">
                      {pAvg != null && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute h-10 w-10 rounded-full lg:h-12 lg:w-12 xl:h-[52px] xl:w-[52px]"
                          style={{ boxShadow: `0 0 0 4.75px ${calendarPainColor(pAvg)}` }}
                        />
                      )}
                      {predictedPeriod && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-2 rounded-full lg:inset-[15px] xl:inset-[16px]"
                          style={{ boxShadow: `0 0 0 2px var(--period-medium)` }}
                        />
                      )}
                      <div
                        className="relative flex h-8 w-8 items-center justify-center rounded-full lg:h-10 lg:w-10 xl:h-11 xl:w-11"
                        style={{ background: periodColor ?? "transparent" }}
                      >
                        <span className={`text-sm lg:text-base xl:text-[17px] ${periodColor ? "font-semibold text-white" : "text-foreground"}`}>
                          {date.getDate()}
                        </span>
                      </div>
                      {icons.length > 0 && (
                        <span className="pointer-events-none absolute bottom-0.5 left-1/2 flex -translate-x-1/2 items-center justify-center leading-none drop-shadow-sm lg:bottom-1 xl:bottom-1.5">
                          <Ico e="❤️" size={15} className="lg:h-4 lg:w-4 xl:h-[18px] xl:w-[18px]" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Event bar rows */}
              {rows.map((row, ri) =>
                row.length ? (
                  <div key={`r-${ri}`} className="col-span-7 grid grid-cols-7 gap-0.5">
                    {new Array(7).fill(null).map((_, ci) => {
                      const seg = row.find((s) => s.startIdx === ci);
                      if (seg) {
                        const span = seg.endIdx - seg.startIdx + 1;
                        const isStart = week[seg.startIdx].key === seg.event.startDate;
                        const isEnd = week[seg.endIdx].key === seg.event.endDate;
                        return (
                          <div
                            key={ci}
                            className={`h-3 truncate px-1 text-[10px] font-medium leading-3 text-primary-foreground lg:h-3.5 lg:text-[10px] lg:leading-[14px] xl:h-4 xl:text-[11px] xl:leading-4 ${
                              isStart ? "rounded-l" : ""
                            } ${isEnd ? "rounded-r" : ""}`}
                            style={{
                              gridColumn: `span ${span} / span ${span}`,
                              background: seg.event.color ?? "var(--primary)",
                            }}
                          >
                            {seg.event.title}
                          </div>
                        );
                      }
                      // if this cell is covered by a segment (mid), skip (it's part of prior span)
                      const covered = row.some((s) => ci > s.startIdx && ci <= s.endIdx);
                      if (covered) return null;
                      return <div key={ci} className="h-3 lg:h-3.5 xl:h-4" />;
                    })}
                  </div>
                ) : null,
              )}
              {overflowByCell.some((n) => n > 0) && (
                <div className="col-span-7 grid grid-cols-7 gap-0.5">
                  {overflowByCell.map((n, ci) => (
                    <div key={ci} className="h-[10px] text-center text-[10px] leading-[10px] text-muted-foreground lg:h-3 lg:text-[10px] lg:leading-3">
                      {n > 0 ? `+${n}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {peek &&
        (() => {
          const lines = daySummaryLines(data.dayLogs[peek], cycleTrackingHidden);
          const d = new Date(`${peek}T00:00:00`);
          return (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setPeek(null)}>
              <div
                className="max-h-[70dvh] w-full max-w-sm overflow-y-auto overscroll-contain touch-pan-y rounded-3xl bg-background p-4 ring-1 ring-border"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-2 font-serif text-lg">
                  {d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing logged on this day.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {lines.map((l, i) => (
                      <li key={i} className="whitespace-pre-line">
                        <IcoText text={l} size={15} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setPeek(null)} className="flex-1 rounded-2xl bg-tint py-2 text-sm">
                    Close
                  </button>
                  <button
                    onClick={() => {
                      onSelect(peek);
                      setPeek(null);
                    }}
                    className="flex-1 rounded-2xl bg-primary py-2 text-sm text-primary-foreground"
                  >
                    Open day
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
