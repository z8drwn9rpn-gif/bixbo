import { Ico } from "@/components/icons/BixboExtraIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { customLogDefinitions, getRegistryFeature, isRegistrySurfaceEnabled, type RegistryFeatureId } from "@/lib/appRegistry";
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
  type PeriodLevel,
} from "@/lib/storage";

const WEEKDAYS = [
  { short: "Mo", desktop: "Mon" },
  { short: "Tu", desktop: "Tue" },
  { short: "We", desktop: "Wed" },
  { short: "Th", desktop: "Thu" },
  { short: "Fr", desktop: "Fri" },
  { short: "Sa", desktop: "Sat" },
  { short: "Su", desktop: "Sun" },
];
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

function iconsFor(log: DayLog | undefined, data: BixboData): string[] {
  if (!log) return [];
  const out: string[] = [];
  const add = (id: RegistryFeatureId, present: boolean) => {
    if (present && isRegistrySurfaceEnabled(data, id, "calendar")) out.push(getRegistryFeature(data, id).icon);
  };
  add("sex", Boolean(log.sex?.some((entry) => isIntercourseKind(entry.kind))));
  add("tetany", Boolean(log.tetany?.length));
  add("panic", Boolean(log.panic?.length));
  add("bowel", Boolean(log.bowel?.length));
  add("workout", Boolean(log.workout?.length));
  add("food", Boolean(log.food?.length));
  add("heat", Boolean(log.heat?.length));
  add("meds", Boolean(log.extraMeds?.length));
  add("sleep", log.sleepHours != null);
  add("hotFlashes", Boolean(log.pain?.some((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0)));
  add("headache", Boolean(log.pain?.some((entry) => entry.headache || entry.headacheIntensity != null)));
  for (const custom of customLogDefinitions(data)) {
    if (custom.calendar === false) continue;
    if (log.customLogs?.[custom.id]?.length) out.push(custom.icon);
  }
  return Array.from(new Set(out)).slice(0, 3);
}

type DaySummaryRow = {
  icon: string;
  label: string;
  meta?: string;
  value: string;
  accent?: string;
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mode(values: number[]): number | null {
  if (!values.length) return null;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
}

function formatAverage(value: number, max: number) {
  return `${value.toFixed(1)} /${max}`;
}

function daySummaryRows(log: DayLog | undefined, cycleTrackingHidden: boolean, t: (key: string) => string): DaySummaryRow[] {
  if (!log) return [];
  const rows: DaySummaryRow[] = [];

  if (log.pain?.length) {
    const value = average(log.pain.map((entry) => entry.score));
    if (value != null) rows.push({ icon: "🔥", label: `${t("Pain")} (avg)`, meta: `${log.pain.length} ${log.pain.length === 1 ? "entry" : "entries"}`, value: formatAverage(value, 10), accent: calendarPainColor(value) });
  }

  const headache = log.pain?.filter((entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0) ?? [];
  const headacheAverage = average(headache.map((entry) => entry.headacheIntensity).filter((value): value is number => value != null));
  if (headache.length) {
    const types = Array.from(new Set(headache.flatMap((entry) => entry.headacheTypes ?? []).filter(Boolean)));
    rows.push({ icon: "🤕", label: `${t("Headache")} (avg)`, meta: `${headache.length} ${headache.length === 1 ? "entry" : "entries"}`, value: headacheAverage != null ? formatAverage(headacheAverage, 10) : (types.join(" · ") || t("Logged")), accent: "#7467D8" });
  }

  const hotFlashes = log.pain?.filter((entry) => (entry.hotFlashes ?? 0) > 0) ?? [];
  const hotFlashAverage = average(hotFlashes.map((entry) => entry.hotFlashes ?? 0));
  if (hotFlashes.length && hotFlashAverage != null) rows.push({ icon: "🥵", label: `${t("Hot flashes")} (avg)`, meta: `${hotFlashes.length} ${hotFlashes.length === 1 ? "entry" : "entries"}`, value: formatAverage(hotFlashAverage, 5), accent: "#E65073" });

  if (log.tetany?.length) {
    const value = average(log.tetany.map((entry) => entry.intensity));
    if (value != null) rows.push({ icon: "⚡", label: `${t("Tetany episode")} (avg)`, meta: `${log.tetany.length} ${log.tetany.length === 1 ? "entry" : "entries"}`, value: formatAverage(value, 5), accent: "#91A83B" });
  }

  if (log.panic?.length) {
    const value = average(log.panic.map((entry) => entry.intensity));
    if (value != null) rows.push({ icon: "✨", label: `${t("Panic episode")} (avg)`, meta: `${log.panic.length} ${log.panic.length === 1 ? "entry" : "entries"}`, value: formatAverage(value, 10), accent: "#B79C38" });
  }

  if (log.bowel?.length) {
    const bristol = mode(log.bowel.map((entry) => entry.bristol).filter((value): value is number => typeof value === "number"));
    rows.push({ icon: "💩", label: `${t("Bowel")} (mode)`, meta: `${log.bowel.length} ${log.bowel.length === 1 ? "entry" : "entries"}`, value: bristol != null ? `${t("type")} ${bristol}` : t("Logged"), accent: "#A66A4D" });
  }

  if (log.workout?.length) {
    const kinds = Array.from(new Set(log.workout.map((entry) => entry.kind).filter(Boolean)));
    const totalMinutes = log.workout.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
    rows.push({ icon: "🧘🏼‍♀️", label: t("Workout"), meta: `${log.workout.length} ${log.workout.length === 1 ? "entry" : "entries"}`, value: `${kinds.slice(0, 2).join(" · ") || t("Workout")}${totalMinutes ? ` · ${totalMinutes} min` : ""}`, accent: "#D9A525" });
  }

  if (log.extraMeds?.length) {
    const names = Array.from(new Set(log.extraMeds.map((entry) => entry.name).filter(Boolean)));
    rows.push({ icon: "💊", label: t("Extra meds"), meta: `${log.extraMeds.length} ${log.extraMeds.length === 1 ? "entry" : "entries"}`, value: names.slice(0, 3).join(" · ") || t("Logged"), accent: "#C98265" });
  }

  if (log.sex?.length) rows.push({ icon: "❤️", label: "ŠukŠuk", meta: `${log.sex.length} ${log.sex.length === 1 ? "entry" : "entries"}`, value: `${log.sex.length}×`, accent: "#E65073" });

  if (log.food?.length) {
    const foods = Array.from(new Set(log.food.map((entry) => entry.what).filter(Boolean)));
    rows.push({ icon: "🍽️", label: t("Food"), meta: `${log.food.length} ${log.food.length === 1 ? "entry" : "entries"}`, value: foods.slice(0, 2).join(" · ") || `${log.food.length} ${t("entries")}`, accent: "#B88748" });
  }

  if (log.heat?.length) {
    const kinds = Array.from(new Set(log.heat.map((entry) => entry.kind === "tens" ? "TENS" : entry.kind).filter(Boolean)));
    rows.push({ icon: "♨️", label: t("Heat / Cold / TENS"), meta: `${log.heat.length} ${log.heat.length === 1 ? "entry" : "entries"}`, value: kinds.join(" · ") || t("Logged"), accent: "#D66E45" });
  }

  if (log.sleepHours != null) rows.push({ icon: "🌙", label: t("Sleep"), meta: "1 entry", value: `${log.sleepHours} h`, accent: "#7467D8" });
  if (log.temperature != null) rows.push({ icon: "🌡️", label: t("Temp"), meta: "1 entry", value: `${log.temperature} °C`, accent: "#D86D64" });
  if (log.weight != null) rows.push({ icon: "⚖️", label: t("Weight"), meta: "1 entry", value: `${log.weight} kg`, accent: "#83985A" });

  if (!cycleTrackingHidden && (log.periodInfo?.level ?? log.period)) {
    rows.push({ icon: "🫐", label: t("Period"), meta: "1 entry", value: periodLabel(log.periodInfo?.level ?? log.period), accent: "#7467D8" });
  }

  return rows;
}

function daySummaryEntryCount(log: DayLog | undefined) {
  if (!log) return 0;
  return (log.pain?.length ?? 0)
    + (log.tetany?.length ?? 0)
    + (log.panic?.length ?? 0)
    + (log.bowel?.length ?? 0)
    + (log.workout?.length ?? 0)
    + (log.extraMeds?.length ?? 0)
    + (log.sex?.length ?? 0)
    + (log.food?.length ?? 0)
    + (log.heat?.length ?? 0)
    + (log.sleepHours != null ? 1 : 0)
    + (log.temperature != null ? 1 : 0)
    + (log.weight != null ? 1 : 0)
    + ((log.periodInfo?.level ?? log.period) ? 1 : 0);
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
  const { t } = useI18n();
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
        pAvg: isRegistrySurfaceEnabled(data, "pain", "calendar") ? (avgDayPain(log) ?? null) : null,
        predictedPeriod: predictedKeys.has(cell.key),
        icons: iconsFor(log, data),
      });
    }

    return meta;
  }, [cells, cycleTrackingHidden, data, predictedKeys]);

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
          <div key={d.short}>
            <span className="lg:hidden">{t(d.short)}</span>
            <span className="hidden lg:inline">{t(d.desktop)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-0.5 lg:space-y-1.5 xl:space-y-2">
        {weeks.map((week, wi) => {
          const { rows, overflowByCell } = weekLayouts[wi];

          return (
            <div key={wi} className="grid grid-cols-7 gap-x-0.5 gap-y-0.5 lg:gap-x-1.5 lg:gap-y-1 xl:gap-x-2 xl:gap-y-1.5">
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
                    className={`flex select-none flex-col items-stretch rounded-xl text-left transition ${
                      inMonth ? "" : "opacity-30"
                    } ${isSel ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex min-h-[62px] flex-col items-center justify-start pt-1 landscape:min-h-[44px] landscape:pt-0 lg:min-h-[84px] lg:pt-2 xl:min-h-[90px]">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full lg:h-[52px] lg:w-[52px] xl:h-[56px] xl:w-[56px]">
                        {pAvg != null && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full"
                            style={{ boxShadow: `0 0 0 4px ${calendarPainColor(pAvg)}` }}
                          />
                        )}

                        {predictedPeriod && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-[4px] rounded-full lg:inset-[5px]"
                            style={{ boxShadow: `inset 0 0 0 2.5px var(--period-medium)` }}
                          />
                        )}

                        <div
                          className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full lg:h-10 lg:w-10 xl:h-11 xl:w-11 ${
                            isSel ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                          }`}
                          style={{ background: periodColor ?? "transparent" }}
                        >
                          <span
                            className={`text-sm leading-none lg:text-base xl:text-[17px] ${
                              periodColor ? "font-semibold text-white" : "text-foreground"
                            }`}
                          >
                            {date.getDate()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-0.5 flex h-4 items-center justify-center leading-none lg:mt-1 lg:h-5">
                        {icons.includes("❤️") ? (
                          <Ico e="❤️" size={14} className="h-[14px] w-[14px] lg:h-[17px] lg:w-[17px] xl:h-[18px] xl:w-[18px]" />
                        ) : (
                          <span aria-hidden className="block h-[14px] w-[14px] lg:h-[17px] lg:w-[17px]" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

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
          const log = data.dayLogs[peek];
          const summary = daySummaryRows(log, cycleTrackingHidden, t);
          const entryCount = daySummaryEntryCount(log);
          const d = new Date(`${peek}T00:00:00`);
          return (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 px-5 py-[max(20px,env(safe-area-inset-top))] backdrop-blur-[1px]" onClick={() => setPeek(null)}>
              <section
                role="dialog"
                aria-modal="true"
                aria-label={t("Day summary")}
                className="flex max-h-[78dvh] w-full max-w-[350px] flex-col overflow-hidden rounded-[30px] border border-border/70 bg-background shadow-[0_24px_70px_-30px_rgba(24,31,17,.55),0_6px_20px_-12px_rgba(24,31,17,.35)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="shrink-0 px-5 pb-3 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-muted-foreground">{t("Day summary")}</p>
                      <h3 className="mt-1.5 text-[21px] font-black tracking-[-0.035em] text-foreground">
                        {d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                      </h3>
                    </div>
                    <button type="button" onClick={() => setPeek(null)} aria-label={t("Close")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/70 bg-tint/70 text-lg font-bold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.75)] transition active:scale-95">×</button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelect(peek);
                      setPeek(null);
                    }}
                    className="mt-3 flex w-full items-center gap-3 rounded-[19px] border border-border/55 bg-tint/45 px-3 py-2.5 text-left transition active:scale-[0.99]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/60 bg-background/80 text-base">📅</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-foreground">{entryCount} {entryCount === 1 ? "entry" : "entries"} · {summary.length} {summary.length === 1 ? "log" : "logs"}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{t("Tap to open this day")}</span>
                    </span>
                    <span aria-hidden className="text-lg text-muted-foreground">›</span>
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 touch-pan-y">
                  {summary.length === 0 ? (
                    <div className="rounded-[20px] border border-border/55 bg-tint/30 px-4 py-5 text-center text-sm text-muted-foreground">{t("Nothing logged on this day.")}</div>
                  ) : (
                    <div className="overflow-hidden rounded-[22px] border border-border/55 bg-background/75">
                      {summary.map((row, index) => (
                        <button
                          key={`${row.label}-${index}`}
                          type="button"
                          onClick={() => {
                            onSelect(peek);
                            setPeek(null);
                          }}
                          className={`grid w-full grid-cols-[34px_minmax(0,1fr)_auto_14px] items-center gap-2 px-3 py-2.5 text-left transition hover:bg-tint/35 active:bg-tint/55 ${index ? "border-t border-border/45" : ""}`}
                        >
                          <span className="grid h-8 w-8 place-items-center text-[18px] leading-none"><Ico e={row.icon} size={18} /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-bold leading-tight text-foreground">{row.label}</span>
                            {row.meta ? <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted-foreground">{row.meta}</span> : null}
                          </span>
                          <span className="max-w-[118px] truncate text-right text-[12.5px] font-extrabold leading-tight" style={{ color: row.accent ?? "var(--foreground)" }}>{row.value}</span>
                          <span aria-hidden className="text-[18px] leading-none text-muted-foreground">›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          );
        })()}
    </div>
  );
}

export function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
