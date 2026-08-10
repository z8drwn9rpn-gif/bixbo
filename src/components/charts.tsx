import { useEffect, useRef, useState } from "react";

/**
 * Shared chart primitives used by every chart on the Insights page.
 * Keeps padding, fonts, gridlines, tooltip styling, colors and
 * animation timing identical across pain / weight / temperature /
 * sleep / hot-flash / heatmap / period / time-of-day charts.
 *
 * Color tokens fall back gracefully if `--chart-*` tokens aren't
 * defined yet in styles.css.
 */

export const CHART_GRID = "var(--chart-grid, var(--border))";
export const CHART_AXIS = "var(--chart-axis, var(--muted-foreground))";
export const CHART_TOOLTIP_BG = "var(--chart-tooltip-bg, var(--popover))";
export const CHART_TOOLTIP_FG = "var(--chart-tooltip-fg, var(--popover-foreground))";

/** Shared geometry/animation constants so every chart feels identical. */
export const CHART_BAR_RADIUS = 4;
export const CHART_STROKE_WIDTH = 2.5;
export const CHART_DOT_STROKE_WIDTH = 2;
export const CHART_ANIM_MS = 260;
export const CHART_TICK_FONT_SIZE = 10;
export const CHART_AXIS_LABEL_FONT_SIZE = 9;

/** Respect prefers-reduced-motion so bars/lines don't transition. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

/** CSS transition string honouring reduced-motion; use on bars/lines/points. */
export function useChartTransition(props = "height, opacity"): string {
  const reduced = usePrefersReducedMotion();
  return reduced ? "none" : `${props} ${CHART_ANIM_MS}ms ease`;
}

/** Dismiss any open tap-tooltip when the user taps anywhere else on the page. */
export function useDismissTapTooltip(clear: () => void) {
  const clearRef = useRef(clear);

  useEffect(() => {
    clearRef.current = clear;
  }, [clear]);

  useEffect(() => {
    const handler = () => clearRef.current();
    document.addEventListener("pointerdown", handler, { passive: true });
    return () => document.removeEventListener("pointerdown", handler);
  }, []);
}

/**
 * Consistent card wrapper for every chart section: same corner radius,
 * padding, ring, title/subtitle typography and an optional right-side
 * control slot (e.g. Week/Month toggle, range switch).
 */
export function ChartCard({
  title,
  subtitle,
  right,
  children,
  className = "",
  style,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80 ${className}`}
      style={style}
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-2">
          {title && <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>}
          {right}
        </div>
      )}
      {subtitle}
      {children}
    </section>
  );
}

/** Consistent "no data yet" empty state used by every chart. */
export function ChartEmpty({ message = "No data yet" }: { message?: string }) {
  return (
    <div
      className="flex min-h-24 items-center justify-center rounded-2xl bg-tint/55 px-4 py-5 text-center ring-1 ring-border/40"
      role="status"
    >
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Small floating bubble used for every "tap a bar/point/day" tooltip.
 * Same styling everywhere: uses chart-tooltip tokens (with sensible
 * popover fallback) instead of hardcoded foreground/background colors.
 */
export function ChartTooltip({ leftPct, text }: { leftPct: number; text: string }) {
  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[min(18rem,90vw)] -translate-x-1/2 -translate-y-full whitespace-normal rounded-xl px-2.5 py-1.5 text-center text-[11px] font-medium shadow-lg ring-1 ring-border/60"
      style={{
        left: `${Math.min(94, Math.max(6, leftPct))}%`,
        top: -6,
        background: CHART_TOOLTIP_BG,
        color: CHART_TOOLTIP_FG,
      }}
    >
      {text}
    </div>
  );
}

/** Same tooltip, but for use inside an <svg> (line charts). */
export function ChartSvgTooltip({ x, y, width, text }: { x: number; y: number; width: number; text: string }) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={width} height={22} rx={6} fill={CHART_TOOLTIP_BG} className="ring-1 ring-border/40" />
      <text
        x={x + width / 2}
        y={y + 15}
        textAnchor="middle"
        fontSize={CHART_TICK_FONT_SIZE - 0.5}
        fill={CHART_TOOLTIP_FG}
      >
        {text}
      </text>
    </g>
  );
}

export type ChartBar = { value?: number; label: string; sub?: string };

/**
 * Shared bar-chart layout: labelled Y axis, dashed gridlines, tappable
 * bars with a floating tooltip, and X axis labels — identical padding,
 * font sizes and gridline styling used by every bar chart on this page
 * (pain, sleep, and any future bar chart).
 */
export function BarChartFrame({
  bars,
  yLabels,
  yMax,
  height = 140,
  colorFor,
  tooltipText,
  axisLabel,
  periodLabel,
  emptyMessage,
}: {
  bars: ChartBar[];
  yLabels: number[];
  yMax: number;
  height?: number;
  colorFor: (value: number, index: number) => string;
  tooltipText: (index: number, value: number) => string;
  axisLabel?: string;
  periodLabel?: string;
  emptyMessage?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  useDismissTapTooltip(() => setActive(null));
  const transition = useChartTransition("height");
  const allEmpty = bars.every((b) => b.value == null);

  return (
    <div className="mt-4">
      <div className="flex gap-1.5">
        <div className="flex flex-col items-end pr-1" style={{ height }}>
          <div className="flex h-full flex-col justify-between text-[10px] font-medium text-muted-foreground">
            {yLabels.map((y) => (
              <span key={y} className="leading-none tabular-nums">
                {y}
              </span>
            ))}
          </div>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {yLabels.map((y) => (
              <div key={y} className="border-t border-dashed" style={{ borderColor: CHART_GRID }} />
            ))}
          </div>
          <div
            className="relative grid items-end gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))`, height }}
          >
            {bars.map((b, i) =>
              b.value != null ? (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(active === i ? null : i);
                  }}
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (b.value / yMax) * 100)}%`,
                    background: colorFor(b.value, i),
                    transition,
                  }}
                />
              ) : (
                <div key={i} className="h-[2px] w-full self-end rounded bg-tint/60" />
              ),
            )}
            {active != null && bars[active]?.value != null && (
              <ChartTooltip
                leftPct={((active + 0.5) / bars.length) * 100}
                text={tooltipText(active, bars[active].value!)}
              />
            )}
          </div>
        </div>
      </div>
      <div className="mt-1 flex pl-5">
        <div
          className="grid flex-1 gap-[2px] text-center text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, bars.length)}, minmax(0, 1fr))` }}
        >
          {bars.map((b, i) => (
            <div key={i} className="leading-tight">
              <div className="tabular-nums">{b.label}</div>
              {b.sub && <div className="text-[10px] opacity-70 tabular-nums">{b.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      {(axisLabel || periodLabel) && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{axisLabel}</span>
          <span>{periodLabel}</span>
        </div>
      )}
      {allEmpty && emptyMessage && <p className="mt-2 text-center text-xs text-muted-foreground">{emptyMessage}</p>}
    </div>
  );
}
