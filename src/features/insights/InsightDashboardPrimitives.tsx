import type { ReactNode, SVGProps } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { insightPeriodNavigationLabel, type Period } from "./shared";

export type InsightGlyphKind =
  | "bulb"
  | "target"
  | "bars"
  | "leaf"
  | "moon"
  | "heart"
  | "clock"
  | "star"
  | "flame"
  | "trend"
  | "check";

export function InsightGlyph({
  kind,
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { kind: InsightGlyphKind; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "bulb") return <svg {...common} {...props}><path d="M9 18h6M10 22h4"/><path d="M8.5 15.5C6.9 14.3 6 12.5 6 10.3A6 6 0 0 1 18 10.3c0 2.2-.9 4-2.5 5.2-.9.7-1.5 1.5-1.5 2.5h-4c0-1-.6-1.8-1.5-2.5Z"/></svg>;
  if (kind === "target") return <svg {...common} {...props}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><path d="m16.5 7.5 4-4M17.5 3.5h3v3"/></svg>;
  if (kind === "bars") return <svg {...common} {...props}><path d="M5 20v-6M10 20V9M15 20V5M20 20V2"/></svg>;
  if (kind === "leaf") return <svg {...common} {...props}><path d="M20 4C11 4 5 8 5 15c0 2.5 1.7 4.5 4.2 4.5C16 19.5 19.5 12 20 4Z"/><path d="M4 21c3-5 7-8 12-11"/></svg>;
  if (kind === "moon") return <svg {...common} {...props}><path d="M20 15.2A8 8 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z" fill="currentColor" stroke="none"/></svg>;
  if (kind === "heart") return <svg {...common} {...props}><path d="M20.8 5.8c-2-2-5.2-2-7.2 0L12 7.4l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8a5.1 5.1 0 0 0 0-7.2Z"/></svg>;
  if (kind === "clock") return <svg {...common} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  if (kind === "star") return <svg {...common} {...props}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z"/></svg>;
  if (kind === "flame") return <svg {...common} {...props}><path d="M13.5 2.8c.6 3.3-1.2 4.8-2.7 6.4-1.5 1.5-2.7 3.1-1.8 5.6.7-1.3 1.7-2.2 3.1-3.1-.2 3.2 1.6 4.1 1.6 6.2 0 2.2-1.8 4-4.2 4C5.9 21.9 3 19 3 15.4c0-5.7 5-8.4 10.5-12.6Z"/><path d="M14 21.4c3.8-.6 6.6-3.7 6.6-7.5 0-2.9-1.5-5.2-4.1-7.5.1 3.3-1.3 4.8-2.8 6.2"/></svg>;
  if (kind === "trend") return <svg {...common} {...props}><path d="m4 17 5-5 4 3 7-8"/><path d="M16 7h4v4"/></svg>;
  return <svg {...common} {...props}><path d="m5 12 4 4L19 6"/></svg>;
}

export function DashboardPeriodControl({
  value,
  onChange,
  anchor,
  onShift,
  ariaLabel,
}: {
  value: Period;
  onChange: (period: Period) => void;
  anchor: Date;
  onShift: (delta: -1 | 1) => void;
  ariaLabel: string;
}) {
  const { t } = useI18n();
  const unit = value === "W" ? "week" : value === "M" ? "month" : "year";
  return (
    <div className="mt-3">
      <div
        className="grid h-8 w-full grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60"
        role="group"
        aria-label={ariaLabel}
      >
        {([["W", "Week"], ["M", "Month"], ["Y", "Year"]] as const).map(([period, label]) => {
          const selected = value === period;
          return (
            <button
              key={period}
              type="button"
              onClick={() => onChange(period)}
              aria-pressed={selected}
              className={`min-w-0 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition active:scale-[.98] ${selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t(label)}
            </button>
          );
        })}
      </div>
      <div className="mt-1 grid h-8 w-full grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label={`Previous ${unit}`}
          className="grid h-7 w-7 place-self-center place-items-center rounded-lg text-muted-foreground transition hover:bg-tint hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-0 whitespace-nowrap px-1 text-center text-[10px] font-semibold tabular-nums text-foreground">
          {insightPeriodNavigationLabel(value, anchor)}
        </span>
        <button
          type="button"
          onClick={() => onShift(1)}
          aria-label={`Next ${unit}`}
          className="grid h-7 w-7 place-self-center place-items-center rounded-lg text-muted-foreground transition hover:bg-tint hover:text-foreground active:scale-95"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export type QuickInsightItem = {
  text: ReactNode;
  kind: InsightGlyphKind;
  color?: string;
};

export function QuickInsights({ items }: { items: QuickInsightItem[] }) {
  return (
    <div className="mt-3 rounded-2xl bg-tint/30 px-3 py-3 ring-1 ring-border/55">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <InsightGlyph kind="bulb" size={15} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.1em]" style={{ fontWeight: 700 }}>Quick insights</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center" style={{ color: item.color ?? "var(--primary)" }}>
              <InsightGlyph kind={item.kind} size={15} />
            </span>
            <p className="text-xs leading-snug text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export type MetricCardItem = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  kind?: InsightGlyphKind;
  color?: string;
};

export function MetricCards({ items }: { items: MetricCardItem[] }) {
  return (
    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="min-w-0 rounded-xl bg-background/55 px-2 py-2.5 ring-1 ring-border/55">
          <div className="flex min-w-0 items-center gap-1 text-[8px] uppercase tracking-[0.04em] text-muted-foreground">
            {item.kind ? (
              <span className="shrink-0" style={{ color: item.color ?? "var(--primary)" }}>
                <InsightGlyph kind={item.kind} size={12} />
              </span>
            ) : null}
            <span className="whitespace-nowrap">{item.label}</span>
          </div>
          <div className="mt-1 whitespace-nowrap text-[15px] leading-none text-foreground" style={{ fontWeight: 700 }}>{item.value}</div>
          {item.sub ? <div className="mt-1 whitespace-nowrap text-[9px] leading-none text-muted-foreground">{item.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
