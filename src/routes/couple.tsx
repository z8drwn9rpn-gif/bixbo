import { useEffect, useMemo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, HeartPulse, Pill, Sparkles, TrendingUp, Users } from "lucide-react";

import { Ico } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import {
  useBixbo,
  setPartner,
  EMPTY,
  todayKey,
  daysBetween,
  addDays,
  fromKey,
  painColor,
  PAIN_DESCRIPTIONS,
  predictPeriods,
  nextPredictedPeriod,
  avgDayPain,
  type PainEntry,
  type PanicAttack,
  type TetanyEpisode,
  type ExtraMed,
  type Med,
  type PartnerData,
  type DayNote,
} from "@/lib/storage";
import { fetchPartner } from "@/lib/cloudSync";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Bixbo Couple" },
      {
        name: "description",
        content: "Share health logs and compare pain, tetany, panic and medication patterns with your partner.",
      },
      { property: "og:title", content: "Bixbo Couple" },
      {
        property: "og:description",
        content: "Partner sharing, health comparison and shared symptom insights.",
      },
    ],
  }),
  component: CouplePage,
});

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

type ComparableDayLog = {
  pain?: PainEntry[];
  panic?: PanicAttack[];
  tetany?: TetanyEpisode[];
  extraMeds?: ExtraMed[];
};

type ComparisonTone = "rose" | "purple" | "blue" | "emerald" | "amber";

const TONES: Record<ComparisonTone, { solid: string; soft: string; border: string; text: string }> = {
  rose: {
    solid: "#f43f5e",
    soft: "rgba(244, 63, 94, 0.12)",
    border: "rgba(244, 63, 94, 0.24)",
    text: "#e11d48",
  },
  purple: {
    solid: "#8b5cf6",
    soft: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.24)",
    text: "#7c3aed",
  },
  blue: {
    solid: "#3b82f6",
    soft: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.24)",
    text: "#2563eb",
  },
  emerald: {
    solid: "#10b981",
    soft: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.24)",
    text: "#059669",
  },
  amber: {
    solid: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.24)",
    text: "#d97706",
  },
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function currentMonthPrefix() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthDaysUntilToday() {
  const prefix = currentMonthPrefix();
  const now = new Date();
  return Array.from({ length: now.getDate() }, (_, index) => {
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
          if (medLog[day]?.[`${med.id}@${time}`]) taken += 1;
        });
      });
  });

  return taken;
}

function formatValue(value: number | null, decimals = 0, unit = "") {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(decimals)}${unit}`;
}

/* -------------------------------------------------------------------------- */
/* Comparison UI                                                              */
/* -------------------------------------------------------------------------- */

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
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
    <article
      className="rounded-3xl border p-4"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.soft,
      }}
    >
      <div
        className="grid h-9 w-9 place-items-center rounded-2xl"
        style={{ color: palette.text, backgroundColor: "rgba(255,255,255,0.5)" }}
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
    <article className="rounded-3xl border p-4" style={{ borderColor: palette.border, backgroundColor: palette.soft }}>
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
          style={{
            color: palette.text,
            backgroundColor: "rgba(255,255,255,0.52)",
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
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-background/70">
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
      <div className="flex items-center gap-4">
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-2"
          style={{
            background: `conic-gradient(#8b5cf6 ${safeScore}%, rgba(139,92,246,.14) ${safeScore}% 100%)`,
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
            Based on shared symptom days, pain averages, panic and tetany during the current month.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Existing detail lists                                                      */
/* -------------------------------------------------------------------------- */

function PainList({ title, entries }: { title: string; entries: (PainEntry & { dateKey: string })[] }) {
  if (entries.length === 0) {
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
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Ico e="🥵" size={16} /> Hot flashes {pain.hotFlashes}/5
                </p>
              ) : null}
              {pain.note && <p className="mt-1 whitespace-pre-line text-sm">"{pain.note}"</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TetanyList({ title, entries }: { title: string; entries: (TetanyEpisode & { dateKey: string })[] }) {
  if (!entries.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((episode) => (
          <li key={`${episode.dateKey}-${episode.id}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {episode.dateKey} · {episode.time} · intensity {episode.intensity}/5 ·{" "}
              {episode.minutes == null ? " ongoing" : ` ${episode.minutes} min`}
            </p>
            {episode.types?.length ? <p>{episode.types.join(", ")}</p> : null}
            {episode.location?.length ? (
              <p className="text-xs text-muted-foreground">Location: {episode.location.join(", ")}</p>
            ) : null}
            {episode.note && <p className="mt-1 whitespace-pre-line">"{episode.note}"</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanicList({ title, entries }: { title: string; entries: (PanicAttack & { dateKey: string })[] }) {
  if (!entries.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map((attack) => (
          <li key={`${attack.dateKey}-${attack.id}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {attack.dateKey} · {attack.time} · intensity {attack.intensity}/10 ·{" "}
              {attack.minutes == null ? " ongoing" : ` ${attack.minutes} min`}
            </p>
            {attack.trigger && <p>Trigger: {attack.trigger}</p>}
            {attack.note && <p className="mt-1 whitespace-pre-line">"{attack.note}"</p>}
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
    return <p className="text-xs text-muted-foreground">No meds logged yet.</p>;
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
                {extra.note ? ` — ${extra.note}` : ""}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayNotesList({ title, notes }: { title: string; notes: { dateKey: string; text: string; time?: string }[] }) {
  if (!notes.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {notes.map((note, index) => (
          <li key={`${note.dateKey}-${note.time ?? index}-${index}`} className="rounded-2xl bg-tint p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {note.dateKey}
              {note.time ? ` · ${note.time}` : ""}
            </p>
            <p className="mt-1 whitespace-pre-line">{note.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pain chart — restored from the previous Couple page                        */
/* -------------------------------------------------------------------------- */

function CouplePainChart({
  days,
  mine,
  theirs,
  partnerName,
}: {
  days: string[];
  mine: Record<string, { pain?: PainEntry[] }>;
  theirs: Record<string, { pain?: PainEntry[] }>;
  partnerName: string;
}) {
  const width = 340;
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
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pain — last 14 days</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Daily average pain. Solid bars are yours; striped bars belong to {partnerName}.
        </p>
      </div>

      <div className="mt-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full"
          role="img"
          aria-label={`Pain comparison between you and ${partnerName} during the last 14 days`}
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
            const weekday = date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);

            return (
              <g key={day}>
                {myValue != null && (
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
                )}

                {partnerValue != null && (
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
                )}

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
  medium: "#D96B94",
  heavy: "#B33B6C",
  "very-heavy": "#7A1F45",
};

function BlueberrySection({ partner }: { partner: PartnerData }) {
  const cycle = partner.cycle;

  if (!cycle?.lastPeriodStart) {
    const anyPeriod = Object.values(partner.dayLogs).some((log) => log.period || log.periodInfo?.level);
    if (!anyPeriod) return null;
  }

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(rangeStart.getDate() - 14);
  const rangeEnd = new Date(monthStart);
  rangeEnd.setMonth(rangeEnd.getMonth() + 2);
  rangeEnd.setDate(0);

  const predicted = cycle ? predictPeriods(cycle, rangeStart, rangeEnd) : [];
  const next = cycle ? nextPredictedPeriod(cycle) : null;

  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const dayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOffset);

  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      key,
      date,
      inMonth: date.getMonth() === today.getMonth(),
    };
  });

  const todayK = todayKey();
  const isPredicted = (key: string) => predicted.some((period) => key >= period.start && key <= period.end);
  const loggedLevel = (key: string) => {
    const log = partner.dayLogs[key];
    return log?.periodInfo?.level || log?.period || null;
  };
  const monthName = today.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

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
        if (permission === "granted") fire();
      });
    }
  }, [next?.start, partner.name]);

  return (
    <section className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border">
      <h3 className="font-serif text-lg font-semibold">
        <Ico e="🫐" size={16} /> {partner.name || "Partner"} — Blueberry
      </h3>

      {next && (
        <div className="space-y-1 rounded-2xl bg-tint p-3 text-sm">
          <p>
            🩸 Next period: <span className="font-semibold">{next.start}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Predicted window: {next.start} → {next.end}
          </p>
        </div>
      )}

      {cycle && (
        <p className="text-xs text-muted-foreground">
          Cycle {cycle.cycleLength}d · period {cycle.periodLength}d
        </p>
      )}

      <div className="rounded-2xl bg-tint p-3">
        <p className="mb-2 text-center text-xs font-medium">{monthName}</p>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={index}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const logged = loggedLevel(cell.key);
            const predictedDay = isPredicted(cell.key) && !logged;
            const background = logged ? PERIOD_COLORS[logged] || "#D96B94" : undefined;

            return (
              <div
                key={cell.key}
                className={`grid aspect-square place-items-center rounded-full text-[10px] ${
                  cell.inMonth ? "" : "opacity-30"
                } ${cell.key === todayK ? "ring-2 ring-primary" : ""}`}
                style={{
                  background,
                  color: logged ? "white" : undefined,
                  border: predictedDay ? "1.5px dashed #D96B94" : undefined,
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

function CouplePage() {
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const partner = view.partner;

  useEffect(() => {
    let cancelled = false;

    fetchPartner()
      .then((partnerData) => {
        if (!cancelled && partnerData) setPartner(partnerData);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const monthDays = useMemo(() => currentMonthDaysUntilToday(), []);

  const collectPain = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PainEntry & { dateKey: string })[] = [];

    for (const day of monthDays) {
      for (const pain of dayLogs[day]?.pain ?? []) {
        output.push({ ...pain, dateKey: day });
      }
    }

    return output
      .sort((a, b) => (b.dateKey === a.dateKey ? b.time.localeCompare(a.time) : b.dateKey.localeCompare(a.dateKey)))
      .slice(0, 30);
  };

  const collectTetany = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (TetanyEpisode & { dateKey: string })[] = [];

    for (const day of monthDays) {
      for (const episode of dayLogs[day]?.tetany ?? []) {
        output.push({ ...episode, dateKey: day });
      }
    }

    return output.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 20);
  };

  const collectPanic = (dayLogs: Record<string, ComparableDayLog>) => {
    const output: (PanicAttack & { dateKey: string })[] = [];

    for (const day of monthDays) {
      for (const attack of dayLogs[day]?.panic ?? []) {
        output.push({ ...attack, dateKey: day });
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

  const collectNotes = (dayNotes: Record<string, DayNote[] | string[] | undefined>) => {
    const output: { dateKey: string; text: string; time?: string }[] = [];

    for (const day of monthDays) {
      for (const note of dayNotes[day] ?? []) {
        if (typeof note === "string") {
          output.push({ dateKey: day, text: note });
        } else if (note.text?.trim()) {
          output.push({ dateKey: day, text: note.text, time: note.time });
        }
      }
    }

    return output.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  };

  const myPain = collectPain(view.dayLogs);
  const myTetany = collectTetany(view.dayLogs);
  const myPanic = collectPanic(view.dayLogs);
  const myMeds = collectMedDays(view.meds, view.medLog, view.dayLogs);
  const myNotes = collectNotes(view.dayNotes);

  const partnerPain = partner ? collectPain(partner.dayLogs) : [];
  const partnerTetany = partner ? collectTetany(partner.dayLogs) : [];
  const partnerPanic = partner ? collectPanic(partner.dayLogs) : [];
  const partnerMeds = partner ? collectMedDays(partner.meds ?? [], partner.medLog ?? {}, partner.dayLogs) : [];
  const partnerNotes = partner ? collectNotes(partner.dayNotes ?? {}) : [];

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

  const chartDays = Array.from({ length: 14 }, (_, index) => addDays(todayKey(), index - 13));

  return (
    <AppShell title="Bixbo Couple">
      <div className="space-y-4 px-5 pb-24 pt-4">
        {!partner ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
            <p className="text-sm font-medium">No partner linked yet.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              In Settings → Couple sharing, exchange pairing codes with your partner to compare your shared health logs.
            </p>
            <Link to="/settings" className="mt-3 inline-block text-sm text-primary underline">
              Open Couple sharing
            </Link>
          </div>
        ) : (
          <>
            {/* Sharing status */}
            <SectionCard
              title="Couple sharing"
              description="Your latest partner snapshot is refreshed whenever this page opens."
            >
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-tint p-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Connected with {partnerName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Current month · {monthDays.length} days compared
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Restored daily pain chart */}
            <CouplePainChart days={chartDays} mine={view.dayLogs} theirs={partner.dayLogs} partnerName={partnerName} />

            {/* Comparison */}
            <SimilarityCard score={similarityScore} partnerName={partnerName} />

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
                label="Panic attacks together"
                value={`${Math.min(myPanic.length, partnerPanic.length)}`}
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
                  tone="rose"
                  icon={<TrendingUp className="h-5 w-5" />}
                />
                <ComparisonBarCard
                  title="Panic attacks"
                  subtitle="Number of attacks logged this month"
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
                  subtitle="Number of episodes logged this month"
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

            {/* Smart insights */}
            <SectionCard
              title="Shared insights"
              description="Simple observations calculated from your current-month logs."
            >
              <div className="mt-4 space-y-2">
                <Insight
                  text={`You both logged symptoms on ${sharedSymptomDays} day${sharedSymptomDays === 1 ? "" : "s"} this month.`}
                />
                <Insight
                  text={
                    myPainAverage != null && partnerPainAverage != null
                      ? `Your average pain differs by ${Math.abs(myPainAverage - partnerPainAverage).toFixed(
                          1,
                        )} points.`
                      : "More pain data is needed to compare your averages."
                  }
                />
                <Insight
                  text={
                    myPanic.length === partnerPanic.length
                      ? `You both logged the same number of panic attacks.`
                      : `${myPanic.length > partnerPanic.length ? "You" : partnerName} logged more panic attacks this month.`
                  }
                />
              </div>
            </SectionCard>

            {/* Partner sharing detail */}
            <SectionCard
              title={`${partnerName} — shared details`}
              description="Recent entries received through Couple sharing."
            >
              <div className="mt-4 space-y-5">
                <PainList title="Pain" entries={partnerPain} />
                <TetanyList title="Tetany" entries={partnerTetany} />
                <PanicList title="Panic attacks" entries={partnerPanic} />
                <MedsList title="Medication" days={partnerMeds} />
                <DayNotesList title="Day notes" notes={partnerNotes} />
              </div>
            </SectionCard>

            {partner.gender !== "male" && <BlueberrySection partner={partner} />}

            {/* My detail */}
            <SectionCard
              title="My shared details"
              description="Your current-month entries shown beside the partner comparison."
            >
              <div className="mt-4 space-y-5">
                <PainList title="Pain" entries={myPain} />
                <TetanyList title="Tetany" entries={myTetany} />
                <PanicList title="Panic attacks" entries={myPanic} />
                <MedsList title="Medication" days={myMeds} />
                <DayNotesList title="Day notes" notes={myNotes} />
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-tint px-4 py-3">
      <span className="mt-0.5 text-sm">✦</span>
      <p className="text-xs leading-relaxed text-foreground/85">{text}</p>
    </div>
  );
}
