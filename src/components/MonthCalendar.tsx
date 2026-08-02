import { Ico, IcoText } from "@/components/icons/BixboIcons";
import { useRef, useState } from "react";
import {
  toKey, hasAnyLog, painColor, isDateInRange, predictPeriods, avgDayPain, isIntercourseKind,
  type BixboData, type DayLog, type EventEntry,
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
function iconsFor(log: DayLog | undefined, hasMed: boolean, _isMale: boolean): string[] {
  const out: string[] = [];
  if (log?.sex?.some((e) => isIntercourseKind(e.kind))) out.push("❤️");
  if (hasMed) out.push("💊");
  if (log?.bowel?.some((b) => b.bristol > 0)) out.push("💩");
  if (log?.heat?.some((h) => h.kind === "heat")) out.push("♨️");
  if (log?.heat?.some((h) => h.kind === "cold")) out.push("🧊");
  if (log?.heat?.some((h) => h.kind === "tens")) out.push("✨");
  if (log?.tetany?.length) out.push("⚡");
  if (log?.panic?.length) out.push("🫯");
  return out;
}

function daySummaryLines(log: DayLog | undefined, isMale: boolean): string[] {
  if (!log) return [];
  const out: string[] = [];
  if (log.pain?.length) out.push(`🔥 Pain: ${log.pain.map((p) => `${p.time} ${p.score}/10`).join(", ")}`);
  if (log.tetany?.length) out.push(`⚡ Tetany: ${log.tetany.map((t) => `${t.time} ${t.intensity}/5`).join(", ")}`);
  if (log.panic?.length) out.push(`🫯 Panic: ${log.panic.map((p) => `${p.time} ${p.intensity}/10`).join(", ")}`);
  const hf = log.pain?.filter((p) => (p.hotFlashes ?? 0) > 0) ?? [];
  if (hf.length) out.push(`🥵 Hot flashes: ${hf.map((p) => `${p.hotFlashes}/5`).join(", ")}`);
  const ha = log.pain?.filter((p) => p.headacheIntensity != null || (p.headacheTypes?.length ?? 0) > 0) ?? [];
  if (ha.length) out.push(`🤕 Headache: ${ha.map((p) => `${p.headacheTypes?.join("/") ?? "yes"}${p.headacheIntensity != null ? ` ${p.headacheIntensity}/10` : ""}`).join(", ")}`);
  if (log.extraMeds?.length) out.push(`💊 Extra meds: ${log.extraMeds.map((m) => m.name).join(", ")}`);
  if (log.sex?.length) out.push(`❤️ ŠukŠuk: ${log.sex.length}×`);
  if (log.food?.length) out.push(`🍽️ Food: ${log.food.map((f) => f.what).filter(Boolean).join(", ") || `${log.food.length} entries`}`);
  if (!isMale && (log.periodInfo?.level ?? log.period)) out.push(`🫐 Period: ${log.periodInfo?.level ?? log.period}`);
  if (log.bowel?.length) out.push(`💩 Bowel: ${log.bowel.map((b) => `type ${b.bristol}`).join(", ")}`);
  if (log.heat?.length) out.push(`♨️ Heat/Cold/TENS: ${log.heat.map((h) => h.kind).join(", ")}`);
  if (log.workout?.length) out.push(`🧘🏼‍♀️ Workout: ${log.workout.map((w) => `${w.kind} ${w.minutes}min`).join(", ")}`);
  if (log.weight != null) out.push(`⚖️ Weight: ${log.weight} kg`);
  if (log.temperature != null) out.push(`🌡️ Temp: ${log.temperature} °C`);
  if (log.sleepHours != null) out.push(`😴 Sleep: ${log.sleepHours} h`);
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
  const isMale = data.settings.gender === "male";
  const [peek, setPeek] = useState<string | null>(null);
  const longTimer = useRef<number | null>(null);
  const longFired = useRef(false);
  const clearLong = () => { if (longTimer.current) { window.clearTimeout(longTimer.current); longTimer.current = null; } };
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells: { date: Date; inMonth: boolean; key: string }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    let d: Date;
    let inMonth = true;
    if (dayNum < 1) { d = new Date(y, m - 1, prevDays + dayNum); inMonth = false; }
    else if (dayNum > daysInMonth) { d = new Date(y, m + 1, dayNum - daysInMonth); inMonth = false; }
    else { d = new Date(y, m, dayNum); }
    cells.push({ date: d, inMonth, key: toKey(d) });
  }

  const predicted = isMale ? [] : predictPeriods(data.cycle, cells[0].date, cells[cells.length - 1].date);
  const isPredicted = (k: string) =>
    !isMale &&
    predicted.some((p) => isDateInRange(k, p.start, p.end)) &&
    !(data.dayLogs[k]?.period || data.dayLogs[k]?.periodInfo?.level);
  const isActualPeriod = (k: string) => {
    if (isMale) return false;
    const c = data.cycle;
    if (!c.lastPeriodStart || !c.lastPeriodEnd) return false;
    return isDateInRange(k, c.lastPeriodStart, c.lastPeriodEnd);
  };

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

  // Build week rows for Apple-style event bars
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // For each week compute event segments (Apple-style)
  const eventSegmentsForWeek = (week: typeof cells): {
    event: EventEntry; startIdx: number; endIdx: number; showTitle: boolean;
  }[] => {
    const weekStart = week[0].key;
    const weekEnd = week[6].key;
    const evs = data.events.filter((e) => e.startDate <= weekEnd && e.endDate >= weekStart);
    return evs.map((e) => {
      const startIdx = Math.max(0, week.findIndex((c) => c.key >= e.startDate && c.key <= e.endDate));
      let endIdx = startIdx;
      for (let i = week.length - 1; i >= 0; i--) {
        if (week[i].key >= e.startDate && week[i].key <= e.endDate) { endIdx = i; break; }
      }
      return { event: e, startIdx, endIdx, showTitle: e.startDate >= weekStart || startIdx === 0 };
    });
  };

  return (
    <div className="px-1 landscape:px-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="grid grid-cols-7 gap-0.5 pb-1 text-center text-[11px] font-semibold text-muted-foreground landscape:pb-0 landscape:text-[10px]">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="space-y-0.5">

        {weeks.map((week, wi) => {
          const segments = eventSegmentsForWeek(week);
          // stack up to 2 event rows
          const rows: (typeof segments)[] = [[], []];
          const usedByCell: (boolean[])[] = [new Array(7).fill(false), new Array(7).fill(false)];
          for (const seg of segments) {
            for (let r = 0; r < 2; r++) {
              let ok = true;
              for (let i = seg.startIdx; i <= seg.endIdx; i++) if (usedByCell[r][i]) { ok = false; break; }
              if (ok) {
                rows[r].push(seg);
                for (let i = seg.startIdx; i <= seg.endIdx; i++) usedByCell[r][i] = true;
                break;
              }
            }
          }
          const overflowByCell = new Array(7).fill(0);
          for (const seg of segments) {
            if (rows[0].includes(seg) || rows[1].includes(seg)) continue;
            for (let i = seg.startIdx; i <= seg.endIdx; i++) overflowByCell[i]++;
          }

          return (
            <div key={wi} className="grid grid-cols-7 gap-x-0.5 gap-y-0.5">
              {week.map(({ date, inMonth, key }, ci) => {
                const log = data.dayLogs[key];
                const takenToday = data.medLog[key] ?? {};
                const hasMed = Object.values(takenToday).some(Boolean) || !!log?.extraMeds?.length;
                const periodLevel = isMale ? undefined : (log?.periodInfo?.level ?? log?.period);
                const periodColor = isMale ? null : (periodColorVar(periodLevel) ?? (isActualPeriod(key) ? "var(--period-medium)" : null));
                const pAvg = avgDayPain(log);
                const isSel = key === selected;
                const predictedOrange = isPredicted(key);
                const icons = iconsFor(log, hasMed, isMale);
                const marked = hasAnyLog(log);

                return (
                  <button
                    key={ci}
                    onPointerDown={() => {
                      longFired.current = false;
                      clearLong();
                      longTimer.current = window.setTimeout(() => {
                        longFired.current = true;
                        if (navigator.vibrate) { try { navigator.vibrate(15); } catch { /* noop */ } }
                        setPeek(key);
                      }, 500);
                    }}
                    onPointerUp={() => { clearLong(); if (!longFired.current) onSelect(key); }}
                    onPointerLeave={clearLong}
                    onPointerCancel={clearLong}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`flex select-none flex-col items-stretch rounded-lg text-left transition ${
                      inMonth ? "" : "opacity-30"
                    } ${isSel ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="relative flex h-[58px] items-center justify-center pt-0.5 landscape:h-8 landscape:pt-0">
                      {pAvg != null && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute h-10 w-10 rounded-full"
                          style={{ boxShadow: `0 0 0 4.75px ${painColor(pAvg)}` }}
                        />
                      )}
                      {predictedOrange && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-2 rounded-full"
                          style={{ boxShadow: `0 0 0 2px var(--predicted)` }}
                        />
                      )}
                      <div
                        className="relative flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: periodColor ?? "transparent" }}
                      >
                        <span className={`text-sm ${periodColor ? "font-semibold text-white" : "text-foreground"}`}>
                          {date.getDate()}
                        </span>
                      </div>
                      {icons.length > 0 && (
                        <span className="pointer-events-none absolute bottom-0.5 left-1/2 flex -translate-x-1/2 items-center gap-[1px] text-[7px] leading-none drop-shadow-sm landscape:text-[6px]">
                          {icons.slice(0, 3).map((ic, idx) => <Ico key={idx} e={ic} size={15} />)}
                          {icons.length > 3 && (
                            <span className="text-[9px] font-medium text-muted-foreground">+{icons.length - 3}</span>
                          )}
                        </span>
                      )}
                      {icons.length === 0 && marked && (
                        <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary/70" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Event bar rows */}
              {rows.map((row, ri) => (
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
                             className={`h-3 truncate px-1 text-[8px] font-medium leading-3 text-primary-foreground ${
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
                      return <div key={ci} className="h-3" />;
                    })}
                  </div>
                ) : null
              ))}
              {overflowByCell.some((n) => n > 0) && (
                <div className="col-span-7 grid grid-cols-7 gap-0.5">
                  {overflowByCell.map((n, ci) => (
                    <div key={ci} className="h-[10px] text-center text-[8px] leading-[10px] text-muted-foreground">
                      {n > 0 ? `+${n}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {peek && (() => {
        const lines = daySummaryLines(data.dayLogs[peek], isMale);
        const d = new Date(`${peek}T00:00:00`);
        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setPeek(null)}>
            <div className="max-h-[70dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-background p-4 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
              <p className="mb-2 font-serif text-lg">{d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged on this day.</p>
              ) : (
                <ul className="space-y-1 text-sm">{lines.map((l, i) => <li key={i} className="whitespace-pre-line"><IcoText text={l} size={15} /></li>)}</ul>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => setPeek(null)} className="flex-1 rounded-2xl bg-tint py-2 text-sm">Close</button>
                <button onClick={() => { onSelect(peek); setPeek(null); }} className="flex-1 rounded-2xl bg-primary py-2 text-sm text-primary-foreground">Open day</button>
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
