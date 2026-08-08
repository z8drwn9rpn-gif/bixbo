import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import {
  BlueberryIcon,
  BoltIcon,
  HeartIcon,
  LeafIcon,
  PanicIcon,
  PillIcon,
  ProfileIcon,
  SparkleIcon,
  TaskIcon,
  WaterIcon,
} from "@/components/icons/BixboIcons";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import {
  EMPTY,
  PAIN_DESCRIPTIONS,
  addDays,
  avgDayPain,
  fromKey,
  nextPredictedPeriod,
  painColor,
  predictPeriods,
  setPartner,
  toKey,
  todayKey,
  useBixbo,
  type ExtraMed,
  type Med,
  type PainEntry,
  type PanicAttack,
  type PartnerData,
  type TetanyEpisode,
} from "@/lib/storage";
import { fetchPartner } from "@/lib/cloudSync";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Bixbo Couple" },
      {
        name: "description",
        content: "Share and compare pain, tetany, panic and medication patterns with your partner.",
      },
      { property: "og:title", content: "Bixbo Couple" },
      {
        property: "og:description",
        content: "Private partner sharing for selected health categories.",
      },
    ],
  }),
  component: CouplePage,
});

/* -------------------------------------------------------------------------- */
/* Types and helpers                                                          */
/* -------------------------------------------------------------------------- */

type ComparableDayLog = {
  pain?: PainEntry[];
  panic?: PanicAttack[];
  tetany?: TetanyEpisode[];
  extraMeds?: ExtraMed[];
};

type ComparisonTone = "rose" | "green" | "purple" | "blue" | "emerald";

const TONES: Record<
  ComparisonTone,
  {
    solid: string;
    soft: string;
    text: string;
  }
> = {
  rose: {
    solid: "#ef4770",
    soft: "rgba(239, 71, 112, 0.10)",
    text: "#df315d",
  },
  green: {
    solid: "#6f9d16",
    soft: "rgba(111, 157, 22, 0.10)",
    text: "#5f8911",
  },
  purple: {
    solid: CHART_COLORS.panic,
    soft: CHART_TINTS.panic,
    text: CHART_COLORS.panic,
  },
  blue: {
    solid: CHART_COLORS.tetany,
    soft: CHART_TINTS.tetany,
    text: CHART_COLORS.tetany,
  },
  emerald: {
    solid: CHART_COLORS.medication,
    soft: CHART_TINTS.medication,
    text: CHART_COLORS.medication,
  },
};

const COUPLE_PAIN_COLORS = [
  "#8DBF3A",
  "#A8C93A",
  "#C4D63A",
  "#E0D93A",
  "#F0C43A",
  "#F3A83A",
  "#F28A3A",
  "#EF6E42",
  "#E9534F",
  "#D93F55",
  "#C92F5A",
] as const;

function couplePainColor(value: number): string {
  const clamped = Math.max(0, Math.min(10, value));
  const lower = Math.floor(clamped);
  const upper = Math.ceil(clamped);

  if (lower === upper) return COUPLE_PAIN_COLORS[lower];

  // Half-step values use the nearest vivid chart color. The global Pain Scale
  // still uses painColor(); this palette is only for the Couple pain chart.
  return COUPLE_PAIN_COLORS[Math.round(clamped)];
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}


function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}


type CouplePeriod = "W" | "M" | "Y";

function coupleRangeFor(period: CouplePeriod, anchor: Date) {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);

  let start: Date;
  let end: Date;

  if (period === "W") {
    const mondayOffset = (base.getDay() + 6) % 7;
    start = new Date(base);
    start.setDate(base.getDate() - mondayOffset);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "M") {
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  } else {
    start = new Date(base.getFullYear(), 0, 1);
    end = new Date(base.getFullYear(), 11, 31);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end > today) end = today;

  const startK = toKey(start);
  const endK = toKey(end);
  const days: string[] = [];
  let key = startK;
  while (key <= endK) {
    days.push(key);
    key = addDays(key, 1);
  }

  const label =
    period === "Y"
      ? String(base.getFullYear())
      : period === "M"
        ? base.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short", year: "numeric" },
          )}`;

  return { start, end, days, label };
}

function hasSymptoms(log?: ComparableDayLog) {
  return Boolean(log?.pain?.length || log?.panic?.length || log?.tetany?.length);
}

function countTakenScheduledDoses(days: string[], meds: Med[], medLog: Record<string, Record<string, boolean>>) {
  let taken = 0;

  days.forEach((day) => {
    meds
      .filter((med) => !med.asNeeded)
      .forEach((med) => {
        med.times.forEach((time) => {
          if (medLog[day]?.[`${med.id}@${time}`]) {
            taken += 1;
          }
        });
      });
  });

  return taken;
}

function formatValue(value: number | null, decimals = 0, unit = "") {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}${unit}`;
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>

      {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}

      {children}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: ComparisonTone;
}) {
  const palette = TONES[tone];

  return (
    <article className="rounded-2xl bg-tint p-4 ring-1 ring-border/50">
      <div
        className="grid h-9 w-9 place-items-center rounded-2xl"
        style={{
          color: palette.text,
          backgroundColor: "var(--surface)",
        }}
      >
        {icon}
      </div>

      <p className="mt-3 text-[11px] font-medium text-muted-foreground">{label}</p>

      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>

      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
    </article>
  );
}

function ComparisonBarCard({
  title,
  subtitle,
  mine,
  theirs,
  max,
  mineLabel,
  partnerLabel,
  tone,
  decimals = 0,
  unit = "",
  icon,
}: {
  title: string;
  subtitle: string;
  mine: number | null;
  theirs: number | null;
  max?: number;
  mineLabel: string;
  partnerLabel: string;
  tone: ComparisonTone;
  decimals?: number;
  unit?: string;
  icon: ReactNode;
}) {
  const palette = TONES[tone];

  const calculatedMax =
    max ??
    Math.max(1, ...[mine, theirs].filter((value): value is number => value != null).map((value) => Math.abs(value)));

  const minePercent = mine == null ? 0 : clampPercent((Math.max(0, mine) / calculatedMax) * 100);

  const theirsPercent = theirs == null ? 0 : clampPercent((Math.max(0, theirs) / calculatedMax) * 100);

  return (
    <article className="rounded-2xl bg-tint p-4 ring-1 ring-border/50">
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
          style={{
            color: palette.text,
            backgroundColor: "var(--surface)",
          }}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>

          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <ComparisonRow
          label={mineLabel}
          value={mine}
          percentage={minePercent}
          color={palette.solid}
          decimals={decimals}
          unit={unit}
        />

        <ComparisonRow
          label={partnerLabel}
          value={theirs}
          percentage={theirsPercent}
          color={palette.solid}
          decimals={decimals}
          unit={unit}
          striped
        />
      </div>
    </article>
  );
}

function ComparisonRow({
  label,
  value,
  percentage,
  color,
  decimals,
  unit,
  striped = false,
}: {
  label: string;
  value: number | null;
  percentage: number;
  color: string;
  decimals: number;
  unit: string;
  striped?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>

        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
          {formatValue(value, decimals, unit)}
        </span>
      </div>

      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface/70 ring-1 ring-border/40">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: value == null ? "0%" : `${Math.max(value === 0 ? 0 : 4, percentage)}%`,
            background: striped
              ? `repeating-linear-gradient(135deg, ${color}, ${color} 5px, rgba(255,255,255,.35) 5px, rgba(255,255,255,.35) 9px)`
              : color,
            opacity: striped ? 0.82 : 1,
          }}
        />
      </div>
    </div>
  );
}

function SimilarityCard({ score, partnerName }: { score: number; partnerName: string }) {
  const safeScore = clampPercent(score);

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex items-center gap-4 rounded-2xl bg-tint p-4 ring-1 ring-border/50">
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-2"
          style={{
            background: `conic-gradient(${CHART_COLORS.panic} ${safeScore}%, ${CHART_TINTS.panic} ${safeScore}% 100%)`,
          }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-surface">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{safeScore.toFixed(0)}%</p>

              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">similarity</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Health similarity</p>

          <h2 className="mt-1 font-serif text-xl font-semibold">You + {partnerName}</h2>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Based only on shared pain, panic and tetany data during the selected month.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Detail lists                                                               */
/* -------------------------------------------------------------------------- */

function PainList({ title, entries }: { title: string; entries: (PainEntry & { dateKey: string })[] }) {
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">No pain entries yet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {entries.map((pain) => (
          <li key={`${pain.dateKey}-${pain.id}`} className="flex items-start gap-3 rounded-2xl bg-surface-sunken/32 p-3 ring-1 ring-border/25">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: painColor(pain.score) }}
            >
              {Number.isInteger(pain.score) ? pain.score : pain.score.toFixed(1)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {pain.dateKey} · {pain.time} · {PAIN_DESCRIPTIONS[Math.round(pain.score)]}
              </p>

              {pain.parts?.length ? <p className="text-sm">{pain.parts.join(", ")}</p> : null}

              {pain.quality?.length ? <p className="text-xs text-muted-foreground">{pain.quality.join(", ")}</p> : null}

              {pain.symptoms?.length ? (
                <p className="text-xs text-muted-foreground">+ {pain.symptoms.join(", ")}</p>
              ) : null}

              {pain.hotFlashes != null ? (
                <p className="text-xs text-muted-foreground">Hot flashes {pain.hotFlashes}/5</p>
              ) : null}

              {pain.headache ? (
                <p className="text-xs text-muted-foreground">
                  Headache
                  {pain.headacheIntensity != null ? ` ${pain.headacheIntensity}/10` : ""}
                </p>
              ) : null}

              {pain.nausea ? (
                <p className="text-xs text-muted-foreground">
                  Nausea
                  {pain.nauseaSeverity != null ? ` ${pain.nauseaSeverity}/10` : ""}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TetanyList({ title, entries }: { title: string; entries: (TetanyEpisode & { dateKey: string })[] }) {
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">No tetany episodes yet.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {entries.map((episode) => (
          <li key={`${episode.dateKey}-${episode.id}`} className="rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25">
            <p className="text-xs text-muted-foreground">
              {episode.dateKey} · {episode.time} · intensity {episode.intensity}/5 ·{" "}
              {episode.minutes == null ? "ongoing" : `${episode.minutes} min`}
            </p>

            {episode.types?.length ? <p>{episode.types.join(", ")}</p> : null}

            {episode.location?.length ? (
              <p className="text-xs text-muted-foreground">Location: {episode.location.join(", ")}</p>
            ) : null}

            {episode.triggers?.length ? (
              <p className="text-xs text-muted-foreground">Triggers: {episode.triggers.join(", ")}</p>
            ) : null}

            {episode.helped?.length ? (
              <p className="text-xs text-muted-foreground">Helped by: {episode.helped.join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanicList({ title, entries }: { title: string; entries: (PanicAttack & { dateKey: string })[] }) {
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">No panic attacks yet.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {entries.map((attack) => (
          <li key={`${attack.dateKey}-${attack.id}`} className="rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25">
            <p className="text-xs text-muted-foreground">
              {attack.dateKey} · {attack.time} · intensity {attack.intensity}/10 ·{" "}
              {attack.minutes == null ? "ongoing" : `${attack.minutes} min`}
            </p>

            {attack.physical?.length ? (
              <p className="text-xs text-muted-foreground">Physical: {attack.physical.join(", ")}</p>
            ) : null}

            {attack.cognitive?.length ? (
              <p className="text-xs text-muted-foreground">Cognitive: {attack.cognitive.join(", ")}</p>
            ) : null}

            {attack.trigger ? <p className="text-xs text-muted-foreground">Trigger: {attack.trigger}</p> : null}

            {attack.helped?.length ? (
              <p className="text-xs text-muted-foreground">Helped by: {attack.helped.join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedsList({
  title,
  days,
}: {
  title: string;
  days: {
    dateKey: string;
    meds: Med[];
    medLog: Record<string, boolean>;
    extra: ExtraMed[];
  }[];
}) {
  const nonEmpty = days.filter(
    (day) =>
      day.extra.length ||
      day.meds.some((med) => !med.asNeeded && med.times.some((time) => day.medLog[`${med.id}@${time}`])),
  );

  if (!nonEmpty.length) {
    return <p className="text-xs text-muted-foreground">No medication logged yet.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {nonEmpty.slice(0, 14).map((day) => (
          <li key={day.dateKey} className="rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25">
            <p className="mb-1 text-xs text-muted-foreground">{day.dateKey}</p>

            {day.meds.map((med) =>
              med.asNeeded
                ? null
                : med.times
                    .filter((time) => day.medLog[`${med.id}@${time}`])
                    .map((time) => (
                      <p key={`${med.id}@${time}`}>
                        <span className="inline-flex items-center gap-1">
                          <TaskIcon size={14} />
                          {time} — {med.name}
                        </span>
                        {med.dose ? ` (${med.dose})` : ""}
                      </p>
                    )),
            )}

            {day.extra.map((extra) => (
              <p key={extra.id}>
                • {extra.time} — {extra.name}
                {extra.dose ? ` (${extra.dose})` : ""}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CurrentAndHistory({
  title,
  currentLabel,
  currentContent,
  historyCount,
  historyContent,
}: {
  title: string;
  currentLabel: string;
  currentContent: ReactNode;
  historyCount: number;
  historyContent: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface-sunken/34 p-3 ring-1 ring-border/32">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/40">
          {currentLabel}
        </span>
      </div>

      <div className="mt-3">{currentContent}</div>

      {historyCount > 0 ? (
        <details className="mt-3 rounded-2xl bg-surface/75 p-3 ring-1 ring-border/40">
          <summary className="cursor-pointer text-xs font-semibold text-foreground">
            Show earlier entries ({historyCount})
          </summary>
          <div className="mt-3">{historyContent}</div>
        </details>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pain comparison chart                                                      */
/* -------------------------------------------------------------------------- */

function CouplePainChart({
  days,
  mine,
  theirs,
  partnerName,
  periodLabel,
  period,
}: {
  days: string[];
  mine: Record<string, { pain?: PainEntry[] }>;
  theirs: Record<string, { pain?: PainEntry[] }>;
  partnerName: string;
  periodLabel: string;
  period: CouplePeriod;
}) {
  const chartItems = useMemo(() => {
    if (period !== "Y") {
      return days.map((day) => ({
        key: day,
        label: fromKey(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        shortTop: fromKey(day).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        shortBottom: String(fromKey(day).getDate()),
        mine: avgDayPain(mine[day]),
        theirs: avgDayPain(theirs[day]),
      }));
    }

    const year = days[0] ? fromKey(days[0]).getFullYear() : new Date().getFullYear();
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDays = days.filter((day) => fromKey(day).getMonth() === monthIndex);
      const mineValues = monthDays.map((day) => avgDayPain(mine[day])).filter((v): v is number => v != null);
      const theirValues = monthDays.map((day) => avgDayPain(theirs[day])).filter((v): v is number => v != null);
      const monthDate = new Date(year, monthIndex, 1);

      return {
        key: toKey(monthDate),
        label: monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        shortTop: monthDate.toLocaleDateString("en-US", { month: "short" }),
        shortBottom: "",
        mine: average(mineValues),
        theirs: average(theirValues),
      };
    });
  }, [days, mine, period, theirs]);

  const width = Math.max(340, chartItems.length * 22 + 34);
  const height = 206;
  const left = 24;
  const right = 10;
  const top = 12;
  const bottom = 40;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const count = Math.max(1, chartItems.length);
  const slot = chartWidth / count;
  const barWidth = Math.max(5, (slot - 3) / 2);

  const yFor = (value: number) => top + ((10 - Math.max(0, Math.min(10, value))) / 10) * chartHeight;

  const baselineY = yFor(0);
  const yTicks = [10, 8, 6, 4, 2, 0];

  const mySeries = chartItems.map((item) => item.mine);
  const partnerSeries = chartItems.map((item) => item.theirs);

  const [selectedBar, setSelectedBar] = useState<{
    owner: string;
    day: string;
    label: string;
    value: number;
    color: string;
    centerX: number;
    barTopY: number;
    series: "mine" | "partner";
  } | null>(null);

  useEffect(() => {
    setSelectedBar(null);
  }, [periodLabel, partnerName]);

  const showBarDetails = (
    owner: string,
    day: string,
    label: string,
    value: number,
    color: string,
    centerX: number,
    barTopY: number,
    series: "mine" | "partner",
  ) => {
    setSelectedBar((current) =>
      current?.day === day && current.series === series
        ? null
        : {
            owner,
            day,
            label,
            value,
            color,
            centerX,
            barTopY,
            series,
          },
    );
  };

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {`Pain — ${periodLabel}`}
        </h2>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {period === "Y" ? "Monthly average pain" : "Daily average pain"}. Tap a bar to see its value. Solid bars are yours; striped bars belong to {partnerName}.
        </p>
      </div>

      <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-2xl bg-background/55 px-2 py-3 ring-1 ring-border/40">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[206px] max-w-none"
          style={{ width: `${width}px` }}
          role="img"
          aria-label={`Pain comparison between you and ${partnerName} during ${periodLabel}`}
        >
          <defs>
            <pattern
              id="couple-pain-stripes"
              patternUnits="userSpaceOnUse"
              width="4"
              height="4"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="4" fill="transparent" />

              <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" />
            </pattern>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              <text x={left - 4} y={yFor(tick) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">
                {tick}
              </text>
            </g>
          ))}

          {chartItems.map((item, index) => {
            const day = item.key;
            const centerX = left + slot * index + slot / 2;
            const myValue = mySeries[index];
            const partnerValue = partnerSeries[index];

            const myColor = myValue != null ? couplePainColor(myValue) : "transparent";
            const partnerColor = partnerValue != null ? couplePainColor(partnerValue) : "transparent";

            return (
              <g key={day}>
                {myValue != null ? (
                  <>
                    <rect
                      x={centerX - barWidth - 1}
                      y={yFor(myValue)}
                      width={barWidth}
                      height={baselineY - yFor(myValue)}
                      fill={myColor}
                      stroke={
                        selectedBar?.day === day && selectedBar.series === "mine" ? "var(--foreground)" : "transparent"
                      }
                      strokeWidth={selectedBar?.day === day && selectedBar.series === "mine" ? 2 : 0}
                      rx="2"
                      pointerEvents="none"
                    >
                      <title>{`You · ${day}: ${myValue.toFixed(1)}/10`}</title>
                    </rect>

                    <rect
                      x={centerX - slot / 2}
                      y={top}
                      width={slot / 2}
                      height={chartHeight}
                      fill="transparent"
                      role="button"
                      tabIndex={0}
                      aria-label={`You, ${day}, pain ${myValue.toFixed(1)} out of 10`}
                      className="cursor-pointer focus:outline-none"
                      onClick={() =>
                        showBarDetails("You", day, item.label, myValue, myColor, centerX - barWidth / 2 - 1, yFor(myValue), "mine")
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          showBarDetails(
                            "You",
                            day,
                            item.label,
                            myValue,
                            myColor,
                            centerX - barWidth / 2 - 1,
                            yFor(myValue),
                            "mine",
                          );
                        }
                      }}
                    />
                  </>
                ) : null}

                {partnerValue != null ? (
                  <g style={{ color: partnerColor }}>
                    <rect
                      x={centerX + 1}
                      y={yFor(partnerValue)}
                      width={barWidth}
                      height={baselineY - yFor(partnerValue)}
                      fill={partnerColor}
                      rx="2"
                      opacity="0.88"
                      pointerEvents="none"
                    />

                    <rect
                      x={centerX + 1}
                      y={yFor(partnerValue)}
                      width={barWidth}
                      height={baselineY - yFor(partnerValue)}
                      fill="url(#couple-pain-stripes)"
                      rx="2"
                      pointerEvents="none"
                    >
                      <title>{`${partnerName} · ${day}: ${partnerValue.toFixed(1)}/10`}</title>
                    </rect>

                    <rect
                      x={centerX + 1}
                      y={yFor(partnerValue)}
                      width={barWidth}
                      height={baselineY - yFor(partnerValue)}
                      fill="none"
                      stroke={
                        selectedBar?.day === day && selectedBar.series === "partner"
                          ? "var(--foreground)"
                          : partnerColor
                      }
                      strokeWidth={selectedBar?.day === day && selectedBar.series === "partner" ? 2.5 : 1.5}
                      rx="2"
                      pointerEvents="none"
                    />

                    <rect
                      x={centerX}
                      y={top}
                      width={slot / 2}
                      height={chartHeight}
                      fill="transparent"
                      role="button"
                      tabIndex={0}
                      aria-label={`${partnerName}, ${day}, pain ${partnerValue.toFixed(1)} out of 10`}
                      className="cursor-pointer focus:outline-none"
                      onClick={() =>
                        showBarDetails(
                          partnerName,
                          day,
                          item.label,
                          partnerValue,
                          partnerColor,
                          centerX + barWidth / 2 + 1,
                          yFor(partnerValue),
                          "partner",
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          showBarDetails(
                            partnerName,
                            day,
                            item.label,
                            partnerValue,
                            partnerColor,
                            centerX + barWidth / 2 + 1,
                            yFor(partnerValue),
                            "partner",
                          );
                        }
                      }}
                    />
                  </g>
                ) : null}

                <text x={centerX} y={height - 22} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
                  {item.shortTop}
                </text>

                <text x={centerX} y={height - 12} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
                  {item.shortBottom}
                </text>
              </g>
            );
          })}

          {selectedBar
            ? (() => {
                const tooltipWidth = 138;
                const tooltipHeight = 58;
                const tooltipX = Math.max(
                  left + 2,
                  Math.min(width - right - tooltipWidth - 2, selectedBar.centerX - tooltipWidth / 2),
                );
                const tooltipY = Math.max(4, selectedBar.barTopY - tooltipHeight - 8);
                const dateLabel = selectedBar.label;
                const description =
                  PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(selectedBar.value)))] ?? "Pain";

                return (
                  <g pointerEvents="none" aria-hidden="true">
                    <line
                      x1={selectedBar.centerX}
                      x2={selectedBar.centerX}
                      y1={tooltipY + tooltipHeight}
                      y2={Math.max(tooltipY + tooltipHeight, selectedBar.barTopY - 2)}
                      stroke={selectedBar.color}
                      strokeWidth="1.25"
                    />

                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="9"
                      fill="var(--surface)"
                      stroke={selectedBar.color}
                      strokeWidth="1.4"
                    />

                    <circle cx={tooltipX + 11} cy={tooltipY + 12} r="3.5" fill={selectedBar.color} />

                    <text x={tooltipX + 19} y={tooltipY + 15} fontSize="8.5" fontWeight="600" fill="var(--foreground)">
                      {selectedBar.owner} · {dateLabel}
                    </text>

                    <text x={tooltipX + 10} y={tooltipY + 34} fontSize="12" fontWeight="700" fill="var(--foreground)">
                      Pain {selectedBar.value.toFixed(1)}/10
                    </text>

                    <text x={tooltipX + 10} y={tooltipY + 49} fontSize="8" fill="var(--muted-foreground)">
                      {description}
                    </text>
                  </g>
                );
              })()
            : null}
        </svg>
      </div>

      {selectedBar ? (
        <div className="mt-2 rounded-[1.25rem] bg-surface-sunken/40 px-2.5 py-2 text-[11px] text-foreground ring-1 ring-border/35">
          <button
            type="button"
            onClick={() => setSelectedBar(null)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-label="Close selected pain details"
          >
            <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">
              <b>{selectedBar.owner}</b> · {selectedBar.day} · Pain <b>{selectedBar.value.toFixed(1)}/10</b> ·{" "}
              {PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(selectedBar.value)))] ?? "Pain"}
            </span>

            <span className="shrink-0 text-[9px] text-muted-foreground">Tap to close</span>
          </button>
        </div>
      ) : (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">Tap any pain bar to see the exact value.</p>
      )}

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: couplePainColor(6) }} />
          You — solid
        </span>

        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{
              background: `repeating-linear-gradient(
                135deg,
                ${couplePainColor(6)},
                ${couplePainColor(6)} 3px,
                rgba(255,255,255,0.95) 3px,
                rgba(255,255,255,0.95) 5px
              )`,
              border: `1px solid ${couplePainColor(6)}`,
            }}
          />
          {partnerName} — striped
        </span>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Period sharing                                                             */
/* -------------------------------------------------------------------------- */

const PERIOD_COLORS: Record<string, string> = {
  spotting: "#F9C6D7",
  light: "#F19FBB",
  medium: CHART_COLORS.period,
  heavy: "#B33B6C",
  "very-heavy": "#7A1F45",
};

function BlueberrySection({
  partner,
  selectedMonth,
  selectedMonthLabel,
  isCurrentMonth,
}: {
  partner: PartnerData;
  selectedMonth: Date;
  selectedMonthLabel: string;
  isCurrentMonth: boolean;
}) {
  const cycle = partner.cycle;

  if (!cycle?.lastPeriodStart) {
    const anyPeriod = Object.values(partner.dayLogs).some((log) => log.period || log.periodInfo?.level);

    if (!anyPeriod) return null;
  }

  const monthStart = startOfMonth(selectedMonth);
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(rangeStart.getDate() - 14);

  const rangeEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

  const predicted = cycle ? predictPeriods(cycle, rangeStart, rangeEnd) : [];

  const next = cycle && isCurrentMonth ? nextPredictedPeriod(cycle) : null;

  const first = startOfMonth(selectedMonth);
  const dayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOffset);

  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

    return {
      key,
      date,
      inMonth: date.getFullYear() === selectedMonth.getFullYear() && date.getMonth() === selectedMonth.getMonth(),
    };
  });

  const today = todayKey();

  const isPredicted = (key: string) => predicted.some((period) => key >= period.start && key <= period.end);

  const loggedLevel = (key: string) => {
    const log = partner.dayLogs[key];
    return log?.periodInfo?.level || log?.period || null;
  };

  return (
    <section className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
        <BlueberryIcon size={21} />
        <span>{partner.name || "Partner"} — Blueberry</span>
      </h3>

      {next ? (
        <div className="space-y-1 rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25">
          <p className="flex items-center gap-2">
            <WaterIcon size={18} />
            <span>
              Next period: <span className="font-semibold">{next.start}</span>
            </span>
          </p>

          <p className="text-xs text-muted-foreground">
            Predicted window: {next.start} → {next.end}
          </p>
        </div>
      ) : null}

      {cycle ? (
        <p className="text-xs text-muted-foreground">
          Cycle {cycle.cycleLength}d · period {cycle.periodLength}d
        </p>
      ) : null}

      <div className="rounded-2xl bg-surface-sunken/32 p-3 ring-1 ring-border/25">
        <p className="mb-2 text-center text-xs font-medium">{selectedMonthLabel}</p>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const logged = loggedLevel(cell.key);
            const predictedDay = isPredicted(cell.key) && !logged;

            const background = logged ? PERIOD_COLORS[logged] || CHART_COLORS.period : undefined;

            return (
              <div
                key={cell.key}
                className={`grid aspect-square place-items-center rounded-full text-[10px] ${
                  cell.inMonth ? "" : "opacity-30"
                } ${cell.key === today ? "ring-2 ring-primary" : ""}`}
                style={{
                  background,
                  color: logged ? "white" : undefined,
                  border: predictedDay ? `1.5px dashed ${CHART_COLORS.period}` : undefined,
                }}
              >
                {cell.date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

type CoupleTab = "overview" | "compare" | "health";

function CouplePage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;

  const [period, setPeriod] = useState<CouplePeriod>("M");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<CoupleTab>("overview");

  useEffect(() => {
    let cancelled = false;

    fetchPartner()
      .then((partnerData) => {
        if (!cancelled) {
          setPartner(partnerData ?? undefined);
        }
      })
      .catch((error) => {
        console.error("Couple fetchPartner", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const range = useMemo(() => coupleRangeFor(period, anchor), [anchor, period]);
  const periodDays = range.days;
  const periodDisplayLabel = range.label;

  const selectedMonth = useMemo(() => startOfMonth(anchor), [anchor]);
  const selectedMonthLabel = monthLabel(selectedMonth);
  const currentMonth = startOfMonth(new Date());
  const isCurrentMonth = isSameMonth(selectedMonth, currentMonth);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canGoNext = range.end.getTime() < today.getTime();

  const goPrev = () =>
    setAnchor((current) => {
      const next = new Date(current);
      if (period === "W") next.setDate(next.getDate() - 7);
      else if (period === "M") {
        next.setDate(1);
        next.setMonth(next.getMonth() - 1);
      } else next.setFullYear(next.getFullYear() - 1);
      return next;
    });

  const goNext = () =>
    setAnchor((current) => {
      const next = new Date(current);
      if (period === "W") next.setDate(next.getDate() + 7);
      else if (period === "M") {
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);
      } else next.setFullYear(next.getFullYear() + 1);
      return next > today ? current : next;
    });

  const collectPain = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PainEntry & { dateKey: string })[] = [];

    for (const day of periodDays) {
      for (const pain of dayLogs[day]?.pain ?? []) {
        output.push({
          ...pain,
          dateKey: day,
        });
      }
    }

    return output
      .sort((a, b) => (b.dateKey === a.dateKey ? b.time.localeCompare(a.time) : b.dateKey.localeCompare(a.dateKey)))
      .slice(0, 30);
  };

  const collectTetany = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (TetanyEpisode & {
      dateKey: string;
    })[] = [];

    for (const day of periodDays) {
      for (const episode of dayLogs[day]?.tetany ?? []) {
        output.push({
          ...episode,
          dateKey: day,
        });
      }
    }

    return output.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };

  const collectPanic = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PanicAttack & {
      dateKey: string;
    })[] = [];

    for (const day of periodDays) {
      for (const attack of dayLogs[day]?.panic ?? []) {
        output.push({
          ...attack,
          dateKey: day,
        });
      }
    }

    return output.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };

  const collectMedDays = (
    meds: Med[],
    medLog: Record<string, Record<string, boolean>>,
    dayLogs: Record<string, ComparableDayLog>,
  ) =>
    periodDays
      .slice()
      .reverse()
      .map((day) => ({
        dateKey: day,
        meds,
        medLog: medLog[day] ?? {},
        extra: dayLogs[day]?.extraMeds ?? [],
      }));

  const myPain = collectPain(view.dayLogs);
  const myTetany = collectTetany(view.dayLogs);
  const myPanic = collectPanic(view.dayLogs);

  const myMeds = collectMedDays(view.meds, view.medLog, view.dayLogs);

  const partnerPain = partner ? collectPain(partner.dayLogs) : [];

  const partnerTetany = partner ? collectTetany(partner.dayLogs) : [];

  const partnerPanic = partner ? collectPanic(partner.dayLogs) : [];

  const partnerMeds = partner ? collectMedDays(partner.meds ?? [], partner.medLog ?? {}, partner.dayLogs) : [];

  const visibleHealthDay = periodDays.includes(todayKey()) ? todayKey() : (periodDays[periodDays.length - 1] ?? todayKey());
  const visibleHealthDayLabel = visibleHealthDay === todayKey() ? "Today" : visibleHealthDay;

  const splitEntriesByVisibleDay = <T extends { dateKey: string }>(entries: T[]) => ({
    current: entries.filter((entry) => entry.dateKey === visibleHealthDay),
    history: entries.filter((entry) => entry.dateKey !== visibleHealthDay),
  });

  const splitMedDaysByVisibleDay = (
    days: { dateKey: string; meds: Med[]; medLog: Record<string, boolean>; extra: ExtraMed[] }[],
  ) => ({
    current: days.filter((day) => day.dateKey === visibleHealthDay),
    history: days.filter((day) => day.dateKey !== visibleHealthDay),
  });

  const partnerPainSplit = splitEntriesByVisibleDay(partnerPain);
  const partnerTetanySplit = splitEntriesByVisibleDay(partnerTetany);
  const partnerPanicSplit = splitEntriesByVisibleDay(partnerPanic);
  const partnerMedsSplit = splitMedDaysByVisibleDay(partnerMeds);

  const myPainSplit = splitEntriesByVisibleDay(myPain);
  const myTetanySplit = splitEntriesByVisibleDay(myTetany);
  const myPanicSplit = splitEntriesByVisibleDay(myPanic);
  const myMedsSplit = splitMedDaysByVisibleDay(myMeds);

  const myPainAverage = average(myPain.map((pain) => pain.score));

  const partnerPainAverage = average(partnerPain.map((pain) => pain.score));

  const myPainDays = periodDays.filter((day) => (view.dayLogs[day]?.pain?.length ?? 0) > 0).length;

  const partnerPainDays = partner ? periodDays.filter((day) => (partner.dayLogs[day]?.pain?.length ?? 0) > 0).length : 0;

  const sharedSymptomDays = partner
    ? periodDays.filter((day) => hasSymptoms(view.dayLogs[day]) && hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const mySymptomDays = periodDays.filter((day) => hasSymptoms(view.dayLogs[day])).length;

  const partnerSymptomDays = partner ? periodDays.filter((day) => hasSymptoms(partner.dayLogs[day])).length : 0;

  const myTakenDoses = countTakenScheduledDoses(periodDays, view.meds, view.medLog);

  const partnerTakenDoses = partner ? countTakenScheduledDoses(periodDays, partner.meds ?? [], partner.medLog ?? {}) : 0;

  const similarityScore = partner
    ? (() => {
        const symptomDayGap = Math.abs(mySymptomDays - partnerSymptomDays) / Math.max(1, periodDays.length);

        const painGap =
          myPainAverage == null || partnerPainAverage == null ? 0.5 : Math.abs(myPainAverage - partnerPainAverage) / 10;

        const panicGap =
          Math.abs(myPanic.length - partnerPanic.length) / Math.max(1, myPanic.length, partnerPanic.length);

        const tetanyGap =
          Math.abs(myTetany.length - partnerTetany.length) / Math.max(1, myTetany.length, partnerTetany.length);

        const averageGap = (symptomDayGap + painGap + panicGap + tetanyGap) / 4;

        return clampPercent((1 - averageGap) * 100);
      })()
    : 0;

  const partnerName = partner?.name || "Partner";

  const tabs: {
    id: CoupleTab;
    label: string;
    icon: ReactNode;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <HeartIcon size={24} />,
    },
    {
      id: "compare",
      label: "Compare",
      icon: <SparkleIcon size={24} />,
    },
    {
      id: "health",
      label: "Health",
      icon: <LeafIcon size={24} />,
    },
  ];

  return (
    <AppShell title="Bixbo Couple">
      <div className="space-y-3 px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 lg:px-0 lg:pb-12 [&>*:first-child]:lg:col-span-2">
        <div
          className="mx-auto grid w-full max-w-[340px] grid-cols-3 gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 lg:max-w-sm"
          role="tablist"
          aria-label="Couple period"
        >
          {(["W", "M", "Y"] as CouplePeriod[]).map((option) => {
            const active = period === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setPeriod(option);
                  setAnchor(new Date());
                }}
                className={`min-w-0 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground/80 hover:bg-surface/45 hover:text-foreground"
                }`}
              >
                {option === "W" ? "Week" : option === "M" ? "Month" : "Year"}
              </button>
            );
          })}
        </div>

        {partner ? (
          <nav
            aria-label="Couple sections"
            className="mx-auto grid w-full max-w-[340px] grid-cols-3 gap-0.5 rounded-xl bg-primary/20 p-0.5 ring-1 ring-primary/15 lg:max-w-sm"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={active}
                  className={`min-w-0 rounded-[10px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground/80 hover:bg-surface/45 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        ) : null}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous period"
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>

          <span className="text-[11px] font-medium leading-none">{periodDisplayLabel}</span>

          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Next period"
            className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {!partner ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm font-medium">No partner linked yet.</p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              In Settings → Couple sharing, exchange pairing codes with your partner to compare selected health logs.
            </p>

            <Link to="/settings" className="mt-3 inline-block text-sm text-primary underline">
              Open Couple sharing
            </Link>
          </div>
        ) : (
          <>
            {activeTab === "overview" ? <SimilarityCard score={similarityScore} partnerName={partnerName} /> : null}

            {activeTab === "overview" ? (
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  icon={<ProfileIcon size={18} />}
                  label="Shared symptom days"
                  value={`${sharedSymptomDays}`}
                  detail="Days when both of you logged pain, panic or tetany."
                  tone="purple"
                />

                <StatCard
                  icon={<HeartIcon size={18} />}
                  label="Your symptom days"
                  value={`${mySymptomDays}`}
                  detail={`${partnerName}: ${partnerSymptomDays} days`}
                  tone="rose"
                />

                <StatCard
                  icon={<PanicIcon size={18} />}
                  label="Panic attacks"
                  value={`${myPanic.length + partnerPanic.length}`}
                  detail={`You ${myPanic.length} · ${partnerName} ${partnerPanic.length}`}
                  tone="purple"
                />

                <StatCard
                  icon={<BoltIcon size={18} />}
                  label="Tetany episodes"
                  value={`${myTetany.length + partnerTetany.length}`}
                  detail={`You ${myTetany.length} · ${partnerName} ${partnerTetany.length}`}
                  tone="blue"
                />
              </div>
            ) : null}

            {activeTab === "overview" && partner.gender !== "male" ? (
              <BlueberrySection
                partner={partner}
                selectedMonth={selectedMonth}
                selectedMonthLabel={selectedMonthLabel}
                isCurrentMonth={isCurrentMonth}
              />
            ) : null}

            {activeTab === "compare" ? (
              <>
                <CouplePainChart
                  days={periodDays}
                  mine={view.dayLogs}
                  theirs={partner.dayLogs}
                  partnerName={partnerName}
                  periodLabel={periodDisplayLabel}
                  period={period}
                />

                <SectionCard
                  title="Health comparison"
                  description="Solid bars are yours. Striped bars belong to your partner."
                >
                  <div className="mt-3 space-y-2.5">
                    <ComparisonBarCard
                      title="Average pain"
                      subtitle="Average intensity of logged pain entries"
                      mine={myPainAverage}
                      theirs={partnerPainAverage}
                      max={10}
                      decimals={1}
                      unit="/10"
                      mineLabel="You"
                      partnerLabel={partnerName}
                      tone="rose"
                      icon={<HeartIcon size={22} />}
                    />

                    <ComparisonBarCard
                      title="Pain days"
                      subtitle="Days with at least one pain entry"
                      mine={myPainDays}
                      theirs={partnerPainDays}
                      decimals={0}
                      mineLabel="You"
                      partnerLabel={partnerName}
                      tone="green"
                      icon={<SparkleIcon size={22} />}
                    />

                    <ComparisonBarCard
                      title="Panic attacks"
                      subtitle="Number logged in the selected month"
                      mine={myPanic.length}
                      theirs={partnerPanic.length}
                      decimals={0}
                      mineLabel="You"
                      partnerLabel={partnerName}
                      tone="purple"
                      icon={<PanicIcon size={22} />}
                    />

                    <ComparisonBarCard
                      title="Tetany episodes"
                      subtitle="Number logged in the selected month"
                      mine={myTetany.length}
                      theirs={partnerTetany.length}
                      decimals={0}
                      mineLabel="You"
                      partnerLabel={partnerName}
                      tone="blue"
                      icon={<BoltIcon size={22} />}
                    />

                    <ComparisonBarCard
                      title="Medication doses"
                      subtitle="Scheduled doses marked as taken"
                      mine={myTakenDoses}
                      theirs={partnerTakenDoses}
                      decimals={0}
                      mineLabel="You"
                      partnerLabel={partnerName}
                      tone="emerald"
                      icon={<PillIcon size={22} />}
                    />
                  </div>
                </SectionCard>
              </>
            ) : null}

            {activeTab === "health" ? (
              <SectionCard
                title={`${partnerName} — shared details`}
                description="Only the explicitly shared categories for the selected month."
              >
                <div className="mt-3 space-y-2.5">
                  <CurrentAndHistory
                    title={`Pain (${partnerPain.length})`}
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<PainList title={visibleHealthDayLabel} entries={partnerPainSplit.current} />}
                    historyCount={partnerPainSplit.history.length}
                    historyContent={<PainList title="Earlier pain" entries={partnerPainSplit.history} />}
                  />

                  <CurrentAndHistory
                    title={`Tetany (${partnerTetany.length})`}
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<TetanyList title={visibleHealthDayLabel} entries={partnerTetanySplit.current} />}
                    historyCount={partnerTetanySplit.history.length}
                    historyContent={<TetanyList title="Earlier tetany" entries={partnerTetanySplit.history} />}
                  />

                  <CurrentAndHistory
                    title={`Panic attacks (${partnerPanic.length})`}
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<PanicList title={visibleHealthDayLabel} entries={partnerPanicSplit.current} />}
                    historyCount={partnerPanicSplit.history.length}
                    historyContent={<PanicList title="Earlier panic attacks" entries={partnerPanicSplit.history} />}
                  />

                  <CurrentAndHistory
                    title="Medication"
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<MedsList title={visibleHealthDayLabel} days={partnerMedsSplit.current} />}
                    historyCount={partnerMedsSplit.history.length}
                    historyContent={<MedsList title="Earlier medication" days={partnerMedsSplit.history} />}
                  />
                </div>
              </SectionCard>
            ) : null}

            {activeTab === "health" ? (
              <SectionCard
                title="My shared details"
                description="The same categories that your partner is allowed to receive."
              >
                <div className="mt-3 space-y-2.5">
                  <CurrentAndHistory
                    title={`Pain (${myPain.length})`}
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<PainList title={visibleHealthDayLabel} entries={myPainSplit.current} />}
                    historyCount={myPainSplit.history.length}
                    historyContent={<PainList title="Earlier pain" entries={myPainSplit.history} />}
                  />

                  <CurrentAndHistory
                    title={`Tetany (${myTetany.length})`}
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<TetanyList title={visibleHealthDayLabel} entries={myTetanySplit.current} />}
                    historyCount={myTetanySplit.history.length}
                    historyContent={<TetanyList title="Earlier tetany" entries={myTetanySplit.history} />}
                  />

                  <CurrentAndHistory
                    title={`Panic attacks (${myPanic.length})`}
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<PanicList title={visibleHealthDayLabel} entries={myPanicSplit.current} />}
                    historyCount={myPanicSplit.history.length}
                    historyContent={<PanicList title="Earlier panic attacks" entries={myPanicSplit.history} />}
                  />

                  <CurrentAndHistory
                    title="Medication"
                    currentLabel={visibleHealthDayLabel}
                    currentContent={<MedsList title={visibleHealthDayLabel} days={myMedsSplit.current} />}
                    historyCount={myMedsSplit.history.length}
                    historyContent={<MedsList title="Earlier medication" days={myMedsSplit.history} />}
                  />
                </div>
              </SectionCard>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}