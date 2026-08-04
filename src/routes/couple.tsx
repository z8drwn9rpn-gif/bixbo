import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ChevronLeft, ChevronRight, HeartPulse, Pill, Sparkles, TrendingUp, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Ico } from "@/components/icons/BixboIcons";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import {
  EMPTY,
  PAIN_DESCRIPTIONS,
  avgDayPain,
  daysBetween,
  fromKey,
  nextPredictedPeriod,
  painColor,
  predictPeriods,
  setPartner,
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

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function monthPrefix(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function daysForMonth(date: Date) {
  const prefix = monthPrefix(date);
  const today = new Date();
  const current = isSameMonth(date, today);

  const totalDays = current ? today.getDate() : new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${prefix}-${day}`;
  });
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
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
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
    <article className="rounded-3xl bg-tint p-4 ring-1 ring-border">
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
    <article className="rounded-3xl bg-tint p-4 ring-1 ring-border">
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

      <div className="mt-4 space-y-3">
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
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <div className="flex items-center gap-4 rounded-3xl bg-tint p-4 ring-1 ring-border/60">
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
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {entries.map((pain) => (
          <li key={`${pain.dateKey}-${pain.id}`} className="flex items-start gap-3 rounded-2xl bg-tint p-3">
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
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {entries.map((episode) => (
          <li key={`${episode.dateKey}-${episode.id}`} className="rounded-2xl bg-tint p-3 text-sm">
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
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {entries.map((attack) => (
          <li key={`${attack.dateKey}-${attack.id}`} className="rounded-2xl bg-tint p-3 text-sm">
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
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>

      <ul className="space-y-2">
        {nonEmpty.slice(0, 14).map((day) => (
          <li key={day.dateKey} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">{day.dateKey}</p>

            {day.meds.map((med) =>
              med.asNeeded
                ? null
                : med.times
                    .filter((time) => day.medLog[`${med.id}@${time}`])
                    .map((time) => (
                      <p key={`${med.id}@${time}`}>
                        ✓ {time} — {med.name}
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

/* -------------------------------------------------------------------------- */
/* Pain comparison chart                                                      */
/* -------------------------------------------------------------------------- */

function CouplePainChart({
  days,
  mine,
  theirs,
  partnerName,
  periodLabel,
}: {
  days: string[];
  mine: Record<string, { pain?: PainEntry[] }>;
  theirs: Record<string, { pain?: PainEntry[] }>;
  partnerName: string;
  periodLabel: string;
}) {
  const width = Math.max(340, days.length * 22 + 34);
  const height = 190;
  const left = 24;
  const right = 10;
  const top = 12;
  const bottom = 40;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const count = Math.max(1, days.length);
  const slot = chartWidth / count;
  const barWidth = Math.max(4, (slot - 4) / 2);

  const yFor = (value: number) => top + ((10 - Math.max(0, Math.min(10, value))) / 10) * chartHeight;

  const baselineY = yFor(0);
  const yTicks = [10, 8, 6, 4, 2, 0];

  const mySeries = days.map((day) => avgDayPain(mine[day]));
  const partnerSeries = days.map((day) => avgDayPain(theirs[day]));

  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {`Pain — ${periodLabel}`}
        </h2>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Daily average pain. Solid bars are yours; striped bars belong to {partnerName}.
        </p>
      </div>

      <div className="mt-3 overflow-x-auto overscroll-x-contain">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 max-w-none"
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
              <rect width="4" height="4" fill="currentColor" opacity="0.35" />

              <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="2" />
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

          {days.map((day, index) => {
            const date = fromKey(day);
            const centerX = left + slot * index + slot / 2;
            const myValue = mySeries[index];
            const partnerValue = partnerSeries[index];

            const myColor = myValue != null ? painColor(myValue) : "transparent";

            const partnerColor = partnerValue != null ? painColor(partnerValue) : "transparent";

            const weekday = date
              .toLocaleDateString("en-US", {
                weekday: "short",
              })
              .slice(0, 2);

            return (
              <g key={day}>
                {myValue != null ? (
                  <rect
                    x={centerX - barWidth - 1}
                    y={yFor(myValue)}
                    width={barWidth}
                    height={baselineY - yFor(myValue)}
                    fill={myColor}
                    rx="2"
                  >
                    <title>{`You · ${day}: ${myValue.toFixed(1)}/10`}</title>
                  </rect>
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
                      opacity="0.35"
                    />

                    <rect
                      x={centerX + 1}
                      y={yFor(partnerValue)}
                      width={barWidth}
                      height={baselineY - yFor(partnerValue)}
                      fill="url(#couple-pain-stripes)"
                      rx="2"
                    >
                      <title>{`${partnerName} · ${day}: ${partnerValue.toFixed(1)}/10`}</title>
                    </rect>

                    <rect
                      x={centerX + 1}
                      y={yFor(partnerValue)}
                      width={barWidth}
                      height={baselineY - yFor(partnerValue)}
                      fill="none"
                      stroke={partnerColor}
                      strokeWidth="1"
                      rx="2"
                    />
                  </g>
                ) : null}

                <text x={centerX} y={height - 22} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
                  {weekday}
                </text>

                <text x={centerX} y={height - 12} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
                  {date.getDate()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
          You — solid
        </span>

        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{
              background:
                "repeating-linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)) 3px, transparent 3px, transparent 5px)",
              border: "1px solid hsl(var(--primary))",
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

  useEffect(() => {
    if (!next || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const daysUntil = daysBetween(todayKey(), next.start);

    if (daysUntil < 0 || daysUntil > 3) return;

    const notifyKey = `bixbo:partner-period-notified:${next.start}`;

    if (localStorage.getItem(notifyKey)) return;

    const fire = () => {
      const body =
        daysUntil === 0
          ? `${partner.name || "Your partner"}'s period is predicted today.`
          : daysUntil === 1
            ? `${partner.name || "Your partner"}'s period is predicted tomorrow.`
            : `${partner.name || "Your partner"}'s period is predicted in ${daysUntil} days.`;

      try {
        new Notification("🫐 Blueberry reminder", {
          body,
          icon: "/favicon.svg",
        });

        localStorage.setItem(notifyKey, "1");
      } catch {
        // Ignore notification errors.
      }
    };

    if (Notification.permission === "granted") {
      fire();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          fire();
        }
      });
    }
  }, [next?.start, partner.name]);

  return (
    <section className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border">
      <h3 className="font-serif text-lg font-semibold">
        <Ico e="🫐" size={16} /> {partner.name || "Partner"} — Blueberry
      </h3>

      {next ? (
        <div className="space-y-1 rounded-2xl bg-tint p-3 text-sm">
          <p>
            🩸 Next period: <span className="font-semibold">{next.start}</span>
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

      <div className="rounded-2xl bg-tint p-3">
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

type CoupleTab = "overview" | "compare" | "health" | "sharing";

function CouplePage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));

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

  const monthDays = useMemo(() => daysForMonth(selectedMonth), [selectedMonth]);

  const selectedMonthLabel = monthLabel(selectedMonth);
  const currentMonth = startOfMonth(new Date());

  const isCurrentMonth = isSameMonth(selectedMonth, currentMonth);

  const canGoNext = selectedMonth.getTime() < currentMonth.getTime();

  const goToPreviousMonth = () => {
    setSelectedMonth((current) => shiftMonth(current, -1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((current) => {
      const next = shiftMonth(current, 1);

      return next.getTime() > currentMonth.getTime() ? current : next;
    });
  };

  const collectPain = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PainEntry & { dateKey: string })[] = [];

    for (const day of monthDays) {
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

    for (const day of monthDays) {
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

    for (const day of monthDays) {
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
    monthDays
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

  const myPainAverage = average(myPain.map((pain) => pain.score));

  const partnerPainAverage = average(partnerPain.map((pain) => pain.score));

  const myPainDays = monthDays.filter((day) => (view.dayLogs[day]?.pain?.length ?? 0) > 0).length;

  const partnerPainDays = partner ? monthDays.filter((day) => (partner.dayLogs[day]?.pain?.length ?? 0) > 0).length : 0;

  const sharedSymptomDays = partner
    ? monthDays.filter((day) => hasSymptoms(view.dayLogs[day]) && hasSymptoms(partner.dayLogs[day])).length
    : 0;

  const mySymptomDays = monthDays.filter((day) => hasSymptoms(view.dayLogs[day])).length;

  const partnerSymptomDays = partner ? monthDays.filter((day) => hasSymptoms(partner.dayLogs[day])).length : 0;

  const myTakenDoses = countTakenScheduledDoses(monthDays, view.meds, view.medLog);

  const partnerTakenDoses = partner ? countTakenScheduledDoses(monthDays, partner.meds ?? [], partner.medLog ?? {}) : 0;

  const similarityScore = partner
    ? (() => {
        const symptomDayGap = Math.abs(mySymptomDays - partnerSymptomDays) / Math.max(1, monthDays.length);

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
    icon: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: "❤️",
    },
    {
      id: "compare",
      label: "Compare",
      icon: "📊",
    },
    {
      id: "health",
      label: "Health",
      icon: "🌿",
    },
    {
      id: "sharing",
      label: "Sharing",
      icon: "⚙️",
    },
  ];

  return (
    <AppShell title="Bixbo Couple">
      <div className="space-y-4 px-5 pb-24 pt-4">
        <section className="rounded-3xl bg-surface p-3 ring-1 ring-border">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint text-foreground transition active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 text-center">
              <p className="font-serif text-lg font-semibold">{selectedMonthLabel}</p>

              <p className="text-[10px] text-muted-foreground">
                {isCurrentMonth ? `Current month · ${monthDays.length} days so far` : `${monthDays.length} days`}
              </p>
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              disabled={!canGoNext}
              aria-label="Next month"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-tint text-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </section>

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
            <nav
              aria-label="Couple sections"
              className="sticky top-0 z-20 rounded-3xl bg-surface/95 p-1.5 shadow-sm ring-1 ring-border backdrop-blur"
            >
              <div className="grid grid-cols-4 gap-1">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-pressed={active}
                      className={`flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-semibold transition ${
                        active
                          ? "bg-tint text-primary ring-1 ring-border"
                          : "text-muted-foreground hover:bg-tint/60 hover:text-foreground"
                      }`}
                    >
                      <span className="text-base leading-none" aria-hidden="true">
                        {tab.icon}
                      </span>

                      <span className="mt-1 truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {activeTab === "overview" ? <SimilarityCard score={similarityScore} partnerName={partnerName} /> : null}

            {activeTab === "overview" ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Shared symptom days"
                  value={`${sharedSymptomDays}`}
                  detail="Days when both of you logged pain, panic or tetany."
                  tone="purple"
                />

                <StatCard
                  icon={<HeartPulse className="h-4 w-4" />}
                  label="Your symptom days"
                  value={`${mySymptomDays}`}
                  detail={`${partnerName}: ${partnerSymptomDays} days`}
                  tone="rose"
                />

                <StatCard
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Panic attacks"
                  value={`${myPanic.length + partnerPanic.length}`}
                  detail={`You ${myPanic.length} · ${partnerName} ${partnerPanic.length}`}
                  tone="purple"
                />

                <StatCard
                  icon={<Activity className="h-4 w-4" />}
                  label="Tetany episodes"
                  value={`${myTetany.length + partnerTetany.length}`}
                  detail={`You ${myTetany.length} · ${partnerName} ${partnerTetany.length}`}
                  tone="blue"
                />
              </div>
            ) : null}

            {activeTab === "compare" ? (
              <>
                <CouplePainChart
                  days={monthDays}
                  mine={view.dayLogs}
                  theirs={partner.dayLogs}
                  partnerName={partnerName}
                  periodLabel={selectedMonthLabel}
                />

                <SectionCard
                  title="Health comparison"
                  description="Solid bars are yours. Striped bars belong to your partner."
                >
                  <div className="mt-4 space-y-3">
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
                      icon={<HeartPulse className="h-5 w-5" />}
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
                      icon={<TrendingUp className="h-5 w-5" />}
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
                      icon={<Sparkles className="h-5 w-5" />}
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
                      icon={<Activity className="h-5 w-5" />}
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
                      icon={<Pill className="h-5 w-5" />}
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
                <div className="mt-4 space-y-2">
                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Pain ({partnerPain.length})</summary>

                    <div className="mt-3">
                      <PainList title="Pain" entries={partnerPain} />
                    </div>
                  </details>

                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Tetany ({partnerTetany.length})</summary>

                    <div className="mt-3">
                      <TetanyList title="Tetany" entries={partnerTetany} />
                    </div>
                  </details>

                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Panic attacks ({partnerPanic.length})
                    </summary>

                    <div className="mt-3">
                      <PanicList title="Panic attacks" entries={partnerPanic} />
                    </div>
                  </details>

                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Medication</summary>

                    <div className="mt-3">
                      <MedsList title="Medication" days={partnerMeds} />
                    </div>
                  </details>
                </div>
              </SectionCard>
            ) : null}

            {activeTab === "health" && partner.gender !== "male" ? (
              <BlueberrySection
                partner={partner}
                selectedMonth={selectedMonth}
                selectedMonthLabel={selectedMonthLabel}
                isCurrentMonth={isCurrentMonth}
              />
            ) : null}

            {activeTab === "health" ? (
              <SectionCard
                title="My shared details"
                description="The same categories that your partner is allowed to receive."
              >
                <div className="mt-4 space-y-2">
                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Pain ({myPain.length})</summary>

                    <div className="mt-3">
                      <PainList title="Pain" entries={myPain} />
                    </div>
                  </details>

                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Tetany ({myTetany.length})</summary>

                    <div className="mt-3">
                      <TetanyList title="Tetany" entries={myTetany} />
                    </div>
                  </details>

                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Panic attacks ({myPanic.length})</summary>

                    <div className="mt-3">
                      <PanicList title="Panic attacks" entries={myPanic} />
                    </div>
                  </details>

                  <details className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                    <summary className="cursor-pointer text-sm font-semibold">Medication</summary>

                    <div className="mt-3">
                      <MedsList title="Medication" days={myMeds} />
                    </div>
                  </details>
                </div>
              </SectionCard>
            ) : null}

            {activeTab === "sharing" ? (
              <div className="space-y-4">
                <SectionCard title="Partner" description="Your currently linked Couple sharing partner.">
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-tint p-4 ring-1 ring-border/40">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-xl">👥</span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-lg font-semibold">{partnerName}</p>

                      <p className="text-xs text-muted-foreground">Connected through Couple sharing</p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Sharing settings" description="Manage pairing and shared data in Settings.">
                  <Link
                    to="/settings"
                    className="mt-4 flex items-center justify-between rounded-2xl bg-tint px-4 py-4 text-sm font-semibold text-foreground ring-1 ring-border/40"
                  >
                    <span>Open Couple sharing settings</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </SectionCard>

                <SectionCard
                  title="What is shared"
                  description="Only these categories are available to your linked partner."
                >
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {["Pain", "Panic attacks", "Tetany", "Medication", "Period / Blueberry"].map((item) => (
                      <div key={item} className="rounded-2xl bg-tint px-3 py-3 ring-1 ring-border/40">
                        ✓ {item}
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    Notes, sex logs, food, bowel, mood, workouts, sleep, weight and other private data are not shown
                    here. Period and cycle data are shared only for the Blueberry calendar.
                  </p>
                </SectionCard>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
