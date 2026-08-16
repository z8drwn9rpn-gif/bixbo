import { useEffect, useMemo, useState } from "react";

import { useDismissTapTooltip } from "@/components/charts";
import { useI18n } from "@/hooks/useI18n";
import { BRISTOL, fromKey, type DayLog } from "@/lib/storage";
import {
  BRISTOL_MYSTERY_COLOR,
  InsightFloatingTooltip,
  InsightPeriodControl,
  type InsightTooltipDetails,
  type Period,
} from "./shared";

type BowelTypeMeta = {
  type: number;
  count: number;
  color: string;
  tooltipColor: string;
  description: string;
};

type LatestBowelEntry = {
  id: string;
  key: string;
  time: string;
  type: number;
  color: string;
  description: string;
};

function BowelOutlineIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path
        d="M15 7c-5 0-8 3-8 8 0 3 1 5 4 7-3 2-4 5-4 8 0 5 4 9 9 9h3v3c0 2 2 4 5 4s5-2 5-4v-3h3c5 0 9-4 9-9 0-3-1-6-4-8 3-2 4-4 4-7 0-5-3-8-8-8-4 0-6 2-9 5-3-3-5-5-9-5Z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 15c3 0 5 2 5 5s-2 5-5 5h-2c-2 0-3 1-3 3s1 3 3 3h5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M33 15c-3 0-5 2-5 5s2 5 5 5h2c2 0 3 1 3 3s-1 3-3 3h-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 20h8M18 31h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.4" r="1" fill="currentColor" />
    </svg>
  );
}

function SummaryIcon({ kind }: { kind: "entries" | "common" | "none" }) {
  if (kind === "common") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "none") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7 17 10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function barColor(type: number): string {
  if (type === 0) return BRISTOL_MYSTERY_COLOR;
  return BRISTOL.find((item) => item.n === type)?.color ?? "#70A65B";
}

function tooltipColor(type: number): string {
  if (type === 0) return "#8B5CF6";
  return BRISTOL.find((item) => item.n === type)?.color ?? "#70A65B";
}

function typeDescription(type: number): string {
  if (type === 0) return "Unknown / mixed";
  return BRISTOL.find((item) => item.n === type)?.sub ?? `Bristol Type ${type}`;
}

export function BowelOverviewCard({
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
  const [activeType, setActiveType] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useDismissTapTooltip(() => setActiveType(null));
  useEffect(() => {
    setActiveType(null);
    setFilterType(null);
    setShowAll(false);
  }, [anchor, period]);

  const entries = useMemo<LatestBowelEntry[]>(() => {
    const result: LatestBowelEntry[] = [];
    days.forEach((key) => {
      (dayLogs[key]?.bowel ?? [])
        .filter((entry) => !entry.urinaryOnly && Number.isInteger(Number(entry.bristol)) && Number(entry.bristol) >= 0 && Number(entry.bristol) <= 7)
        .forEach((entry, index) => {
          const type = Number(entry.bristol);
          result.push({
            id: `${key}:${entry.id ?? index}`,
            key,
            time: entry.time ?? "",
            type,
            color: tooltipColor(type),
            description: typeDescription(type),
          });
        });
    });
    return result.sort((a, b) => b.key.localeCompare(a.key) || b.time.localeCompare(a.time));
  }, [dayLogs, days]);

  const typeMeta = useMemo<BowelTypeMeta[]>(() => {
    const counts = new Array(8).fill(0) as number[];
    entries.forEach((entry) => { counts[entry.type] += 1; });
    return counts.map((count, type) => ({
      type,
      count,
      color: barColor(type),
      tooltipColor: tooltipColor(type),
      description: typeDescription(type),
    }));
  }, [entries]);

  const totalEntries = entries.length;
  const maxCount = Math.max(1, ...typeMeta.map((item) => item.count));
  const loggedTypes = typeMeta.filter((item) => item.count > 0);
  const mostCommon = loggedTypes.reduce<BowelTypeMeta | null>((best, item) => (!best || item.count > best.count ? item : best), null);
  const minType = loggedTypes.length ? loggedTypes[0].type : null;
  const maxType = loggedTypes.length ? loggedTypes[loggedTypes.length - 1].type : null;
  const periodWord = period === "W" ? t("week") : period === "M" ? t("month") : t("year");
  const filteredEntries = filterType == null ? entries : entries.filter((entry) => entry.type === filterType);
  const visibleEntries = showAll ? filteredEntries.slice(0, 8) : filteredEntries.slice(0, 2);
  const activeMeta = activeType == null ? null : typeMeta[activeType];
  const activeDetails: InsightTooltipDetails | null = activeMeta ? {
    owner: "You",
    heading: `Bristol Type ${activeMeta.type}`,
    value: `${activeMeta.count} ${activeMeta.count === 1 ? "entry" : "entries"}`,
    description: activeMeta.description,
    color: activeMeta.tooltipColor,
    summary: `Bristol Type ${activeMeta.type} · ${activeMeta.count} ${activeMeta.count === 1 ? "entry" : "entries"} · ${activeMeta.description}`,
  } : null;

  return (
    <section data-bowel-overview-card="true" className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <BowelOutlineIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-tight text-foreground">{t("Bowel")}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("Distribution of logged bowel types")}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("About this chart")}
          aria-expanded={showInfo}
          onClick={() => setShowInfo((value) => !value)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <InfoIcon />
        </button>
      </div>

      <div className="mt-4">
        <InsightPeriodControl
          value={period}
          onChange={onPeriodChange}
          anchor={anchor}
          onShift={onPeriodShift}
          ariaLabel="Bowel period"
        />
      </div>

      {showInfo ? (
        <div className="mt-3 rounded-2xl bg-tint/55 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground ring-1 ring-border/50">
          {t("The bars show how many times each Bristol type was logged in the selected period. Type 0 is a logged unknown or mixed bowel value; no bowel movement is counted separately.")}
        </div>
      ) : null}

      <div className="relative mt-5">
        <div className="grid h-[190px] grid-cols-8 items-end gap-2 border-b border-border/70 px-1 pb-0">
          {typeMeta.map((item) => {
            const pct = totalEntries ? Math.round((item.count / totalEntries) * 100) : 0;
            const selected = activeType === item.type;
            const height = item.count ? Math.max(18, (item.count / maxCount) * 132) : 5;
            return (
              <div key={item.type} className="flex h-full min-w-0 flex-col items-center justify-end">
                <span className="mb-1.5 whitespace-nowrap rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-foreground ring-1 ring-border/70">
                  {item.count} ({pct}%)
                </span>
                {item.count ? (
                  <button
                    type="button"
                    aria-label={`Bristol Type ${item.type}. ${item.count} ${item.count === 1 ? "entry" : "entries"}. ${item.description}`}
                    aria-pressed={selected}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveType((current) => current === item.type ? null : item.type);
                    }}
                    className={`w-full max-w-[42px] rounded-t-[7px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "ring-2 ring-foreground/75" : ""}`}
                    style={{ height, background: item.color }}
                  />
                ) : (
                  <div className="w-full max-w-[42px] rounded-t-full" style={{ height, background: item.color }} />
                )}
                <span className="mt-2 text-[11px] font-semibold tabular-nums" style={{ color: item.tooltipColor }}>T{item.type}</span>
                <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{item.count}</span>
              </div>
            );
          })}
        </div>
        {activeDetails && activeType != null ? (
          <InsightFloatingTooltip leftPct={((activeType + 0.5) / 8) * 100} details={activeDetails} top={-6} />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border/70 rounded-2xl bg-background/55 py-3 ring-1 ring-border/50">
        <div className="flex min-w-0 items-center gap-2 px-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><SummaryIcon kind="entries" /></span>
          <div className="min-w-0"><p className="text-sm font-bold tabular-nums text-foreground">{totalEntries} {totalEntries === 1 ? t("entry") : t("entries")}</p><p className="text-[10px] text-muted-foreground">this {periodWord}</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-2 px-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><SummaryIcon kind="common" /></span>
          <div className="min-w-0"><p className="text-[10px] text-muted-foreground">{t("Most common")}</p><p className="truncate text-sm font-bold text-foreground">{mostCommon ? `Type ${mostCommon.type}` : "—"}</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-2 px-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><SummaryIcon kind="none" /></span>
          <div className="min-w-0"><p className="text-[10px] leading-tight text-muted-foreground">{t("No bowel movements")}</p><p className="text-sm font-bold tabular-nums text-foreground">{noBowelMovementCount} {noBowelMovementCount === 1 ? t("day") : t("days")}</p></div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-primary/[0.07] px-4 py-3 ring-1 ring-primary/10">
        <div className="flex items-center gap-2 text-primary">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10"><SummaryIcon kind="common" /></span>
          <p className="text-sm font-bold">{t("Quick insights")}</p>
        </div>
        <div className="mt-2 space-y-1.5 pl-1 text-xs text-foreground">
          <p>✓ {minType != null && maxType != null ? `${t("Typical range this period")}: T${minType} – T${maxType}` : t("No bowel entries in this period")}</p>
          <p>✓ {mostCommon ? `${t("Your most frequent type was")} T${mostCommon.type}.` : t("Log a bowel entry to see your most frequent type.")}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={t("Filter bowel entries by Bristol type")}>
        <button
          type="button"
          onClick={() => setFilterType(null)}
          aria-pressed={filterType == null}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${filterType == null ? "bg-primary text-primary-foreground shadow-sm" : "bg-tint text-muted-foreground hover:text-foreground"}`}
        >
          {t("All")}
        </button>
        {typeMeta.map((item) => {
          const selected = filterType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setFilterType((current) => current === item.type ? null : item.type)}
              aria-pressed={selected}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                color: item.tooltipColor,
                background: selected
                  ? `color-mix(in srgb, ${item.tooltipColor} 22%, var(--surface))`
                  : `color-mix(in srgb, ${item.tooltipColor} 10%, var(--surface))`,
                boxShadow: selected ? `inset 0 0 0 1.5px ${item.tooltipColor}` : "inset 0 0 0 1px var(--border)",
              }}
            >
              T{item.type}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-foreground">{t("Latest entries")}</h4>
          {filteredEntries.length > 2 ? (
            <button type="button" onClick={() => setShowAll((value) => !value)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              {showAll ? t("Show less") : t("See all")} <span aria-hidden="true">›</span>
            </button>
          ) : null}
        </div>

        <div className="mt-2 overflow-hidden rounded-2xl bg-background/45 ring-1 ring-border/60">
          {visibleEntries.length ? visibleEntries.map((entry, index) => (
            <div key={entry.id} className={`flex items-center gap-3 px-3.5 py-3 ${index ? "border-t border-border/60" : ""}`}>
              <div className="w-[54px] shrink-0">
                <p className="text-xs font-bold tabular-nums text-foreground">{fromKey(entry.key).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{entry.time || "—"}</p>
              </div>
              <span
                className="grid h-7 min-w-11 shrink-0 place-items-center rounded-full px-2 text-xs font-bold"
                style={{ color: entry.color, background: `color-mix(in srgb, ${entry.color} 12%, var(--surface))` }}
              >
                T{entry.type}
              </span>
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{entry.description}</p>
              <span className="text-lg leading-none text-muted-foreground" aria-hidden="true">›</span>
            </div>
          )) : (
            <p className="px-4 py-5 text-center text-xs text-muted-foreground">{t("No bowel entries in this period")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
