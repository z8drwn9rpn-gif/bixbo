import { useMemo, useState } from "react";
import { ClockIcon, HeartIcon, StarIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { fromKey, isIntercourseKind, todayKey, type BixboData } from "@/lib/storage";
import { DashboardPeriodControl, InsightGlyph } from "./InsightDashboardPrimitives";
import { eachDay, rangeFor, shiftInsightPeriodAnchor, type Period } from "./shared";

type DayItem = { key: string; count: number; times: string[]; painDuringCount: number };

function comparison(current: number, previous: number) {
  const diff = current - previous;
  return { diff, text: diff === 0 ? "— 0" : `${diff > 0 ? "↑ +" : "↓ "}${diff}` };
}

function periodEntries(data: BixboData, period: Period, anchor: Date) {
  const { startK, endK } = rangeFor(period, anchor);
  return eachDay(startK, endK).map<DayItem>((key) => {
    const entries = (data.dayLogs[key]?.sex ?? []).filter((entry) => isIntercourseKind(entry.kind));
    const painDuringCount = entries.filter((entry) => {
      const extended = entry as typeof entry & { painWhenUi?: "during" | "after" | "both" };
      if (extended.painWhenUi) return extended.painWhenUi === "during" || extended.painWhenUi === "both";
      return entry.painful === "during";
    }).length;
    return {
      key,
      count: entries.length,
      times: entries.map((entry) => entry.time).filter((time): time is string => !!time).sort(),
      painDuringCount,
    };
  });
}

function friendlyBlock(times: string[]) {
  const blocks: string[] = [];
  times.forEach((time) => {
    const hour = Number(time.split(":")[0]);
    if (!Number.isFinite(hour)) return;
    if (hour < 6) blocks.push("night");
    else if (hour < 12) blocks.push("morning");
    else if (hour < 18) blocks.push("afternoon");
    else blocks.push("evening");
  });
  const unique = Array.from(new Set(blocks));
  if (!unique.length) return "throughout the day";
  if (unique.length === 1) return `in the ${unique[0]}`;
  return `in the ${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
}

function RingCount({ count, selected = false }: { count: number; selected?: boolean }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] text-foreground" style={{
      fontWeight: 700,
      border: count > 0 ? `${selected ? 4 : 3}px solid ${selected ? "#c93c63" : "#ee86a3"}` : "2px solid var(--border)",
      background: count > 0 ? "color-mix(in srgb, #f38fac 38%, var(--surface))" : "var(--surface)",
      boxShadow: count > 0 ? "inset 0 0 0 2px color-mix(in srgb, #f05f8a 32%, transparent), 0 2px 5px color-mix(in srgb, #d85d82 18%, transparent)" : "none",
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
  const painDuringTotal = entries.reduce((sum, item) => sum + item.painDuringCount, 0);
  const painDuringRate = total > 0 ? Math.round((painDuringTotal / total) * 100) : null;
  const bestDay = entries.reduce<DayItem | null>((best, item) => !best || item.count > best.count ? item : best, null);
  const bestDate = bestDay && bestDay.count > 0 ? fromKey(bestDay.key) : null;
  const bestDayName = bestDate ? bestDate.toLocaleDateString("en-GB", { weekday: "long" }) : "—";
  const insightText = bestDay && bestDay.count > 0 ? `You were most intimate ${friendlyBlock(bestDay.times)}.` : "No intimacy moments were logged in this period.";
  const painInsightText = painDuringRate == null ? "—" : `${painDuringTotal} of ${total} times · ${painDuringRate}%`;

  const renderWeek = () => <div className="mt-3 grid grid-cols-7 gap-1 text-center">{entries.map((item) => {
    const date = fromKey(item.key);
    const selected = bestDay?.key === item.key && item.count > 0;
    return <div key={item.key} className="flex min-w-0 flex-col items-center">
      <span className="text-[10px] text-foreground">{date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
      <span className="text-[10px] text-foreground" style={{ fontWeight: 700 }}>{date.getDate()}</span>
      <span className="mt-2"><RingCount count={item.count} selected={selected} /></span>
      <div className="mt-1.5 min-h-[30px] space-y-0.5 text-[9px] tabular-nums text-foreground">{item.times.slice(0, 3).map((time) => <div key={time}>{time}</div>)}</div>
    </div>;
  })}</div>;

  const renderMonth = () => <div className="mt-3 grid grid-cols-7 gap-x-1 gap-y-2 text-center">{entries.map((item) => {
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
    return <div className="mt-3 grid grid-cols-4 gap-2">{months.map((item, index) => <div key={item.label} className="flex flex-col items-center gap-1"><span className="text-[10px] text-muted-foreground">{item.label}</span><RingCount count={item.count} selected={index === bestMonth && item.count > 0} /></div>)}</div>;
  };

  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f6d5df] ring-1 ring-[#efb6c6]"><HeartIcon size={23} /></span>
          <div className="min-w-0"><h3 className="whitespace-nowrap font-serif text-xl leading-none text-foreground" style={{ fontWeight: 800 }}>ŠUKŠUK!</h3><p className="mt-1 text-xs text-muted-foreground">Intimacy moments</p></div>
        </div>
      </div>

      <DashboardPeriodControl value={period} onChange={setPeriod} anchor={anchor} onShift={(delta) => setAnchor((current) => shiftInsightPeriodAnchor(current, period, delta))} ariaLabel="ŠukŠuk period" />
      {period === "W" ? renderWeek() : period === "M" ? renderMonth() : renderYear()}

      <div className="mt-3 rounded-xl bg-tint/30 px-3 py-2.5 ring-1 ring-border/50">
        <div className="flex items-start gap-2">
          <span className="pt-0.5 text-[#d966b1]" aria-hidden="true"><InsightGlyph kind="star" size={15} /></span>
          <div className="min-w-0 flex-1">
            <p className="whitespace-nowrap text-xs text-foreground" style={{ fontWeight: 700 }}>{bestDate ? `Best day: ${bestDayName}` : "No best day yet"}</p>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{insightText}</p>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/45 pt-2">
              <span className="text-[10px] font-semibold text-foreground">Pain during sex</span>
              <span className="whitespace-nowrap text-[10px] font-semibold text-muted-foreground">{painInsightText}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-xl bg-background/35 py-2.5 ring-1 ring-border/45">
        <div className="min-w-0 px-1.5 text-center">
          <div className="flex items-center justify-center gap-1"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f7dce4]"><HeartIcon size={15} /></span><strong className="text-sm leading-none text-foreground">{total}</strong></div>
          <p className="mt-1 whitespace-nowrap text-[9px] leading-none text-muted-foreground">{t("times")} this {period === "W" ? "week" : period === "M" ? "month" : "year"}</p>
          <p className="mt-1 whitespace-nowrap text-[8px] leading-none text-muted-foreground">vs last {period === "W" ? "week" : period === "M" ? "month" : "year"} <span style={{ color: compared.diff < 0 ? "#6f8a3e" : compared.diff > 0 ? "#d85f4b" : "var(--muted-foreground)", fontWeight: 700 }}>{compared.text}</span></p>
        </div>
        <div className="min-w-0 px-1.5 text-center">
          <div className="flex items-center justify-center gap-1"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tint/55 text-primary"><ClockIcon size={15} /></span><strong className="text-sm leading-none text-foreground">{activeDays}</strong></div>
          <p className="mt-1 whitespace-nowrap text-[9px] leading-none text-muted-foreground">days with intimacy</p>
        </div>
        <div className="min-w-0 px-1.5 text-center">
          <div className="flex items-center justify-center gap-1"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tint/55"><StarIcon size={15} /></span><strong className="min-w-0 truncate text-[11px] leading-none text-foreground">{bestDayName}</strong></div>
          <p className="mt-1 whitespace-nowrap text-[9px] leading-none text-muted-foreground">best day</p>
        </div>
      </div>
    </section>
  );
}
