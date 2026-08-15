import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Ico } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import {
  fromKey,
  isIntercourseKind,
  type BixboData,
} from "@/lib/storage";
import { daysBetweenInclusive } from "@/components/home/vitalTrends";

export type SukSukRange = {
  label: "Week" | "Month" | "Year";
  start: Date;
  end: Date;
  count: number;
};

type ViewMode = "week" | "month" | "year";
type ChartItem = { label: string; count: number };

export function startOfSelectedWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

export function countIntercourseBetween(data: BixboData, start: Date, end: Date): number {
  return daysBetweenInclusive(start, end).reduce(
    (total, key) =>
      total +
      (data.dayLogs[key]?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0),
    0,
  );
}

function compareValues(current: number, previous: number) {
  const diff = current - previous;
  return {
    diff,
    symbol: diff > 0 ? "↑" : diff < 0 ? "↓" : "—",
    value: diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff}`,
  };
}

function WeekBars({ items, accent, accentDark, muted }: {
  items: ChartItem[];
  accent: string;
  accentDark: string;
  muted: string;
}) {
  const maxValue = Math.max(3, ...items.map((item) => item.count));

  return (
    <div className="mt-5 grid grid-cols-[24px_minmax(0,1fr)] gap-2">
      <div className="relative h-[164px] text-[10px] tabular-nums text-muted-foreground">
        {[maxValue, Math.round((maxValue * 2) / 3), Math.round(maxValue / 3), 0].map((tick, index) => (
          <span
            key={`${tick}-${index}`}
            className="absolute right-0 -translate-y-1/2"
            style={{ top: `${index * 33.333}%` }}
          >
            {tick}
          </span>
        ))}
      </div>

      <div className="relative h-[190px] min-w-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[164px]">
          {[0, 1, 2, 3].map((line) => (
            <span
              key={line}
              className="absolute inset-x-0 border-t border-dashed border-border/55"
              style={{ top: `${line * 33.333}%` }}
            />
          ))}
        </div>

        <div className="relative grid h-[190px] grid-cols-7 gap-2">
          {items.map((item) => {
            const height = item.count > 0 ? Math.max(12, (item.count / maxValue) * 150) : 2;
            return (
              <div key={item.label} className="flex min-w-0 flex-col items-center justify-end">
                <span className="mb-1 text-[11px] font-semibold tabular-nums text-foreground">
                  {item.count}
                </span>
                <div className="flex h-[150px] w-full items-end justify-center">
                  <span
                    className="w-[72%] max-w-9 rounded-t-[9px] transition-[height] duration-200"
                    style={{
                      height: `${height}px`,
                      background:
                        item.count > 0
                          ? `linear-gradient(180deg, ${accent} 0%, ${accentDark} 100%)`
                          : muted,
                      opacity: item.count > 0 ? 1 : 0.45,
                      boxShadow: item.count > 0 ? `0 7px 15px -10px ${accentDark}` : "none",
                    }}
                  />
                </div>
                <span className="mt-2 text-[11px] font-medium text-muted-foreground">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthBars({ items, accent, accentDark, muted }: {
  items: ChartItem[];
  accent: string;
  accentDark: string;
  muted: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className="mt-5 space-y-3.5 px-1">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[48px_minmax(0,1fr)_24px] items-center gap-3">
          <span className="text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
            {item.label}
          </span>
          <div className="h-7 overflow-hidden rounded-lg bg-muted/35 ring-1 ring-border/35">
            <div
              className="h-full rounded-lg transition-[width] duration-200"
              style={{
                width: item.count > 0 ? `${Math.max(11, (item.count / maxValue) * 100)}%` : "0%",
                background: item.count > 0
                  ? `linear-gradient(90deg, ${accent} 0%, ${accentDark} 100%)`
                  : muted,
              }}
            />
          </div>
          <span className="text-[12px] font-bold tabular-nums text-foreground">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function YearLine({ items, accent, accentDark }: {
  items: ChartItem[];
  accent: string;
  accentDark: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.count));
  const width = 360;
  const height = 164;
  const left = 14;
  const right = 346;
  const top = 12;
  const bottom = 140;
  const plotHeight = bottom - top;
  const step = (right - left) / Math.max(1, items.length - 1);
  const points = items.map((item, index) => ({
    ...item,
    x: left + index * step,
    y: bottom - (item.count / maxValue) * plotHeight,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${left},${bottom} ${polyline} ${right},${bottom}`;

  return (
    <div className="mt-5">
      <div className="relative rounded-2xl bg-background/38 px-1 pt-2 ring-1 ring-border/35">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-[170px] w-full overflow-visible" aria-label="Year chart">
          {[0, 1, 2, 3].map((line) => {
            const y = top + (plotHeight / 3) * line;
            return (
              <line
                key={line}
                x1={left}
                x2={right}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-border/55"
                strokeDasharray="4 5"
                strokeWidth="1"
              />
            );
          })}
          <polygon points={area} fill={accent} opacity="0.10" />
          <polyline
            points={polyline}
            fill="none"
            stroke={accentDark}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="5" fill={accent} stroke="var(--card)" strokeWidth="2" />
            </g>
          ))}
        </svg>
        <div className="grid grid-cols-12 px-1 pb-2 text-center text-[9px] font-medium text-muted-foreground">
          {items.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}
        </div>
      </div>
    </div>
  );
}

export function SukSukPeriodChart({
  data,
  anchorKey,
  darkMode,
}: {
  data: BixboData;
  anchorKey: string;
  darkMode: boolean;
}) {
  const { t, language } = useI18n();
  const accent = darkMode ? "#B7C58C" : "#76953D";
  const accentDark = darkMode ? "#DDE7BE" : "#4F6928";
  const accentSoft = darkMode ? "#667048" : "#D9E5BB";
  const cardBg = darkMode ? "#555B3B" : "#FFFDF8";

  const [mode, setMode] = useState<ViewMode>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

  const anchor = useMemo(() => {
    const date = fromKey(anchorKey);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [anchorKey]);

  const selectedWeekAnchor = useMemo(() => {
    const date = new Date(anchor);
    date.setDate(date.getDate() + weekOffset * 7);
    return date;
  }, [anchor, weekOffset]);

  const selectedMonthAnchor = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1),
    [anchor, monthOffset],
  );
  const selectedYear = anchor.getFullYear() + yearOffset;

  const week = useMemo(() => {
    const start = startOfSelectedWeek(selectedWeekAnchor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 7);
    const previousEnd = new Date(end);
    previousEnd.setDate(previousEnd.getDate() - 7);
    const bars = daysBetweenInclusive(start, end).map((key, index) => ({
      label: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][index],
      count: data.dayLogs[key]?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0,
    }));
    return {
      start,
      end,
      count: bars.reduce((sum, item) => sum + item.count, 0),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [data, selectedWeekAnchor]);

  const month = useMemo(() => {
    const yearValue = selectedMonthAnchor.getFullYear();
    const monthIndex = selectedMonthAnchor.getMonth();
    const start = new Date(yearValue, monthIndex, 1);
    const end = new Date(yearValue, monthIndex + 1, 0);
    const previousStart = new Date(yearValue, monthIndex - 1, 1);
    const previousEnd = new Date(yearValue, monthIndex, 0);
    const daysInMonth = end.getDate();
    const bars = [
      [1, Math.min(7, daysInMonth)],
      [8, Math.min(14, daysInMonth)],
      [15, Math.min(21, daysInMonth)],
      [22, Math.min(28, daysInMonth)],
      [29, daysInMonth],
    ]
      .filter(([bucketStart]) => bucketStart <= daysInMonth)
      .map(([bucketStart, bucketEnd]) => ({
        label: bucketStart === 29 ? "29+" : `${bucketStart}–${bucketEnd}`,
        count: countIntercourseBetween(
          data,
          new Date(yearValue, monthIndex, bucketStart),
          new Date(yearValue, monthIndex, bucketEnd),
        ),
      }));
    return {
      start,
      end,
      count: countIntercourseBetween(data, start, end),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [data, selectedMonthAnchor]);

  const year = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    const previousStart = new Date(selectedYear - 1, 0, 1);
    const previousEnd = new Date(selectedYear - 1, 11, 31);
    const labels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    const bars = labels.map((label, monthIndex) => ({
      label,
      count: countIntercourseBetween(
        data,
        new Date(selectedYear, monthIndex, 1),
        new Date(selectedYear, monthIndex + 1, 0),
      ),
    }));
    return {
      start,
      end,
      count: countIntercourseBetween(data, start, end),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [data, selectedYear]);

  const active = mode === "week" ? week : mode === "month" ? month : year;
  const comparison = compareValues(active.count, active.previousCount);

  const locale = language === "sk" ? "sk-SK" : "en-GB";
  const periodLabel = mode === "week"
    ? `${week.start.toLocaleDateString(locale, { day: "numeric" })}–${week.end.toLocaleDateString(locale, { day: "numeric", month: "short" })}`
    : mode === "month"
      ? selectedMonthAnchor.toLocaleDateString(locale, { month: "long", year: "numeric" })
      : String(selectedYear);

  const movePeriod = (direction: -1 | 1) => {
    if (mode === "week") setWeekOffset((value) => value + direction);
    else if (mode === "month") setMonthOffset((value) => value + direction);
    else setYearOffset((value) => value + direction);
  };

  const resetPeriod = () => {
    if (mode === "week") setWeekOffset(0);
    else if (mode === "month") setMonthOffset(0);
    else setYearOffset(0);
  };

  const bestWeek = week.bars.reduce<ChartItem | null>((best, item) =>
    !best || item.count > best.count ? item : best, null);
  const bestMonth = month.bars.reduce<ChartItem | null>((best, item) =>
    !best || item.count > best.count ? item : best, null);
  const bestYearIndex = year.bars.reduce((bestIndex, item, index, arr) =>
    item.count > arr[bestIndex].count ? index : bestIndex, 0);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const insight = mode === "week"
    ? bestWeek && bestWeek.count > 0 ? `Best day: ${bestWeek.label}` : "No entries this week"
    : mode === "month"
      ? bestMonth && bestMonth.count > 0 ? `Most active: ${bestMonth.label}` : "No entries this month"
      : year.bars[bestYearIndex]?.count > 0 ? `Peak: ${monthNames[bestYearIndex]}` : "No entries this year";

  return (
    <section
      className="mt-4 overflow-hidden rounded-[28px] border border-border/70 p-4 pb-5 shadow-[0_14px_36px_-30px_rgba(52,68,28,.55)]"
      style={{ backgroundColor: cardBg }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border shadow-sm"
          style={{ backgroundColor: accentSoft, borderColor: accent }}
        >
          <Ico e="❤️" size={25} />
        </span>
        <h2 className="font-serif text-[26px] font-black leading-none tracking-[-0.025em] text-foreground">ŠukŠuk!</h2>
      </div>

      <div
        role="tablist"
        aria-label="ŠukŠuk period"
        className="mt-4 grid grid-cols-3 rounded-full border border-border/65 bg-muted/25 p-1"
      >
        {(["week", "month", "year"] as const).map((tab) => {
          const selected = mode === tab;
          const label = tab === "week" ? t("Week") : tab === "month" ? t("Month") : t("Year");
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(tab)}
              className="min-h-10 rounded-full px-3 text-[13px] font-bold transition-[background-color,color,box-shadow,transform] active:scale-[.98]"
              style={selected ? {
                background: `linear-gradient(180deg, ${accent} 0%, ${accentDark} 100%)`,
                color: darkMode ? "#273016" : "#FFFDF7",
                boxShadow: `0 7px 18px -12px ${accentDark}`,
              } : { color: "var(--muted-foreground)" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => movePeriod(-1)}
          className="grid h-8 w-8 place-items-center rounded-full bg-tint/55 text-foreground transition active:scale-95"
          aria-label="Previous period"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={resetPeriod}
          className="min-w-[116px] rounded-full px-3 py-1.5 text-center text-[11px] font-semibold tabular-nums text-muted-foreground transition active:scale-[.98]"
          title="Back to current period"
        >
          {periodLabel}
        </button>
        <button
          type="button"
          onClick={() => movePeriod(1)}
          className="grid h-8 w-8 place-items-center rounded-full bg-tint/55 text-foreground transition active:scale-95"
          aria-label="Next period"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="flex items-end gap-1.5 text-foreground">
            <span className="font-serif text-[48px] font-black leading-[.9] tabular-nums">{active.count}</span>
            <span className="pb-1 text-sm font-medium text-muted-foreground">{t("times")}</span>
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            vs last {mode}{" "}
            <span className="font-bold" style={{ color: comparison.diff === 0 ? "var(--muted-foreground)" : accentDark }}>
              {comparison.symbol} {comparison.value}
            </span>
          </p>
        </div>
      </div>

      {mode === "week" ? (
        <WeekBars items={week.bars} accent={accent} accentDark={accentDark} muted={accentSoft} />
      ) : mode === "month" ? (
        <MonthBars items={month.bars} accent={accent} accentDark={accentDark} muted={accentSoft} />
      ) : (
        <YearLine items={year.bars} accent={accent} accentDark={accentDark} />
      )}

      <div
        className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full border border-border/45 px-4 py-2.5 text-center"
        style={{ background: `color-mix(in srgb, ${accentSoft} 52%, transparent)` }}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: accentSoft }}>
          <Ico e="✨" size={18} />
        </span>
        <span className="text-[13px] font-bold text-foreground">{insight}</span>
      </div>
    </section>
  );
}
