import { type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons/BixboIcons";
import { useI18n } from "@/hooks/useI18n";
import { addDays, fromKey, toKey } from "@/lib/storage";

export const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MON_SHORT3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type Period = "W" | "M" | "Y";
export type HeatmapPeriod = "7D" | "30D" | "Y";

export const INSIGHT_COLORS = {
  olive: "#536600",
  oliveLight: "#8EA629",
  green: "#28A85B",
  sage: "#70A65B",
  sageLight: "#A8C96F",
  teal: "#2D9588",
  amber: "#E2A913",
  orange: "#E47B25",
  terracotta: "#D85F4B",
  rose: "#D94F78",
  pinkLight: "#F5A3B7",
  pink: "#E86D8F",
  pinkDeep: "#C93C63",
  plum: "#8756A5",
  muted: "#C9CBA2",
  track: "#D8D9AE",
} as const;

export const VIVID_PAIN_CHART_COLORS = [
  "#72C64A", "#91CD3A", "#B7D12F", "#DFD11F", "#F3C30D", "#F5A20B",
  "#F47B16", "#F05A28", "#EF4444", "#DC2626", "#B91C1C",
] as const;

export const TETANY_COLOR = INSIGHT_COLORS.pinkLight;
export const PANIC_COLOR = INSIGHT_COLORS.pinkDeep;
export const PAIN_ACCENT = "#DC2626";
export const GREEN_SOFT = "rgba(83, 102, 0, 0.08)";
export const GREEN_BORDER = "rgba(83, 102, 0, 0.22)";
export const HOT_FLASH_COLORS = [
  VIVID_PAIN_CHART_COLORS[0], VIVID_PAIN_CHART_COLORS[2], VIVID_PAIN_CHART_COLORS[4],
  VIVID_PAIN_CHART_COLORS[6], VIVID_PAIN_CHART_COLORS[8], VIVID_PAIN_CHART_COLORS[10],
] as const;
export const HOT_FLASH_DESCRIPTIONS: Record<number, string> = {
  1: "Mild warmth", 2: "Warm flush", 3: "Sweating", 4: "Strong wave", 5: "Drenching",
};
export const BRISTOL_MYSTERY_COLOR = "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)";
export const TIME_BLOCK_LABELS = ["Night (0–6)", "Morning (6–12)", "Afternoon (12–18)", "Evening (18–24)"];
export const TIME_BLOCK_SHORT = ["Night", "Morning", "Afternoon", "Evening"];

export function vividPainChartColor(value: number): string {
  return VIVID_PAIN_CHART_COLORS[Math.max(0, Math.min(10, Math.round(value)))];
}

export function fmtTapDay(k: string): string {
  const d = fromKey(k);
  return `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MON_SHORT3[d.getMonth()]}`;
}

export function fmtTapMonth(monthIndex: number, year: number): string {
  return `${MON_SHORT3[monthIndex]} ${year}`;
}

export function fmtCoupleTooltipDay(k: string): string {
  return fromKey(k).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type InsightTooltipDetails = {
  owner?: string;
  heading: string;
  value: string;
  description?: string;
  color: string;
  summary: string;
};

export function InsightFloatingTooltip({ leftPct, details, top = 4, connectorSide = "bottom" }: {
  leftPct: number;
  details: InsightTooltipDetails;
  top?: number;
  connectorSide?: "top" | "bottom";
}) {
  const tooltipWidth = 138;
  const tooltipHeight = 58;
  const connectorHeight = 12;
  const bodyOffsetY = connectorSide === "top" ? connectorHeight : 0;
  const clampedLeft = Math.max(0, Math.min(100, leftPct));
  const placement = clampedLeft < 24 ? "left" : clampedLeft > 76 ? "right" : "center";
  const positionStyle: CSSProperties = placement === "left"
    ? { left: "4px", transform: "none" }
    : placement === "right"
      ? { right: "4px", transform: "none" }
      : { left: `${clampedLeft}%`, transform: "translateX(-50%)" };
  const connectorX = placement === "left"
    ? Math.max(12, Math.min(tooltipWidth - 12, (clampedLeft / 24) * tooltipWidth))
    : placement === "right"
      ? Math.max(12, Math.min(tooltipWidth - 12, tooltipWidth - ((100 - clampedLeft) / 24) * tooltipWidth))
      : tooltipWidth / 2;
  const headingText = `${details.owner ? `${details.owner} · ` : ""}${details.heading}`;
  const heading = headingText.length > 29 ? `${headingText.slice(0, 28).trimEnd()}…` : headingText;
  const valueFontSize = details.value.length > 23 ? 8.5 : details.value.length > 18 ? 10 : 12;
  const description = details.description ?? "";
  const descriptionFontSize = description.length > 31 ? 7 : description.length > 27 ? 7.5 : 8;
  const visibleDescription = description.length > 38 ? `${description.slice(0, 37).trimEnd()}…` : description;

  return (
    <svg width={tooltipWidth} height={tooltipHeight + connectorHeight} viewBox={`0 0 ${tooltipWidth} ${tooltipHeight + connectorHeight}`}
      className="pointer-events-none absolute z-30 overflow-visible" style={{ ...positionStyle, top }} aria-hidden="true">
      <line x1={connectorX} x2={connectorX} y1={connectorSide === "top" ? connectorHeight : tooltipHeight}
        y2={connectorSide === "top" ? 0 : tooltipHeight + connectorHeight} stroke={details.color} strokeWidth="1.25" />
      <rect x="0" y={bodyOffsetY} width={tooltipWidth} height={tooltipHeight} rx="9" fill="var(--surface)" stroke={details.color} strokeWidth="1.4" />
      <circle cx="11" cy={bodyOffsetY + 12} r="3.5" fill={details.color} />
      <text x="19" y={bodyOffsetY + 15} fontSize="8.5" fontWeight="600" fill="var(--foreground)">{heading}</text>
      <text x="10" y={bodyOffsetY + 34} fontSize={valueFontSize} fontWeight="700" fill="var(--foreground)">{details.value}</text>
      {visibleDescription ? <text x="10" y={bodyOffsetY + 49} fontSize={descriptionFontSize} fill="var(--muted-foreground)">{visibleDescription}</text> : null}
    </svg>
  );
}

export function timeBlockOf(time?: string): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  if (Number.isNaN(h)) return null;
  if (h < 6) return 0;
  if (h < 12) return 1;
  if (h < 18) return 2;
  return 3;
}

export function strictAdminNumericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

export function rangeFor(period: Period, anchor: Date) {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);
  if (period === "W") {
    const dow = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startK: toKey(start), endK: toKey(end) };
  }
  if (period === "M") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { startK: toKey(start), endK: toKey(end) };
  }
  return { startK: toKey(new Date(base.getFullYear(), 0, 1)), endK: toKey(new Date(base.getFullYear(), 11, 31)) };
}

export function eachDay(startK: string, endK: string): string[] {
  const out: string[] = [];
  let k = startK;
  while (k <= endK) { out.push(k); k = addDays(k, 1); }
  return out;
}

export function shiftInsightPeriodAnchor(anchor: Date, period: Period, delta: -1 | 1): Date {
  const next = new Date(anchor);
  next.setHours(0, 0, 0, 0);
  if (period === "W") { next.setDate(next.getDate() + delta * 7); return next; }
  if (period === "M") { next.setDate(1); next.setMonth(next.getMonth() + delta); return next; }
  next.setFullYear(next.getFullYear() + delta);
  return next;
}

export function insightPeriodNavigationLabel(period: Period, anchor: Date): string {
  if (period === "Y") return String(anchor.getFullYear());
  if (period === "M") return anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const { startK, endK } = rangeFor("W", anchor);
  const start = fromKey(startK); const end = fromKey(endK);
  const startDay = start.getDate(); const endDay = end.getDate();
  const startMonth = start.toLocaleDateString("en-GB", { month: "short" });
  const endMonth = end.toLocaleDateString("en-GB", { month: "short" });
  if (start.getFullYear() !== end.getFullYear()) return `${startDay} ${startMonth} ${start.getFullYear()} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  if (start.getMonth() !== end.getMonth()) return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  return `${startDay}–${endDay} ${endMonth} ${end.getFullYear()}`;
}

export function InsightPeriodSelect({ value, onChange, ariaLabel }: { value: Period; onChange: (period: Period) => void; ariaLabel: string }) {
  const { t } = useI18n();
  return <div className="grid h-8 w-full grid-cols-3 rounded-xl bg-tint p-0.5 ring-1 ring-border/60 sm:w-[210px]" role="group" aria-label={ariaLabel}>
    {([["W", "Week"], ["M", "Month"], ["Y", "Year"]] as const).map(([period, label]) => {
      const selected = value === period;
      return <button key={period} type="button" onClick={() => onChange(period)} aria-pressed={selected}
        className={`min-w-0 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition ${selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{t(label)}</button>;
    })}
  </div>;
}

export function InsightPeriodControl({ value, onChange, anchor, onShift, ariaLabel }: {
  value: Period; onChange: (period: Period) => void; anchor: Date; onShift: (delta: -1 | 1) => void; ariaLabel: string;
}) {
  const unit = value === "W" ? "week" : value === "M" ? "month" : "year";
  return <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:items-end">
    <InsightPeriodSelect value={value} onChange={onChange} ariaLabel={ariaLabel} />
    <div className="grid h-8 w-full grid-cols-[32px_minmax(0,1fr)_32px] items-center rounded-xl bg-background/70 p-0.5 ring-1 ring-border/60 sm:w-[210px]">
      <button type="button" onClick={() => onShift(-1)} className="grid h-7 w-7 place-self-center place-items-center rounded-lg text-muted-foreground transition hover:bg-tint hover:text-foreground" aria-label={`Previous ${unit}`}><ChevronLeft className="h-3.5 w-3.5" /></button>
      <span className="min-w-0 whitespace-nowrap px-1 text-center text-[10px] font-semibold tabular-nums text-foreground">{insightPeriodNavigationLabel(value, anchor)}</span>
      <button type="button" onClick={() => onShift(1)} className="grid h-7 w-7 place-self-center place-items-center rounded-lg text-muted-foreground transition hover:bg-tint hover:text-foreground" aria-label={`Next ${unit}`}><ChevronRight className="h-3.5 w-3.5" /></button>
    </div>
  </div>;
}

export function TrText({ value }: { value: unknown }) {
  const { t, language } = useI18n();
  const raw = String(value ?? "");
  const exact = t(raw);
  if (exact !== raw) return <>{exact}</>;
  if (language !== "sk") return <>{raw}</>;
  const exactSk: Record<string, string> = {
    Before: "Pred", During: "Počas", After: "Po", "Very-Heavy": "Veľmi silná", "Very heavy": "Veľmi silná",
    Heavy: "Silná", Medium: "Stredná", Light: "Slabá", Spotting: "Špinenie", "Overall improvement": "Celkové zlepšenie",
    "Overall worsening": "Celkové zhoršenie", "No clear change": "Bez jasnej zmeny", "High caffeine (≥200 mg)": "Vysoký príjem kofeínu (≥200 mg)",
    "Tetany episode": "Tetánická epizóda", "Hot flash": "Nával tepla", "Low energy": "Nízka energia", Headache: "Bolesť hlavy",
    "Daily adherence": "Denné dodržiavanie", doses: "dávok", "logged days": "zaznamenaných dní",
  };
  if (exactSk[raw]) return <>{exactSk[raw]}</>;
  const out = raw
    .replace(/^Panic attacks:/, "Panické záchvaty:")
    .replace(/^Medication adherence:/, "Dodržiavanie liekov:")
    .replace(/^Workouts:/, "Cvičenia:")
    .replace(/^Pain: improved/, "Bolesť: zlepšenie")
    .replace(/^Pain: worsened/, "Bolesť: zhoršenie")
    .replace(/^(\d+) logged days$/, "$1 zaznamenaných dní")
    .replace(/^Based on (\d+) logged days in (.+)$/i, "Na základe $1 zaznamenaných dní v $2")
    .replace(/^Based on (\d+) days before and (\d+) days after$/i, "Na základe $1 dní pred a $2 dní po")
    .replace(/^(\d+) before · (\d+) after$/, "$1 pred · $2 po")
    .replace(/^0× in this month$/, "0× v tomto mesiaci")
    .replace(/^(\d+)× in this month$/, "$1× v tomto mesiaci")
    .replace(/^The outcome was (.+) percentage points more common on days with this trigger\.$/, "Výsledok bol o $1 percentuálnych bodov častejší v dňoch s týmto spúšťačom.")
    .replace(/^Based on (\d+) days with and (\d+) days without the trigger\.$/, "Na základe $1 dní so spúšťačom a $2 dní bez spúšťača.")
    .replace(/^Correlations show associations in your logs\. They do not prove that one factor caused another\.$/, "Korelácie ukazujú súvislosti v tvojich záznamoch. Nedokazujú, že jeden faktor spôsobil druhý.")
    .replace(/^This shows an association in your logs, not proof that the selected trigger caused the outcome\.$/, "Toto ukazuje súvislosť v tvojich záznamoch, nie dôkaz, že vybraný spúšťač spôsobil výsledok.")
    .replace(/^Compare how often an outcome occurred on days with and without a possible trigger\.$/, "Porovnaj, ako často sa výsledok objavil v dňoch s možným spúšťačom a bez neho.")
    .replace(/^Automatically ranked associations calculated only from your own logs\.$/, "Automaticky zoradené súvislosti vypočítané iba z tvojich vlastných záznamov.");
  if (out.includes(" → ")) { const [a, b] = out.split(" → "); return <>{t(a)} → {t(b)}</>; }
  return <>{out}</>;
}