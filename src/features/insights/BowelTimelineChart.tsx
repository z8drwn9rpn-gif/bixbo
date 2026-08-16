import { useEffect, useMemo, useState } from "react";

import { CHART_GRID, useDismissTapTooltip } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { BRISTOL, fromKey, type DayLog } from "@/lib/storage";
import {
  InsightFloatingTooltip,
  InsightPeriodControl,
  fmtCoupleTooltipDay,
  type InsightTooltipDetails,
  type Period,
} from "./shared";

type BowelTimelinePoint = {
  id: string;
  dayIndex: number;
  key: string;
  time: string;
  type: number;
  color: string;
  description: string;
};

function timeFraction(value?: string): number {
  if (!value) return 0.5;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return 0.5;
  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  return (hours * 60 + minutes) / 1440;
}

function pointColor(type: number): string {
  if (type === 0) return "#8B5CF6";
  return BRISTOL.find((item) => item.n === type)?.color ?? "#70A65B";
}

export function BowelTimelineChart({
  days,
  dayLogs,
  period,
  anchor,
  noBowelMovementCount,
  onPeriodChange,
  onPeriodShift,
}: {
  days: string[];
  dayLogs: Record<string, DayLog>;
  period: Period;
  anchor: Date;
  noBowelMovementCount: number;
  onPeriodChange: (period: Period) => void;
  onPeriodShift: (delta: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  useEffect(() => setActive(null), [anchor, period]);

  const points = useMemo<BowelTimelinePoint[]>(() => {
    const result: BowelTimelinePoint[] = [];
    days.forEach((key, dayIndex) => {
      const valid = (dayLogs[key]?.bowel ?? [])
        .filter((entry) => !entry.urinaryOnly && Number.isInteger(Number(entry.bristol)) && Number(entry.bristol) >= 0 && Number(entry.bristol) <= 7)
        .slice()
        .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
      valid.forEach((entry, entryIndex) => {
        const type = Number(entry.bristol);
        const bristol = BRISTOL.find((item) => item.n === type);
        result.push({
          id: `${key}:${entry.id ?? entryIndex}`,
          dayIndex,
          key,
          time: entry.time ?? "",
          type,
          color: pointColor(type),
          description: type === 0 ? "Unknown / mixed" : bristol?.sub ?? `Bristol Type ${type}`,
        });
      });
    });
    return result;
  }, [dayLogs, days]);

  const width = 640;
  const height = 205;
  const left = 34;
  const right = 12;
  const top = 18;
  const bottom = 42;
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;
  const x = (point: BowelTimelinePoint) => {
    const fraction = days.length <= 1 ? 0.5 : (point.dayIndex + timeFraction(point.time)) / days.length;
    return left + Math.max(0, Math.min(1, fraction)) * usableWidth;
  };
  const y = (type: number) => top + ((7 - type) / 7) * usableHeight;
  const tickEvery = period === "W" ? 1 : period === "M" ? Math.max(1, Math.ceil(days.length / 7)) : Math.max(1, Math.ceil(days.length / 12));
  const activePoint = active != null ? points[active] : undefined;
  const activeDetails: InsightTooltipDetails | null = activePoint ? {
    owner: "You",
    heading: fmtCoupleTooltipDay(activePoint.key),
    value: `Bowel · Type ${activePoint.type}`,
    description: activePoint.time ? `${activePoint.time} · ${activePoint.description}` : activePoint.description,
    color: activePoint.color,
    summary: `${activePoint.key} · Bowel Type ${activePoint.type} · ${activePoint.description}`,
  } : null;

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Bowel trend")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("Every logged bowel entry by day")}</p>
        </div>
        <InsightPeriodControl value={period} onChange={onPeriodChange} anchor={anchor} onShift={onPeriodShift} ariaLabel="Bowel trend period" />
      </div>

      <div className="relative mt-3 overflow-hidden rounded-2xl bg-background/55 px-2 py-2 ring-1 ring-border/40">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full overflow-visible" aria-label={t("Bowel trend chart")}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((type) => (
            <g key={type}>
              <line x1={left} x2={width - right} y1={y(type)} y2={y(type)} stroke={CHART_GRID} strokeDasharray="3 4" />
              <text x={left - 7} y={y(type) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">T{type}</text>
            </g>
          ))}
          {days.map((key, index) => (index % tickEvery === 0 || index === days.length - 1) ? (
            <text key={key} x={left + ((index + 0.5) / Math.max(1, days.length)) * usableWidth} y={height - 12} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
              {period === "Y" ? fromKey(key).toLocaleDateString("en-GB", { month: "short" }) : fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: period === "W" ? "short" : undefined })}
            </text>
          ) : null)}
          {points.length > 1 ? <polyline points={points.map((point) => `${x(point)},${y(point.type)}`).join(" ")} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" /> : null}
          {points.map((point, index) => (
            <circle
              key={point.id}
              cx={x(point)}
              cy={y(point.type)}
              r={active === index ? 5.2 : 4}
              fill={point.color}
              stroke="var(--surface)"
              strokeWidth="2"
              role="button"
              tabIndex={0}
              aria-label={`${point.key}. Bowel Type ${point.type}. ${point.description}`}
              onClick={(event) => { event.stopPropagation(); setActive((current) => current === index ? null : index); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActive((current) => current === index ? null : index);
                }
              }}
              className="cursor-pointer outline-none focus-visible:stroke-foreground"
            />
          ))}
        </svg>
        {activeDetails && activePoint ? <InsightFloatingTooltip leftPct={(x(activePoint) / width) * 100} details={activeDetails} top={4} /> : null}
        {!points.length ? <p className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">{t("No bowel entries in this period")}</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <span>{points.length} {points.length === 1 ? t("entry") : t("entries")}</span>
        <span>{t("No bowel movements")}: <b className="tabular-nums text-foreground">{noBowelMovementCount}</b></span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{t("Type 0 is a logged bowel value. No bowel movement is counted separately and is not plotted as a Bristol type.")}</p>
    </section>
  );
}
