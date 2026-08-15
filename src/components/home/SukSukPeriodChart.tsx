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

function PeriodBars({
  items,
  accent,
  accentDark,
  muted,
}: {
  items: ChartItem[];
  accent: string;
  accentDark: string;
  muted: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.count));
  const dense = items.length > 8;

  return (
    <div className="mt-2.5 px-1">
      <div
        className="grid h-[92px] items-end gap-1 border-b border-border/55"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => {
          const height = item.count > 0 ? Math.max(8, Math.round((item.count / maxValue) * 58)) : 2;
          return (
            <div key={`${item.label}-${index}`} className="flex h-full min-w-0 flex-col items-center justify-end">
              <span
                className={`${dense ? "text-[8px]" : "text-[10px]"} mb-1 font-semibold tabular-nums text-foreground`}
              >
                {item.count}
              </span>
              <span
                className={`${dense ? "max-w-[18px]" : "max-w-9"} w-[58%] rounded-t-[6px] transition-[height] duration-200`}
                style={{
                  height: `${height}px`,
                  background:
                    item.count > 0
                      ? `linear-gradient(180deg, ${accent} 0%, ${accentDark} 100%)`
                      : muted,
                  opacity: item.count > 0 ? 1 : 0.3,
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        className="mt-1.5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => (
          <span
            key={`label-${item.label}-${index}`}
            className={`${dense ? "text-[8px]" : "text-[10px]"} truncate text-center font-medium text-muted-foreground`}
          >
            {item.label}
          </span>
        ))}
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
  const cardBg = darkMode ? "var(--surface)" : "#FFFDF8";

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
  const weekdayNames: Record<string, string> = {
    Mo: "Monday",
    Tu: "Tuesday",
    We: "Wednesday",
    Th: "Thursday",
    Fr: "Friday",
    Sa: "Saturday",
    Su: "Sunday",
  };

  const insight = mode === "week"
    ? bestWeek && bestWeek.count > 0 ? `Best day: ${weekdayNames[bestWeek.label] ?? bestWeek.label}` : "No entries this week"
    : mode === "month"
      ? bestMonth && bestMonth.count > 0 ? `Most active: ${bestMonth.label}` : "No entries this month"
      : year.bars[bestYearIndex]?.count > 0 ? `Peak: ${monthNames[bestYearIndex]}` : "No entries this year";

  return (
    <section
      className="mt-4 overflow-hidden rounded-[26px] border border-border/70 px-3.5 py-3.5 shadow-[0_10px_28px_-26px_rgba(52,68,28,.45)]"
      style={{ backgroundColor: cardBg }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border"
            style={{ backgroundColor: accentSoft, borderColor: accent }}
          >
            <Ico e="❤️" size={21} />
          </span>
          <h2 className="truncate font-serif text-[22px] font-bold leading-none tracking-[-0.02em] text-foreground">
            ŠukŠuk!
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="ŠukŠuk period"
          className="grid min-w-0 grid-cols-3 rounded-full border border-border/65 bg-muted/20 p-0.5"
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
                className="min-h-8 rounded-full px-1.5 text-[11px] font-bold transition active:scale-[.98]"
                style={selected ? {
                  background: `linear-gradient(180deg, ${accent} 0%, ${accentDark} 100%)`,
                  color: darkMode ? "#273016" : "#FFFDF7",
                } : { color: "var(--muted-foreground)" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <div className="min-w-[86px]">
          <p className="flex items-end gap-1 text-foreground">
            <span className="font-serif text-[36px] font-black leading-[.9] tabular-nums">{active.count}</span>
            <span className="pb-0.5 text-[11px] font-medium text-muted-foreground">{t("times")}</span>
          </p>
          <p className="mt-1.5 whitespace-nowrap text-[10px] text-muted-foreground">
            vs last {mode}{" "}
            <span className="font-bold" style={{ color: comparison.diff === 0 ? "var(--muted-foreground)" : accentDark }}>
              {comparison.symbol}{comparison.value}
            </span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => movePeriod(-1)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tint/55 text-foreground transition active:scale-95"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetPeriod}
            className="min-w-0 rounded-full px-2 py-1 text-center text-[11px] font-semibold tabular-nums text-muted-foreground transition active:scale-[.98]"
            title="Back to current period"
          >
            {periodLabel}
          </button>
          <button
            type="button"
            onClick={() => movePeriod(1)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tint/55 text-foreground transition active:scale-95"
            aria-label="Next period"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <PeriodBars items={active.bars} accent={accent} accentDark={accentDark} muted={accentSoft} />

      <div className="mt-2.5 flex justify-center">
        <div
          className="inline-flex min-h-8 max-w-full items-center justify-center gap-1.5 rounded-full border border-border/45 px-3 py-1.5"
          style={{ background: `color-mix(in srgb, ${accentSoft} 42%, transparent)` }}
        >
          <Ico e="✨" size={14} />
          <span className="truncate text-[10px] font-semibold text-foreground">{insight}</span>
        </div>
      </div>
    </section>
  );
}
