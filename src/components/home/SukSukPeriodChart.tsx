import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboExtraIcons";

import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";
import {
  BlueberryIcon,
  ClockIcon,
  FlameIcon,
  HeartIcon,
  Ico,
  IcoText,
  NoteIcon,
  PanicIcon,
  PillIcon,
  PoopIcon,
  StarIcon,
} from "@/components/icons/BixboExtraIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  avgDayPain,
  latestDayWeight,
  averageDayTemperature,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  isIntercourseKind,
  type BixboData,
  type BowelEntry,
  type SexEntry,
} from "@/lib/storage";
import { daysBetweenInclusive } from "@/components/home/vitalTrends";

/* ------------------- Day preview ------------------- */

export type SukSukRange = {
  label: "Week" | "Month" | "Year";
  start: Date;
  end: Date;
  count: number;
};

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
  const HAK_PURPLE = darkMode ? "#B6C28E" : "#647A32";
  const HAK_PURPLE_DARK = darkMode ? "#D9E3BA" : "#455A20";
  const HAK_PURPLE_SOFT = darkMode ? "#626944" : "#C5D1A0";
  const HAK_CARD_BG = darkMode
    ? "color-mix(in srgb, var(--surface) 90%, #77805A 10%)"
    : "color-mix(in srgb, var(--background) 90%, #536A27 10%)";

  const anchor = useMemo(() => {
    const date = fromKey(anchorKey);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [anchorKey]);

  // Week / Month / Year can each be browsed independently.
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

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
    previousStart.setDate(start.getDate() - 7);
    const previousEnd = new Date(end);
    previousEnd.setDate(end.getDate() - 7);

    const daily = daysBetweenInclusive(start, end).map((key, index) => ({
      label: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][index],
      count: data.dayLogs[key]?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0,
    }));

    return {
      start,
      end,
      count: daily.reduce((sum, item) => sum + item.count, 0),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars: daily,
    };
  }, [selectedWeekAnchor, data]);

  const month = useMemo(() => {
    const year = selectedMonthAnchor.getFullYear();
    const monthIndex = selectedMonthAnchor.getMonth();
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);

    const previousStart = new Date(year, monthIndex - 1, 1);
    const previousEnd = new Date(year, monthIndex, 0);

    const daysInMonth = end.getDate();
    const bars = [
      [1, Math.min(7, daysInMonth)],
      [8, Math.min(14, daysInMonth)],
      [15, Math.min(21, daysInMonth)],
      [22, Math.min(28, daysInMonth)],
      [29, daysInMonth],
    ]
      .filter(([bucketStart]) => bucketStart <= daysInMonth)
      .map(([bucketStart, bucketEnd]) => {
        const bucketStartDate = new Date(year, monthIndex, bucketStart);
        const bucketEndDate = new Date(year, monthIndex, bucketEnd);

        return {
          label: bucketStart === 29 ? "29+" : `${bucketStart}–${bucketEnd}`,
          count: countIntercourseBetween(data, bucketStartDate, bucketEndDate),
        };
      });

    return {
      start,
      end,
      count: countIntercourseBetween(data, start, end),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [selectedMonthAnchor, data]);

  const year = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);

    const previousStart = new Date(selectedYear - 1, 0, 1);
    const previousEnd = new Date(selectedYear - 1, 11, 31);

    const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    const bars = monthLabels.map((label, monthIndex) => {
      const monthStart = new Date(selectedYear, monthIndex, 1);
      const monthEnd = new Date(selectedYear, monthIndex + 1, 0);

      return {
        label,
        count: countIntercourseBetween(data, monthStart, monthEnd),
      };
    });

    return {
      start,
      end,
      count: countIntercourseBetween(data, start, end),
      previousCount: countIntercourseBetween(data, previousStart, previousEnd),
      bars,
    };
  }, [selectedYear, data]);

  const comparison = (current: number, previous: number, label: string) => {
    const diff = current - previous;
    const symbol = diff > 0 ? "↑" : diff < 0 ? "↓" : "—";
    const value = diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff}`;

    return (
      <p className="mt-2 flex h-4 items-center justify-center gap-1 whitespace-nowrap text-center text-[10px] leading-none text-muted-foreground">
        vs last {label}{" "}
        <span
          className="font-bold"
          style={{ color: diff === 0 ? "var(--muted-foreground)" : HAK_PURPLE_DARK }}
        >
          {symbol}{value}
        </span>
      </p>
    );
  };

  const MiniBars = ({
    items,
    dense = false,
  }: {
    items: { label: string; count: number }[];
    dense?: boolean;
  }) => {
    const max = Math.max(1, ...items.map((item) => item.count));

    return (
      <div
        className="mt-3 grid h-[96px] items-end gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => {
          const height = item.count > 0 ? Math.max(7, Math.round((item.count / max) * 68)) : 1;

          return (
            <div key={`${item.label}-${index}`} className="flex min-w-0 flex-col items-center justify-end">
              <span
                className={`${dense ? "text-[6px]" : "text-[10px]"} mb-1 h-3 tabular-nums font-medium text-foreground/80`}
                title={`${item.label}: ${item.count}`}
                aria-label={`${item.label}: ${item.count}`}
              >
                {dense ? (item.count > 0 ? "•" : "") : item.count}
              </span>
              <div className="flex h-[68px] w-full items-end justify-center border-b border-border/65">
                <span
                  className={`${dense ? "w-[64%]" : "w-[84%]"} rounded-t-[4px]`}
                  style={{
                    height: `${height}px`,
                    background:
                      item.count > 0
                        ? `linear-gradient(180deg, ${HAK_PURPLE} 0%, ${HAK_PURPLE_DARK} 100%)`
                        : HAK_PURPLE_SOFT,
                    opacity: item.count > 0 ? 1 : 0.35,
                  }}
                />
              </div>
              <span
                className={`${dense ? "text-[6px]" : "text-[10px]"} mt-1.5 truncate font-medium text-muted-foreground`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section
      className="mt-4 rounded-3xl p-4 pb-5 ring-1 ring-border"
      style={{ backgroundColor: HAK_CARD_BG }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1"
          style={{
            backgroundColor: HAK_PURPLE_SOFT,
            color: HAK_PURPLE_DARK,
            borderColor: `${HAK_PURPLE}33`,
          }}
        >
          <Ico e="❤️" size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-semibold leading-none text-foreground">ŠukŠuk!</h2>
        </div>
      </div>

      <div className="mt-3 border-t border-border/55 pt-3">
        <div className="grid grid-cols-3 divide-x divide-border/55">
          <div className="flex min-w-0 flex-col px-1.5">
            <p className="text-center text-[11px] font-bold text-foreground">{t("Week")}</p>
            <div className="mt-0.5 flex h-5 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => setWeekOffset((value) => value - 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Previous week")}
                title={t("Previous week")}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="min-w-0 truncate rounded-md px-0.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Back to current week")}
                title={weekOffset === 0 ? t("Current week") : t("Back to current week")}
              >
                {week.start.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric" })}–{week.end.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </button>

              <button
                type="button"
                onClick={() => setWeekOffset((value) => value + 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Next week")}
                title={t("Next week")}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 flex h-7 items-end justify-center text-center font-serif text-2xl font-bold leading-none text-foreground">
              {week.count}
              <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">{t("times")}</span>
            </p>
            {comparison(week.count, week.previousCount, "week")}
            <MiniBars items={week.bars} />
          </div>

          <div className="flex min-w-0 flex-col px-1.5">
            <p className="text-center text-[11px] font-bold text-foreground">{t("Month")}</p>
            <div className="mt-0.5 flex h-5 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => setMonthOffset((value) => value - 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Previous month")}
                title={t("Previous month")}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setMonthOffset(0)}
                className="min-w-0 truncate rounded-md px-0.5 py-0.5 text-center text-[10px] text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Back to current month")}
                title={monthOffset === 0 ? t("Current month") : t("Back to current month")}
              >
                {selectedMonthAnchor.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </button>

              <button
                type="button"
                onClick={() => setMonthOffset((value) => value + 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Next month")}
                title={t("Next month")}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 flex h-7 items-end justify-center text-center font-serif text-2xl font-bold leading-none text-foreground">
              {month.count}
              <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">{t("times")}</span>
            </p>
            {comparison(month.count, month.previousCount, "month")}
            <MiniBars items={month.bars} />
          </div>

          <div className="flex min-w-0 flex-col px-1.5">
            <p className="text-center text-[11px] font-bold text-foreground">{t("Year")}</p>
            <div className="mt-0.5 flex h-5 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => setYearOffset((value) => value - 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Previous year")}
                title={t("Previous year")}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => setYearOffset(0)}
                className="min-w-0 rounded-md px-1 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Back to current year")}
                title={yearOffset === 0 ? t("Current year") : t("Back to current year")}
              >
                {selectedYear}
              </button>

              <button
                type="button"
                onClick={() => setYearOffset((value) => value + 1)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground"
                aria-label={t("Next year")}
                title={t("Next year")}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1 flex h-7 items-end justify-center text-center font-serif text-2xl font-bold leading-none text-foreground">
              {year.count}
              <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">{t("times")}</span>
            </p>
            {comparison(year.count, year.previousCount, "year")}
            <MiniBars items={year.bars} dense />
          </div>
        </div>
      </div>
    </section>
  );
}

export type ScheduledDoseTarget = {
  key: string;
  med: BixboData["meds"][number];
  time: string;
};

