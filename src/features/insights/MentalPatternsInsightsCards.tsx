import { useMemo, useState } from "react";
import { BrainIcon } from "@/components/icons/BixboBrandIcons";
import { useI18n } from "@/hooks/useI18n";
import { fromKey, todayKey, type BixboData, type DayLog } from "@/lib/storage";
import { DashboardPeriodControl, MetricCards, QuickInsights } from "./InsightDashboardPrimitives";
import { eachDay, rangeFor, shiftInsightPeriodAnchor, vividPainChartColor, type Period } from "./shared";

type MentalWellbeingEntry = {
  id: string;
  time?: string;
  distress: number;
  states?: string[];
  factors?: string[];
  note?: string;
};

type MentalDayLog = DayLog & { mentalWellbeing?: MentalWellbeingEntry[] };
type MentalPoint = { key: string; value: number; entry: MentalWellbeingEntry };
type ChoiceStat = {
  raw: string;
  label: string;
  count: number;
  average: number;
  highest: number;
};

function initialAnchor() {
  const date = fromKey(todayKey());
  date.setHours(0, 0, 0, 0);
  return date;
}

function entriesForDay(day: DayLog | undefined): MentalWellbeingEntry[] {
  const entries = (day as MentalDayLog | undefined)?.mentalWellbeing ?? [];
  return entries.filter((entry) => Number.isFinite(entry.distress) && entry.distress >= 0 && entry.distress <= 10);
}

function cleanChoiceLabel(value: string) {
  return value.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "").trim();
}

function pointsFor(data: BixboData, period: Period, anchor: Date): MentalPoint[] {
  const { startK, endK } = rangeFor(period, anchor);
  return eachDay(startK, endK).flatMap((key) =>
    entriesForDay(data.dayLogs[key]).map((entry) => ({ key, value: entry.distress, entry })),
  );
}

function choiceStats(points: MentalPoint[], field: "states" | "factors"): ChoiceStat[] {
  const values = new Map<string, number[]>();
  points.forEach(({ entry }) => {
    (entry[field] ?? []).forEach((choice) => {
      const current = values.get(choice) ?? [];
      current.push(entry.distress);
      values.set(choice, current);
    });
  });
  return Array.from(values.entries()).map(([raw, distressValues]) => ({
    raw,
    label: cleanChoiceLabel(raw),
    count: distressValues.length,
    average: distressValues.reduce((sum, value) => sum + value, 0) / distressValues.length,
    highest: Math.max(...distressValues),
  }));
}

function mentalCardHeader(title: string, subtitle: string) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/55 ring-1 ring-border/50">
        <BrainIcon size={30} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontWeight: 700 }}>{title}</p>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function MentalStatesInsightsCard({ data }: { data: BixboData }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("M");
  const [anchor, setAnchor] = useState<Date>(initialAnchor);
  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);

  const points = useMemo(() => pointsFor(data, period, anchor), [anchor, data, period]);
  const stats = useMemo(
    () => choiceStats(points, "states").sort((a, b) => b.count - a.count || b.average - a.average).slice(0, 9),
    [points],
  );
  const selected = stats.find((item) => item.raw === selectedRaw) ?? stats[0] ?? null;
  const maxCount = Math.max(1, ...stats.map((item) => item.count));
  const highAverage = [...stats].filter((item) => item.count >= 2).sort((a, b) => b.average - a.average)[0] ?? stats[0] ?? null;
  const share = selected && points.length ? Math.round((selected.count / points.length) * 100) : null;

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80" data-bixbo-mental-states-card="true">
      {mentalCardHeader(t("Mental states"), "Top states by number of entries")}
      <DashboardPeriodControl
        value={period}
        onChange={setPeriod}
        anchor={anchor}
        onShift={(delta) => setAnchor((current) => shiftInsightPeriodAnchor(current, period, delta))}
        ariaLabel="Mental states period"
      />

      <div className="mt-3 rounded-2xl bg-background/45 px-3 py-3 ring-1 ring-border/45">
        {stats.length ? (
          <div className="space-y-2.5">
            {stats.map((item, index) => {
              const isSelected = selected?.raw === item.raw;
              return (
                <button
                  key={item.raw}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRaw(item.raw)}
                  className="grid w-full grid-cols-[18px_minmax(86px,118px)_minmax(0,1fr)_24px] items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-[9px] tabular-nums text-muted-foreground">{index + 1}</span>
                  <span className="truncate text-[10px] font-medium text-foreground">{item.label}</span>
                  <span className="relative h-4 overflow-visible rounded-md bg-tint/45">
                    <span
                      data-bixbo-chart-mark="bar"
                      data-bixbo-chart-direction="horizontal"
                      className="absolute inset-y-0 left-0 min-w-[6px]"
                      style={{ width: `${Math.max(4, (item.count / maxCount) * 100)}%`, background: "var(--primary)" }}
                    />
                  </span>
                  <span className="text-right text-[10px] font-semibold tabular-nums text-foreground">{item.count}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[150px] place-items-center text-center text-xs text-muted-foreground">No mental states logged in this period.</div>
        )}
        <div className="mt-3 flex justify-between pl-[136px] text-[9px] tabular-nums text-muted-foreground">
          <span>0</span><span>{Math.ceil(maxCount / 2)}</span><span>{maxCount}</span>
        </div>
      </div>

      {selected ? (
        <div className="mt-3 rounded-2xl bg-tint/30 px-3 py-3 ring-1 ring-border/55">
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground" style={{ fontWeight: 700 }}>About {selected.label}</div>
          <MetricCards items={[
            { label: "Entries", value: selected.count, sub: share != null ? `${share}% of logs` : undefined, color: "var(--primary)" },
            { label: "Avg distress", value: `${selected.average.toFixed(1)}/10`, color: vividPainChartColor(selected.average) },
            { label: "Highest", value: `${selected.highest.toFixed(selected.highest % 1 ? 1 : 0)}/10`, color: vividPainChartColor(selected.highest) },
          ]} />
        </div>
      ) : null}

      <QuickInsights items={[
        {
          kind: "star",
          color: "var(--primary)",
          text: stats[0] ? `Most common state: ${stats[0].label} (${stats[0].count} ${stats[0].count === 1 ? "entry" : "entries"})` : "No state pattern yet",
        },
        {
          kind: "trend",
          color: highAverage ? vividPainChartColor(highAverage.average) : "var(--primary)",
          text: highAverage ? `Highest average distress: ${highAverage.label} (${highAverage.average.toFixed(1)}/10)` : "More logs will reveal which states coincide with higher distress",
        },
      ]} />
    </section>
  );
}

export function DistressByFactorInsightsCard({ data }: { data: BixboData }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("M");
  const [anchor, setAnchor] = useState<Date>(initialAnchor);
  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);

  const points = useMemo(() => pointsFor(data, period, anchor), [anchor, data, period]);
  const stats = useMemo(
    () => choiceStats(points, "factors").sort((a, b) => b.average - a.average || b.count - a.count).slice(0, 8),
    [points],
  );
  const selected = stats.find((item) => item.raw === selectedRaw) ?? stats[0] ?? null;
  const mostLogged = [...stats].sort((a, b) => b.count - a.count)[0] ?? null;
  const stableTop = stats.find((item) => item.count >= 2) ?? stats[0] ?? null;

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80" data-bixbo-distress-factor-card="true">
      {mentalCardHeader(t("Distress by factor"), "Average mental distress when each factor was present")}
      <DashboardPeriodControl
        value={period}
        onChange={setPeriod}
        anchor={anchor}
        onShift={(delta) => setAnchor((current) => shiftInsightPeriodAnchor(current, period, delta))}
        ariaLabel="Distress by factor period"
      />

      <div className="mt-3 rounded-2xl bg-background/45 px-3 py-3 ring-1 ring-border/45">
        {stats.length ? (
          <div className="space-y-2.5">
            {stats.map((item) => {
              const isSelected = selected?.raw === item.raw;
              return (
                <button
                  key={item.raw}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRaw(item.raw)}
                  className="grid w-full grid-cols-[minmax(108px,138px)_minmax(0,1fr)_34px] items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="truncate text-[10px] font-medium text-foreground">{item.label}</span>
                  <span className="relative h-4 overflow-visible rounded-md bg-tint/45">
                    <span
                      data-bixbo-chart-mark="bar"
                      data-bixbo-chart-direction="horizontal"
                      className="absolute inset-y-0 left-0 min-w-[6px]"
                      style={{ width: `${Math.max(4, item.average * 10)}%`, background: vividPainChartColor(item.average) }}
                    />
                  </span>
                  <span className="text-right text-[10px] font-semibold tabular-nums" style={{ color: vividPainChartColor(item.average) }}>{item.average.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[150px] place-items-center text-center text-xs text-muted-foreground">No mental factors logged in this period.</div>
        )}
        <div className="mt-3 flex justify-between pl-[146px] text-[9px] tabular-nums text-muted-foreground">
          <span>0</span><span>2.5</span><span>5</span><span>7.5</span><span>10</span>
        </div>
        <p className="mt-1 text-right text-[9px] text-muted-foreground">Average distress (0–10)</p>
      </div>

      {selected ? (
        <MetricCards items={[
          { label: "Avg distress", value: selected.average.toFixed(1), sub: `${selected.count} ${selected.count === 1 ? "log" : "logs"}`, color: vividPainChartColor(selected.average) },
          { label: "Highest", value: selected.highest.toFixed(selected.highest % 1 ? 1 : 0), sub: selected.label, color: vividPainChartColor(selected.highest) },
          { label: "Data", value: selected.count >= 3 ? "Better" : selected.count >= 2 ? "Early" : "Limited", sub: "association", color: "var(--primary)" },
        ]} />
      ) : null}

      <QuickInsights items={[
        {
          kind: "trend",
          color: stableTop ? vividPainChartColor(stableTop.average) : "var(--primary)",
          text: stableTop ? `Most linked to higher distress: ${stableTop.label} (${stableTop.average.toFixed(1)}/10 avg)` : "More factor logs are needed for a pattern",
        },
        {
          kind: "bars",
          color: "var(--primary)",
          text: mostLogged ? `Most logged factor: ${mostLogged.label} (${mostLogged.count} ${mostLogged.count === 1 ? "log" : "logs"})` : "No factor frequency pattern yet",
        },
        {
          kind: "bulb",
          color: "var(--primary)",
          text: "These are associations in your logs, not causes.",
        },
      ]} />
    </section>
  );
}
