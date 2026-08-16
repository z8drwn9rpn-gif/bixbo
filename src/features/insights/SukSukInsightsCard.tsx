import { useMemo, useState } from "react";
import { ClockIcon, HeartIcon, StarIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { fromKey, isIntercourseKind, todayKey, type BixboData } from "@/lib/storage";
import { DashboardPeriodControl, InsightGlyph } from "./InsightDashboardPrimitives";
import { eachDay, rangeFor, shiftInsightPeriodAnchor, type Period } from "./shared";

type DayItem = { key: string; count: number; times: string[] };

function comparison(current: number, previous: number) {
  const diff = current - previous;
  return { diff, text: diff === 0 ? "— 0" : `${diff > 0 ? "↑ +" : "↓ "}${diff}` };
}

function periodEntries(data: BixboData, period: Period, anchor: Date) {
  const { startK, endK } = rangeFor(period, anchor);
  return eachDay(startK, endK).map<DayItem>((key) => {
    const entries = (data.dayLogs[key]?.sex ?? []).filter((entry) => isIntercourseKind(entry.kind));
    return { key, count: entries.length, times: entries.map((entry) => entry.time).filter((time): time is string => !!time).sort() };
  });
}

function friendlyBlock(times: string[]) {
  const blocks = Array.from(new Set(times.map((time) => {
    const hour = Number(time.split(":")[0]);
    if (!Number.isFinite(hour)) return null;
    if (hour < 6) return "night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }).filter((value): value is string => !!value)));
  if (!blocks.length) return "throughout the day";
  if (blocks.length === 1) return `in the ${blocks[0]}`;
  return `in the ${blocks.slice(0, -1).join(", ")} and ${blocks[blocks.length - 1]}`;
}

function RingCount({ count, selected = false }: { count: number; selected?: boolean }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full text-sm text-foreground" style={{
      fontWeight: 700,
      border: count > 0 ? `${selected ? 5 : 4}px solid ${selected ? "#c93c63" : "#f3a5b8"}` : "2px solid var(--border)",
      background: count > 0 ? "color-mix(in srgb, #f3a5b8 11%, var(--surface))" : "var(--surface)",
      boxShadow: count > 0 ? "inset 0 0 0 3px color-mix(in srgb, #f3a5b8 18%, transparent)" : "none",
    }}>{count > 0 ? count : "–"}</span>
  );
}

export function SukSukInsightsCard({ data }: { data: BixboData }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("W");
  const [anchor, setAnchor] = useState<Date>(() => { const date = fromKey(todayKey()); date.setHours(0, 0, 0, 0); return date; });

  const entries = useMemo(() => periodEntries(data, period, anchor), [anchor, data, period]);
  const previousEntries = useMemo(() => periodEntries(data, period, shiftInsightPeriodAnchor(anchor, period, -1)), [anchor, data, period]);
  const total = entries.reduce((sum, item) => sum + item.count, 0);
  const previousTotal = previousEntries.reduce((sum, item) => sum + item.count, 0);
  const compared = comparison(total, previousTotal);
  const activeDays = entries.filter((item) => item.count > 0).length;
  const bestDay = entries.reduce<DayItem | null>((best, item) => !best || item.count > best.count ? item : best, null);
  const bestDate = bestDay && bestDay.count > 0 ? fromKey(bestDay.key) : null;
  const bestDayName = bestDate ? bestDate.toLocaleDateString("en-GB", { weekday: "long" }) : "—";
  const insightText = bestDay && bestDay.count > 0 ? `You were most intimate ${friendlyBlock(bestDay.times)}.` : "No intimacy moments were logged in this period.";

  const renderWeek = () => <div className="mt-5 grid grid-cols-7 gap-1 text-center">{entries.map((item) => {
    const date = fromKey(item.key);
    const selected = bestDay?.key === item.key && item.count > 0;
    return <div key={item.key} className="flex min-w-0 flex-col items-center">
      <span className="text-xs text-foreground">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
      <span className="mt-0.5 text-xs text-foreground" style={{ fontWeight: 700 }}>{date.getDate()}</span>
      <span className="mt-3"><RingCount count={item.count} selected={selected} /></span>
      <div className="mt-2 min-h-[38px] space-y-0.5 text-[10px] tabular-nums text-foreground">{item.times.slice(0, 3).map((time) => <div key={time}>{time}</div>)}</div>
    </div>;
  })}</div>;

  const renderMonth = () => <div className="mt-5 grid grid-cols-7 gap-x-1 gap-y-3 text-center">{entries.map((item) => {
    const date = fromKey(item.key);
    const selected = bestDay?.key === item.key && item.count > 0;
    return <div key={item.key} className="flex flex-col items-center gap-1"><span className="text-[9px] tabular-nums text-muted-foreground">{date.getDate()}</span><RingCount count={item.count} selected={selected} /></div>;
  })}</div>;

  const renderYear = () => {
    const months = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthEntries = entries.filter((item) => fromKey(item.key).getMonth() === monthIndex);
      return { label: new Date(anchor.getFullYear(), monthIndex, 1).toLocaleDateString("en-GB", { month: "short" }), count: monthEntries.reduce((sum, item) => sum + item.count, 0) };
    });
    const bestMonth = months.reduce((best, item, index, all) => item.count > all[best].count ? index : best, 0);
    return <div className="mt-5 grid grid-cols-4 gap-3">{months.map((item, index) => <div key={item.label} className="flex flex-col items-center gap-1.5"><span className="text-[10px] text-muted-foreground">{item.label}</span><RingCount count={item.count} selected={index === bestMonth && item.count > 0} /></div>)}</div>;
  };

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f6d5df] ring-1 ring-[#efb6c6]"><HeartIcon size={27} /></span>
          <div className="min-w-0"><h3 className="truncate font-serif text-2xl leading-none text-foreground" style={{ fontWeight: 800 }}>ŠUKŠUK!</h3><p className="mt-1 text-sm text-muted-foreground">Intimacy moments</p></div>
        </div>
        <button type="button" aria-label="ŠukŠuk options" className="grid h-9 w-9 place-items-center rounded-full text-xl leading-none text-muted-foreground">•••</button>
      </div>

      <DashboardPeriodControl value={period} onChange={setPeriod} anchor={anchor} onShift={(delta) => setAnchor((current) => shiftInsightPeriodAnchor(current, period, delta))} ariaLabel="ŠukŠuk period" />
      {period === "W" ? renderWeek() : period === "M" ? renderMonth() : renderYear()}

      <div className="mt-5 rounded-2xl bg-tint/30 px-4 py-3.5 ring-1 ring-border/50">
        <div className="flex items-start gap-3"><span className="pt-0.5 text-[#d966b1]" aria-hidden="true"><InsightGlyph kind="star" size={18} /></span><div><p className="text-sm text-foreground" style={{ fontWeight: 700 }}>{bestDate ? `Best day: ${bestDayName}` : "No best day yet"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insightText}</p></div></div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border/60 border-t border-border/55 pt-4">
        <div className="flex min-w-0 items-start gap-2 pr-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f7dce4]"><HeartIcon size={23} /></span><div className="min-w-0"><p className="text-xl leading-none text-foreground" style={{ fontWeight: 800 }}>{total}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("times")} this {period === "W" ? "week" : period === "M" ? "month" : "year"}</p><p className="mt-1 text-[10px] text-muted-foreground">vs last {period === "W" ? "week" : period === "M" ? "month" : "year"} <span style={{ color: compared.diff < 0 ? "#6f8a3e" : compared.diff > 0 ? "#d85f4b" : "var(--muted-foreground)", fontWeight: 700 }}>{compared.text}</span></p></div></div>
        <div className="flex min-w-0 items-start gap-2 px-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/55 text-primary"><ClockIcon size={23} /></span><div className="min-w-0"><p className="text-xl leading-none text-foreground" style={{ fontWeight: 800 }}>{activeDays}</p><p className="mt-1 text-[11px] text-muted-foreground">days with intimacy</p></div></div>
        <div className="flex min-w-0 items-start gap-2 pl-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint/55"><StarIcon size={24} /></span><div className="min-w-0"><p className="truncate text-base leading-tight text-foreground" style={{ fontWeight: 800 }}>{bestDayName}</p><p className="mt-1 text-[11px] text-muted-foreground">best day</p></div></div>
      </div>
    </section>
  );
}
