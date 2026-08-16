import { Children, isValidElement, type ReactNode } from "react";
import { Equal, Info, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PAIN_DESCRIPTIONS } from "@/lib/storage";
import {
  clampPercent,
  formatValue,
  TONES,
  type ComparisonTone,
} from "./coupleUtils";

type ComparisonMetric = {
  title: string;
  subtitle: string;
  mine: number | null;
  theirs: number | null;
  max?: number;
  mineLabel: string;
  partnerLabel: string;
  tone: ComparisonTone;
  decimals: number;
  unit: string;
  icon: ReactNode;
};

type Outcome = "better" | "worse" | "similar";

type CandidateProps = {
  children?: ReactNode;
  title?: unknown;
  subtitle?: unknown;
  mine?: unknown;
  theirs?: unknown;
  max?: unknown;
  mineLabel?: unknown;
  partnerLabel?: unknown;
  tone?: unknown;
  decimals?: unknown;
  unit?: unknown;
  icon?: ReactNode;
};

const PARTNER_COLOR = "#4d7ee8";

function toComparisonMetric(props: CandidateProps): ComparisonMetric | null {
  const { title, subtitle, mine, theirs, mineLabel, partnerLabel, tone } = props;

  if (
    typeof title !== "string" ||
    typeof subtitle !== "string" ||
    (typeof mine !== "number" && mine !== null) ||
    (typeof theirs !== "number" && theirs !== null) ||
    typeof mineLabel !== "string" ||
    typeof partnerLabel !== "string" ||
    typeof tone !== "string" ||
    !(tone in TONES)
  ) {
    return null;
  }

  return {
    title,
    subtitle,
    mine,
    theirs,
    max: typeof props.max === "number" ? props.max : undefined,
    mineLabel,
    partnerLabel,
    tone: tone as ComparisonTone,
    decimals: typeof props.decimals === "number" ? props.decimals : 0,
    unit: typeof props.unit === "string" ? props.unit : "",
    icon: props.icon,
  };
}

function collectComparisonMetrics(node: ReactNode): ComparisonMetric[] {
  const metrics: ComparisonMetric[] = [];

  const visit = (children: ReactNode) => {
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as CandidateProps;
      const metric = toComparisonMetric(props);
      if (metric) metrics.push(metric);
      if (props.children) visit(props.children);
    });
  };

  visit(node);
  return metrics;
}

function outcomeFor(metric: ComparisonMetric): Outcome {
  if (metric.mine == null || metric.theirs == null || metric.mine === metric.theirs) {
    return "similar";
  }
  return metric.mine < metric.theirs ? "better" : "worse";
}

function comparisonStrength(metric: ComparisonMetric) {
  if (metric.mine == null || metric.theirs == null) return 0;
  return Math.abs(metric.mine - metric.theirs) / Math.max(1, Math.abs(metric.theirs));
}

function metricPercent(metric: ComparisonMetric, value: number | null) {
  if (value == null) return 0;
  const fallbackMax = Math.max(
    1,
    Math.abs(metric.mine ?? 0),
    Math.abs(metric.theirs ?? 0),
  );
  return clampPercent((Math.max(0, value) / (metric.max ?? fallbackMax)) * 100);
}

function painDescription(value: number | null) {
  if (value == null) return "No data";
  const index = Math.max(0, Math.min(10, Math.round(value)));
  return PAIN_DESCRIPTIONS[index] ?? "Pain";
}

function AggregateShape({ percent, color }: { percent: number; color: string }) {
  const y = 36 - (clampPercent(percent) / 100) * 24;
  const y2 = Math.max(5, Math.min(38, y + 3));
  const y3 = Math.max(5, Math.min(38, y - 2));
  const path = `M 0 40 L 0 ${y} C 16 ${y - 3}, 28 ${y2}, 44 ${y2} C 61 ${y2}, 70 ${y3}, 86 ${y3} C 101 ${y3}, 109 ${y + 2}, 120 ${y + 1} L 120 40 Z`;
  const line = `M 0 ${y} C 16 ${y - 3}, 28 ${y2}, 44 ${y2} C 61 ${y2}, 70 ${y3}, 86 ${y3} C 101 ${y3}, 109 ${y + 2}, 120 ${y + 1}`;

  return (
    <svg viewBox="0 0 120 40" className="h-12 w-full" aria-hidden="true">
      <path d={path} fill={color} opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OutcomePill({ outcome }: { outcome: Outcome }) {
  const classes =
    outcome === "better"
      ? "bg-emerald-500/10 text-emerald-700"
      : outcome === "worse"
        ? "bg-rose-500/10 text-rose-600"
        : "bg-violet-500/10 text-violet-600";
  const label = outcome === "better" ? "Better" : outcome === "worse" ? "Worse" : "Similar";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function SummaryMetric({ label, count, tone }: { label: string; count: number; tone: Outcome }) {
  const color =
    tone === "better"
      ? "text-emerald-700"
      : tone === "worse"
        ? "text-rose-600"
        : "text-violet-600";
  const bg =
    tone === "better"
      ? "bg-emerald-500/10"
      : tone === "worse"
        ? "bg-rose-500/10"
        : "bg-violet-500/10";
  const Icon = tone === "better" ? TrendingUp : tone === "worse" ? TrendingDown : Equal;

  return (
    <div className="flex min-w-0 items-center justify-between gap-1.5 px-2.5 py-2.5">
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold ${color}`}>{label}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{count}</p>
        <p className="text-[9px] text-muted-foreground">{count === 1 ? "metric" : "metrics"}</p>
      </div>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${bg} ${color}`}>
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </span>
    </div>
  );
}

function HighlightMetric({ label, metric }: { label: string; metric: ComparisonMetric | null }) {
  const palette = metric ? TONES[metric.tone] : TONES.green;

  if (!metric) {
    return (
      <div className="min-w-0 px-3 py-3">
        <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs font-semibold text-foreground">No comparison yet</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 px-3 py-3">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/90"
        style={{ color: palette.text }}
      >
        {metric.icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold" style={{ color: palette.text }}>
          {label}
        </p>
        <p className="truncate text-xs font-bold text-foreground">{metric.title}</p>
        <p
          className="mt-0.5 truncate text-[11px] font-semibold"
          style={{ color: palette.text }}
        >
          {formatValue(metric.mine, metric.decimals, metric.unit)}{" "}
          <span className="font-normal text-muted-foreground">vs</span>{" "}
          {formatValue(metric.theirs, metric.decimals, metric.unit)}
        </p>
      </div>
    </div>
  );
}

function FeaturedComparison({ metric }: { metric: ComparisonMetric }) {
  const { t } = useI18n();
  const palette = TONES[metric.tone];
  const outcome = outcomeFor(metric);
  const minePercent = metricPercent(metric, metric.mine);
  const theirsPercent = metricPercent(metric, metric.theirs);
  const difference =
    metric.mine != null && metric.theirs != null ? metric.mine - metric.theirs : null;
  const direction =
    difference == null ? "" : difference > 0 ? "higher" : difference < 0 ? "lower" : "the same";
  const absoluteDifference = difference == null ? null : Math.abs(difference);

  return (
    <article className="rounded-[1.75rem] bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: palette.soft, color: palette.text }}
        >
          {metric.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground">{t(metric.title)}</h3>
          <p className="text-xs text-muted-foreground">{t("Lower is better")}</p>
        </div>
        <OutcomePill outcome={outcome} />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: palette.text }}>
            {t(metric.mineLabel)}
          </p>
          <p className="mt-1 whitespace-nowrap text-[2.25rem] font-bold leading-none tabular-nums text-foreground">
            {metric.mine == null ? "—" : metric.mine.toFixed(metric.decimals)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">{metric.unit}</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background ring-1 ring-border/40">
            <div
              className="h-full rounded-full"
              style={{ width: `${minePercent}%`, backgroundColor: palette.solid }}
            />
          </div>
          <p className="mt-1 text-[10px] font-medium" style={{ color: palette.text }}>
            {t(painDescription(metric.mine))}
          </p>
          <div className="mt-2">
            <AggregateShape percent={minePercent} color={palette.solid} />
          </div>
        </div>

        <div className="relative flex w-7 items-center justify-center">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
          <span className="relative grid h-7 w-7 place-items-center rounded-full bg-surface text-[9px] font-semibold uppercase text-muted-foreground ring-1 ring-border">
            vs
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: PARTNER_COLOR }}>
            {t(metric.partnerLabel)}
          </p>
          <p className="mt-1 whitespace-nowrap text-[2.25rem] font-bold leading-none tabular-nums text-foreground">
            {metric.theirs == null ? "—" : metric.theirs.toFixed(metric.decimals)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">{metric.unit}</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background ring-1 ring-border/40">
            <div
              className="h-full rounded-full"
              style={{ width: `${theirsPercent}%`, backgroundColor: PARTNER_COLOR }}
            />
          </div>
          <p className="mt-1 text-[10px] font-medium" style={{ color: PARTNER_COLOR }}>
            {t(painDescription(metric.theirs))}
          </p>
          <div className="mt-2">
            <AggregateShape percent={theirsPercent} color={PARTNER_COLOR} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/40">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {difference == null ? (
            t("Not enough data to compare this metric yet.")
          ) : difference === 0 ? (
            t("Your averages are the same this month.")
          ) : (
            <>
              <b className="text-foreground">{t("Tip:")}</b> {t(metric.mineLabel)}{" "}
              {t("average")} {absoluteDifference?.toFixed(metric.decimals)} {t("points")} {t(direction)}{" "}
              {t("than")} {t(metric.partnerLabel)} {t("this month")}.
            </>
          )}
        </p>
      </div>
    </article>
  );
}

function MiniMetricCard({ metric }: { metric: ComparisonMetric }) {
  const { t } = useI18n();
  const palette = TONES[metric.tone];
  const minePercent = metricPercent(metric, metric.mine);
  const theirsPercent = metricPercent(metric, metric.theirs);
  const isMedication = metric.title === "Medication doses";

  return (
    <article className="min-w-0 rounded-[1.35rem] bg-surface px-2 py-2.5 shadow-sm ring-1 ring-border/80">
      <span
        className="grid h-7 w-7 place-items-center rounded-full"
        style={{ backgroundColor: palette.soft, color: palette.text }}
      >
        {metric.icon}
      </span>
      <h4 className="mt-1.5 min-h-8 text-[9px] font-bold leading-tight text-foreground">
        {t(metric.title)}
      </h4>
      <p className="min-h-5 text-[7px] leading-tight text-muted-foreground">
        {t(isMedication ? "Consistency matters" : "Lower is better")}
      </p>
      <div className="mt-1.5 flex items-baseline gap-0.5 text-[8px] text-muted-foreground">
        <span className="text-base font-bold tabular-nums" style={{ color: palette.text }}>
          {metric.mine == null ? "—" : metric.mine.toFixed(metric.decimals)}
        </span>
        <span>vs</span>
        <span className="text-base font-bold tabular-nums" style={{ color: PARTNER_COLOR }}>
          {metric.theirs == null ? "—" : metric.theirs.toFixed(metric.decimals)}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        <div className="h-1 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full"
            style={{ width: `${minePercent}%`, backgroundColor: palette.solid }}
          />
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full"
            style={{ width: `${theirsPercent}%`, backgroundColor: PARTNER_COLOR }}
          />
        </div>
      </div>
    </article>
  );
}

export function CoupleComparisonDashboard({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const metrics = collectComparisonMetrics(children);
  if (!metrics.length) return <>{children}</>;

  const featured = metrics.find((metric) => metric.title === "Average pain") ?? metrics[0];
  const miniMetrics = metrics.filter((metric) => metric !== featured).slice(0, 4);
  const scoredMetrics = metrics.filter((metric) => metric.title !== "Medication doses");
  const outcomes = scoredMetrics.map((metric) => ({ metric, outcome: outcomeFor(metric) }));
  const better = outcomes.filter((item) => item.outcome === "better");
  const worse = outcomes.filter((item) => item.outcome === "worse");
  const similar = outcomes.filter((item) => item.outcome === "similar");
  const bestMetric =
    better
      .slice()
      .sort((a, b) => comparisonStrength(b.metric) - comparisonStrength(a.metric))[0]?.metric ?? null;
  const worstMetric =
    worse
      .slice()
      .sort((a, b) => comparisonStrength(b.metric) - comparisonStrength(a.metric))[0]?.metric ?? null;
  const mineLabel = featured.mineLabel;
  const partnerLabel = featured.partnerLabel;

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            {t("Couple comparison")}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t("See how")} {t(mineLabel).toLowerCase()} {t("and")} {t(partnerLabel)} {t("are doing")}
          </p>
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm ring-1 ring-border/70"
          aria-hidden="true"
        >
          <Info className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] bg-surface shadow-sm ring-1 ring-border/80">
        <div className="grid grid-cols-3 divide-x divide-border/60">
          <SummaryMetric label={t("Better")} count={better.length} tone="better" />
          <SummaryMetric label={t("Worse")} count={worse.length} tone="worse" />
          <SummaryMetric label={t("Similar")} count={similar.length} tone="similar" />
        </div>
        <div className="mx-3 border-t border-border/60" />
        <div className="grid grid-cols-2 divide-x divide-border/60 bg-tint/55">
          <HighlightMetric label={t("Your best")} metric={bestMetric} />
          <HighlightMetric label={t("Your worst")} metric={worstMetric} />
        </div>
      </div>

      <FeaturedComparison metric={featured} />

      {miniMetrics.length ? (
        <div className="grid grid-cols-4 gap-1.5">
          {miniMetrics.map((metric) => (
            <MiniMetricCard key={metric.title} metric={metric} />
          ))}
        </div>
      ) : null}

      {miniMetrics.length > 1 ? (
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-border" />
        </div>
      ) : null}
    </section>
  );
}
