import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PAIN_DESCRIPTIONS, avgDayPain, fromKey, toKey, type PainEntry } from "@/lib/storage";
import { average, couplePainColor, type CouplePeriod } from "./coupleUtils";

export function CouplePainChart({ days, mine, theirs, partnerName, periodLabel, period }: { days: string[]; mine: Record<string, { pain?: PainEntry[] }>; theirs: Record<string, { pain?: PainEntry[] }>; partnerName: string; periodLabel: string; period: CouplePeriod }) {
  const { t } = useI18n();
  const chartItems = useMemo(() => {
    if (period !== "Y") {
      return days.map((day) => ({ key: day, label: fromKey(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }), shortTop: fromKey(day).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2), shortBottom: String(fromKey(day).getDate()), mine: avgDayPain(mine[day]), theirs: avgDayPain(theirs[day]) }));
    }
    const year = days[0] ? fromKey(days[0]).getFullYear() : new Date().getFullYear();
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDays = days.filter((day) => fromKey(day).getMonth() === monthIndex);
      const mineValues = monthDays.map((day) => avgDayPain(mine[day])).filter((v): v is number => v != null);
      const theirValues = monthDays.map((day) => avgDayPain(theirs[day])).filter((v): v is number => v != null);
      const monthDate = new Date(year, monthIndex, 1);
      return { key: toKey(monthDate), label: monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }), shortTop: monthDate.toLocaleDateString("en-US", { month: "short" }), shortBottom: "", mine: average(mineValues), theirs: average(theirValues) };
    });
  }, [days, mine, period, theirs]);

  const width = Math.max(340, chartItems.length * 22 + 34);
  const height = 206, left = 24, right = 10, top = 12, bottom = 40;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const count = Math.max(1, chartItems.length), slot = chartWidth / count, barWidth = Math.max(5, (slot - 3) / 2);
  const yFor = (value: number) => top + ((10 - Math.max(0, Math.min(10, value))) / 10) * chartHeight;
  const baselineY = yFor(0), yTicks = [10, 8, 6, 4, 2, 0];
  const mySeries = chartItems.map((item) => item.mine), partnerSeries = chartItems.map((item) => item.theirs);

  const [selectedBar, setSelectedBar] = useState<{ owner: string; day: string; label: string; value: number; color: string; centerX: number; barTopY: number; series: "mine" | "partner" } | null>(null);
  useEffect(() => setSelectedBar(null), [periodLabel, partnerName]);

  const showBarDetails = (owner: string, day: string, label: string, value: number, color: string, centerX: number, barTopY: number, series: "mine" | "partner") => {
    setSelectedBar((current) => current?.day === day && current.series === series ? null : { owner, day, label, value, color, centerX, barTopY, series });
  };

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{`${t("Pain")} — ${periodLabel}`}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(period === "Y" ? "Monthly average pain" : "Daily average pain")}</p></div>
      <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-2xl bg-background/55 px-2 py-3 ring-1 ring-border/40">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[206px] w-full max-w-none" style={{ minWidth: `${width}px` }} role="img" aria-label={`Pain comparison between you and ${t(partnerName)} during ${periodLabel}`}>
          <defs><pattern id="couple-pain-stripes" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><rect width="4" height="4" fill="transparent" /><line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" /></pattern></defs>
          {yTicks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={yFor(tick)} y2={yFor(tick)} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1" /><text x={left - 4} y={yFor(tick) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">{tick}</text></g>)}
          {chartItems.map((item, index) => {
            const day = item.key, centerX = left + slot * index + slot / 2;
            const myValue = mySeries[index], partnerValue = partnerSeries[index];
            const myColor = myValue != null ? couplePainColor(myValue) : "transparent", partnerColor = partnerValue != null ? couplePainColor(partnerValue) : "transparent";
            return <g key={day}>
              {myValue != null ? <><rect x={centerX - barWidth - 1} y={yFor(myValue)} width={barWidth} height={baselineY - yFor(myValue)} fill={myColor} stroke={selectedBar?.day === day && selectedBar.series === "mine" ? "var(--foreground)" : "transparent"} strokeWidth={selectedBar?.day === day && selectedBar.series === "mine" ? 2 : 0} rx="2" pointerEvents="none"><title>{`You · ${day}: ${myValue.toFixed(1)}/10`}</title></rect><rect x={centerX - slot / 2} y={top} width={slot / 2} height={chartHeight} fill="transparent" role="button" tabIndex={0} aria-label={`You, ${day}, pain ${myValue.toFixed(1)} out of 10`} className="cursor-pointer focus:outline-none" onClick={() => showBarDetails("You", day, item.label, myValue, myColor, centerX - barWidth / 2 - 1, yFor(myValue), "mine")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showBarDetails("You", day, item.label, myValue, myColor, centerX - barWidth / 2 - 1, yFor(myValue), "mine"); } }} /></> : null}
              {partnerValue != null ? <g style={{ color: partnerColor }}><rect x={centerX + 1} y={yFor(partnerValue)} width={barWidth} height={baselineY - yFor(partnerValue)} fill={partnerColor} rx="2" opacity="0.88" pointerEvents="none" /><rect x={centerX + 1} y={yFor(partnerValue)} width={barWidth} height={baselineY - yFor(partnerValue)} fill="url(#couple-pain-stripes)" rx="2" pointerEvents="none"><title>{`${t(partnerName)} · ${day}: ${partnerValue.toFixed(1)}/10`}</title></rect><rect x={centerX + 1} y={yFor(partnerValue)} width={barWidth} height={baselineY - yFor(partnerValue)} fill="none" stroke={selectedBar?.day === day && selectedBar.series === "partner" ? "var(--foreground)" : partnerColor} strokeWidth={selectedBar?.day === day && selectedBar.series === "partner" ? 2.5 : 1.5} rx="2" pointerEvents="none" /><rect x={centerX} y={top} width={slot / 2} height={chartHeight} fill="transparent" role="button" tabIndex={0} aria-label={`${t(partnerName)}, ${day}, pain ${partnerValue.toFixed(1)} out of 10`} className="cursor-pointer focus:outline-none" onClick={() => showBarDetails(partnerName, day, item.label, partnerValue, partnerColor, centerX + barWidth / 2 + 1, yFor(partnerValue), "partner")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showBarDetails(partnerName, day, item.label, partnerValue, partnerColor, centerX + barWidth / 2 + 1, yFor(partnerValue), "partner"); } }} /></g> : null}
              <text x={centerX} y={height - 22} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">{item.shortTop}</text><text x={centerX} y={height - 12} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">{item.shortBottom}</text>
            </g>;
          })}
          {selectedBar ? (() => { const tooltipWidth = 138, tooltipHeight = 58; const tooltipX = Math.max(left + 2, Math.min(width - right - tooltipWidth - 2, selectedBar.centerX - tooltipWidth / 2)); const tooltipY = Math.max(4, selectedBar.barTopY - tooltipHeight - 8); const description = PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(selectedBar.value)))] ?? "Pain"; return <g pointerEvents="none" aria-hidden="true"><line x1={selectedBar.centerX} x2={selectedBar.centerX} y1={tooltipY + tooltipHeight} y2={Math.max(tooltipY + tooltipHeight, selectedBar.barTopY - 2)} stroke={selectedBar.color} strokeWidth="1.25" /><rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="9" fill="var(--surface)" stroke={selectedBar.color} strokeWidth="1.4" /><circle cx={tooltipX + 11} cy={tooltipY + 12} r="3.5" fill={selectedBar.color} /><text x={tooltipX + 19} y={tooltipY + 15} fontSize="8.5" fontWeight="600" fill="var(--foreground)">{selectedBar.owner} · {selectedBar.label}</text><text x={tooltipX + 10} y={tooltipY + 34} fontSize="12" fontWeight="700" fill="var(--foreground)">{t("Pain")} {selectedBar.value.toFixed(1)}/10</text><text x={tooltipX + 10} y={tooltipY + 49} fontSize="8" fill="var(--muted-foreground)">{description}</text></g>; })() : null}
        </svg>
      </div>
      {selectedBar ? <div className="mt-2 rounded-[1.25rem] bg-surface-sunken/40 px-2.5 py-2 text-[11px] text-foreground ring-1 ring-border/35"><button type="button" onClick={() => setSelectedBar(null)} className="flex w-full items-center gap-2 text-left" aria-label={t("Close selected pain details")}><span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]"><b>{selectedBar.owner}</b> · {selectedBar.day} · {t("Pain")} <b>{selectedBar.value.toFixed(1)}/10</b> · {t(PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(selectedBar.value)))] ?? "Pain")}</span></button></div> : null}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: couplePainColor(6) }} />{t("You")} — {t("solid")}</span><span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: `repeating-linear-gradient(135deg, ${couplePainColor(6)}, ${couplePainColor(6)} 3px, rgba(255,255,255,0.95) 3px, rgba(255,255,255,0.95) 5px)`, border: `1px solid ${couplePainColor(6)}` }} />{t(partnerName)} — {t("striped")}</span></div>
    </section>
  );
}
