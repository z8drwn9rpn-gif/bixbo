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
    <div className="mt-4">
      <div
        className="grid h-12 grid-cols-3 rounded-full bg-tint/55 p-1 ring-1 ring-border/65"
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
              className="rounded-full px-3 text-sm transition active:scale-[.98]"
              style={{
                background: selected ? "var(--primary)" : "transparent",
                color: selected ? "var(--primary-foreground)" : "var(--muted-foreground)",
                fontWeight: 700,
                boxShadow: selected ? "0 2px 8px rgb(52 68 28 / 0.16)" : "none",
              }}
            >
              {t(label)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid h-11 grid-cols-[42px_minmax(0,1fr)_42px] items-center rounded-full bg-background/60 px-1 ring-1 ring-border/55">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label={`Previous ${unit}`}
          className="grid h-8 w-8 place-self-center place-items-center rounded-full bg-tint/55 text-muted-foreground transition active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 truncate px-2 text-center text-sm text-foreground" style={{ fontWeight: 700 }}>
          {insightPeriodNavigationLabel(value, anchor)}
        </span>
        <button
          type="button"
          onClick={() => onShift(1)}
          aria-label={`Next ${unit}`}
          className="grid h-8 w-8 place-self-center place-items-center rounded-full bg-tint/55 text-muted-foreground transition active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
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
    <div className="mt-4 rounded-2xl bg-tint/30 px-4 py-3.5 ring-1 ring-border/55">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <InsightGlyph kind="bulb" size={17} />
        </span>
        <span className="text-xs uppercase tracking-[0.12em]" style={{ fontWeight: 700 }}>Quick insights</span>
      </div>
      <div className="mt-2.5 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center" style={{ color: item.color ?? "var(--primary)" }}>
              <InsightGlyph kind={item.kind} size={18} />
            </span>
            <p className="text-sm leading-snug text-muted-foreground">{item.text}</p>
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
    <div className="mt-3 grid grid-cols-3 gap-2">
      {items.map((item, index) => (
        <div key={index} className="min-w-0 rounded-2xl bg-background/55 px-3 py-3 ring-1 ring-border/55">
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {item.kind ? (
              <span className="shrink-0" style={{ color: item.color ?? "var(--primary)" }}>
                <InsightGlyph kind={item.kind} size={15} />
              </span>
            ) : null}
            <span className="truncate">{item.label}</span>
          </div>
          <div className="mt-1 truncate text-xl leading-tight text-foreground" style={{ fontWeight: 700 }}>{item.value}</div>
          {item.sub ? <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
