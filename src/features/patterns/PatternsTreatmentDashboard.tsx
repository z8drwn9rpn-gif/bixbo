import { useState, type ReactNode } from "react";
import { ChevronDown, Ico } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS, type ChartColorKey } from "@/components/ui/chart";
import { todayKey } from "@/lib/storage";
import type { PatternsContentModel } from "./usePatternsContentModel";
import { clampPercent, formatMetricValue, percentageChange, TrText } from "./shared";
import type { TreatmentKind, TreatmentMetric, TreatmentResult } from "./shared";

type Tone = "good" | "bad" | "neutral";
type DetailStatus = "improved" | "worsened" | "unchanged" | "unavailable";

type TreatmentMetricCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  metric: TreatmentMetric;
  colorKey: ChartColorKey;
  max?: number;
  decimals?: number;
  unit?: string;
};

function toneClass(tone: Tone) {
  if (tone === "good") return "text-emerald-700 dark:text-emerald-300";
  if (tone === "bad") return "text-rose-600 dark:text-rose-300";
  return "text-muted-foreground";
}

function comparisonSummary(before: number | null, after: number | null, decimals: number, unit: string) {
  if (before == null || after == null || !Number.isFinite(before) || !Number.isFinite(after)) {
    return { text: "No comparison yet", detail: "Log this metric in both periods to compare it.", tone: "neutral" as Tone, status: "unavailable" as DetailStatus };
  }
  const delta = after - before;
  if (delta === 0) return { text: "No change", detail: "Before and after are the same.", tone: "neutral" as Tone, status: "unchanged" as DetailStatus };
  const tone: Tone = delta < 0 ? "good" : "bad";
  const verb = tone === "good" ? "Improved" : "Worsened";
  const absolute = formatMetricValue(Math.abs(delta), decimals, unit);
  const pct = percentageChange(before, after);
  const pctText = pct == null ? "" : ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)`;
  return { text: `${verb} by ${absolute}${pctText}`, detail: tone === "good" ? "Lower after treatment" : "Higher after treatment", tone, status: tone === "good" ? "improved" as DetailStatus : "worsened" as DetailStatus };
}

function IconBubble({ icon, size = 28 }: { icon: string; size?: number }) {
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/85 shadow-sm ring-1 ring-border/55"><Ico e={icon} size={size} /></span>;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-semibold text-foreground">{children}</span>;
}

function TreatmentSetup({ model }: { model: PatternsContentModel }) {
  const { t, view, treatmentName, treatmentKind, treatmentResult, treatmentDate, treatmentNotes, customTreatment, setTreatmentName, setTreatmentKind, setTreatmentResult, setTreatmentDate, setTreatmentNotes, setCustomTreatment, formattedTreatmentDate, treatmentKindLabel, selectedTreatmentResult, archiveTreatmentComparison, deleteTreatmentComparison } = model;
  const hasDraft = Boolean(treatmentDate || treatmentName || treatmentNotes);
  return (
    <section data-bixbo-jump-label={t("Treatment comparison")} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2">
      <div className="flex items-start gap-3 px-4 pb-3 pt-4"><IconBubble icon="💊" size={30} /><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{t("Treatment comparison")}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("Compare the four weeks before treatment with the first four weeks after its start.")}</p></div></div>
      <div className="border-t border-border/45 p-4">
        <div className="space-y-3.5">
          <div>
            <FieldLabel>{t("What did you start?")}</FieldLabel>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{t("Choose one of your medicines or enter another treatment.")}</p>
            {!customTreatment && view.meds.length > 0 ? (
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <select aria-label={t("Treatment")} value={treatmentName} onChange={(event) => setTreatmentName(event.target.value)} className="min-h-11 min-w-0 rounded-2xl bg-tint/70 px-4 text-sm font-medium text-foreground outline-none ring-1 ring-border/55 focus-visible:ring-2 focus-visible:ring-primary">
                  <option value="">{t("Choose medicine")}</option>{view.meds.map((med) => <option key={med.id} value={med.name}>{med.name}{med.dose ? ` — ${med.dose}` : ""}</option>)}
                </select>
                <button type="button" onClick={() => { setCustomTreatment(true); setTreatmentName(""); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-background px-3 text-[11px] font-semibold text-primary ring-1 ring-border/60"><Ico e="📝" size={19} /> {t("Other")}</button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <input type="text" aria-label={t("Treatment")} value={treatmentName} onChange={(event) => setTreatmentName(event.target.value)} placeholder={t("e.g. Elicea, physiotherapy, low-histamine diet")} className="min-h-11 min-w-0 rounded-2xl bg-tint/70 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border/55 focus-visible:ring-2 focus-visible:ring-primary" />
                {view.meds.length > 0 ? <button type="button" onClick={() => { setCustomTreatment(false); setTreatmentName(""); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-background px-3 text-[11px] font-semibold text-primary ring-1 ring-border/60"><Ico e="💊" size={19} /> {t("Medicines")}</button> : null}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block min-w-0"><FieldLabel>{t("Type")}</FieldLabel><select value={treatmentKind} onChange={(event) => setTreatmentKind(event.target.value as TreatmentKind)} className="mt-2 min-h-11 w-full rounded-2xl bg-tint/70 px-3 text-sm font-medium text-foreground outline-none ring-1 ring-border/55"><option value="medication">{t("Medication")}</option><option value="supplement">{t("Supplement")}</option><option value="diet">{t("Diet")}</option><option value="therapy">{t("Therapy")}</option><option value="exercise">{t("Exercise")}</option><option value="other">{t("Other")}</option></select></label>
            <label className="block min-w-0"><FieldLabel>{t("Treatment result")}</FieldLabel><select value={treatmentResult} onChange={(event) => setTreatmentResult(event.target.value as TreatmentResult)} className="mt-2 min-h-11 w-full rounded-2xl bg-tint/70 px-3 text-sm font-semibold text-foreground outline-none ring-1 ring-border/55"><option value="pain">{t("Pain")}</option><option value="panicEpisodes">{t("Panic episode")}</option><option value="tetanyEpisodes">{t("Tetany episode")}</option><option value="headache">{t("Headache")}</option><option value="panicIntensity">{t("Panic intensity")}</option><option value="tetanyIntensity">{t("Tetany intensity")}</option></select></label>
          </div>
          <div><FieldLabel>{t("Treatment start date")}</FieldLabel><div className="relative mt-2 min-h-11 overflow-hidden rounded-2xl bg-tint/70 ring-1 ring-border/55"><div className="pointer-events-none flex min-h-11 items-center justify-between gap-3 px-4"><span className={`text-sm font-semibold ${treatmentDate ? "text-foreground" : "text-muted-foreground"}`}>{formattedTreatmentDate}</span><Ico e="📅" size={24} /></div><input type="date" aria-label={t("Treatment start date")} max={todayKey()} value={treatmentDate} onChange={(event) => setTreatmentDate(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-[0.01]" /></div></div>
          <label className="block"><FieldLabel>{t("Notes")} <span className="font-normal text-muted-foreground">{t("(optional)")}</span></FieldLabel><textarea value={treatmentNotes} onChange={(event) => setTreatmentNotes(event.target.value)} placeholder={t("Why you started it, dose change, or anything useful to remember")} rows={2} className="mt-2 w-full resize-none rounded-2xl bg-tint/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border/55" /></label>
          {hasDraft ? <div className="rounded-2xl bg-background/70 p-3 ring-1 ring-border/45"><div className="flex items-center gap-2.5"><IconBubble icon="💊" size={22} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{treatmentName || t("Unnamed treatment")}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{treatmentKindLabel} · {t("Result")}: {selectedTreatmentResult.label}{treatmentDate ? ` · ${formattedTreatmentDate}` : ""}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={archiveTreatmentComparison} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-primary/10 px-3 text-[11px] font-semibold text-primary ring-1 ring-primary/20"><Ico e="✅" size={20} /> {t("Archive")}</button><button type="button" onClick={deleteTreatmentComparison} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-rose-500/10 px-3 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-500/20"><Ico e="⚠️" size={20} /> {t("Delete")}</button></div></div> : null}
        </div>
      </div>
    </section>
  );
}

function OverviewTile({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: Tone }) {
  const bg = tone === "good" ? "bg-emerald-500/8 ring-emerald-500/15" : tone === "bad" ? "bg-rose-500/8 ring-rose-500/15" : "bg-tint/55 ring-border/45";
  return <div className={`rounded-2xl p-3 ring-1 ${bg}`}><div className="flex items-start gap-2.5"><IconBubble icon={icon} size={23} /><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className={`mt-1 text-[12px] font-semibold leading-snug ${toneClass(tone)}`}><TrText value={value} /></p></div></div></div>;
}

function TreatmentOverview({ model }: { model: PatternsContentModel }) {
  const { t, treatmentName, treatmentKindLabel, formattedTreatmentDate, selectedTreatmentResult, treatmentBeforeLoggedDays, treatmentAfterLoggedDays, treatmentOverall, strongestTreatmentChange, treatmentChangeLabel, treatmentConfidence } = model;
  const overallTone: Tone = treatmentOverall.includes("improvement") ? "good" : treatmentOverall.includes("worsening") ? "bad" : "neutral";
  const strongestTone: Tone = strongestTreatmentChange?.delta != null ? (strongestTreatmentChange.delta < 0 ? "good" : strongestTreatmentChange.delta > 0 ? "bad" : "neutral") : "neutral";
  return (
    <section className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/80 lg:col-span-2">
      <div className="flex items-center gap-2.5"><IconBubble icon="✨" size={25} /><div><h2 className="text-sm font-semibold">{treatmentName ? `${treatmentName} ${t("at a glance")}` : t("Treatment at a glance")}</h2><p className="mt-0.5 text-[10px] text-muted-foreground">{t("Quick overview of your comparison.")}</p></div></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><OverviewTile icon="💊" label={t("Treatment")} value={`${treatmentName || t("Unnamed")} · ${treatmentKindLabel}`} tone="neutral" /><OverviewTile icon="📅" label={t("Started")} value={formattedTreatmentDate} tone="neutral" /><OverviewTile icon="🔥" label={t("Treatment result")} value={selectedTreatmentResult.label} tone="neutral" /><OverviewTile icon="📝" label={t("Logged data")} value={`${treatmentBeforeLoggedDays} ${t("before")} · ${treatmentAfterLoggedDays} ${t("after")}`} tone="neutral" /><OverviewTile icon={overallTone === "good" ? "✅" : overallTone === "bad" ? "⚠️" : "⚖️"} label={t("Overall")} value={treatmentOverall} tone={overallTone} /><OverviewTile icon="✨" label={t("Strongest change")} value={treatmentChangeLabel(strongestTreatmentChange)} tone={strongestTone} /></div>
      <div className="mt-2 flex items-center gap-2.5 rounded-2xl bg-tint/45 px-3 py-2.5 ring-1 ring-border/40"><Ico e="✨" size={23} /><span className="flex-1 text-[10px] text-muted-foreground">{t("Confidence")}</span><span className="text-[11px] font-semibold">{treatmentConfidence} · {treatmentBeforeLoggedDays}/{treatmentAfterLoggedDays} days</span></div>
    </section>
  );
}

function SingleMetricCard({ title, subtitle, icon, metric, colorKey, max = 10, decimals = 1, unit = "" }: TreatmentMetricCardProps) {
  const color = CHART_COLORS[colorKey];
  const summary = comparisonSummary(metric.before, metric.after, decimals, unit);
  const comparable = metric.before != null && metric.after != null;
  const chartMax = Math.max(1, max, metric.before ?? 0, metric.after ?? 0);
  return (
    <article className="rounded-2xl bg-tint/52 p-3.5 ring-1 ring-border/45">
      <div className="flex items-start gap-2.5"><IconBubble icon={icon} /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold" style={{ color }}>{title}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p></div></div>
      {comparable ? <><div className="mt-3 grid grid-cols-[1fr_minmax(100px,1.2fr)_1fr] items-end gap-2"><div><p className="text-[9px] font-semibold uppercase text-muted-foreground">Before</p><p className="mt-0.5 text-lg font-bold tabular-nums">{formatMetricValue(metric.before, decimals, unit)}</p></div><div className="relative flex h-20 items-end justify-center gap-4 rounded-2xl bg-background/48 px-3 pb-2 ring-1 ring-border/35">{[metric.before, metric.after].map((value, index) => { const pct = clampPercent((Math.max(0, Number(value)) / chartMax) * 100); return <span key={index} data-bixbo-chart-mark="bar" className="w-8 rounded-t-[8px]" style={{ height: `${Math.max(Number(value) === 0 ? 4 : 10, pct * .58)}px`, background: color, opacity: index ? 1 : .5, filter: "saturate(1.5) contrast(1.08)" }} />; })}</div><div className="text-right"><p className="text-[9px] font-semibold uppercase text-muted-foreground">After</p><p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color }}>{formatMetricValue(metric.after, decimals, unit)}</p></div></div><div className={`mt-3 rounded-xl bg-background/75 px-3 py-2 text-center text-[11px] font-semibold ring-1 ring-border/45 ${toneClass(summary.tone)}`}>{summary.text}</div></> : <div className="mt-3 rounded-2xl bg-background/72 px-4 py-4 text-center ring-1 ring-border/45"><p className="text-[11px] font-semibold">{summary.text}</p><p className="mt-1 text-[10px] text-muted-foreground">{summary.detail}</p></div>}
    </article>
  );
}

function CombinedTreatmentCard({ title, subtitle, icon, episodes, intensity, colorKey, intensityMax, intensityUnit }: { title: string; subtitle: string; icon: string; episodes: TreatmentMetric; intensity: TreatmentMetric; colorKey: ChartColorKey; intensityMax: number; intensityUnit: string }) {
  const color = CHART_COLORS[colorKey];
  const countMax = Math.max(1, episodes.before ?? 0, episodes.after ?? 0);
  const countSummary = comparisonSummary(episodes.before, episodes.after, 2, "/day");
  const intensitySummary = comparisonSummary(intensity.before, intensity.after, 1, intensityUnit);
  const beforePct = intensity.before == null ? null : clampPercent((intensity.before / intensityMax) * 100);
  const afterPct = intensity.after == null ? null : clampPercent((intensity.after / intensityMax) * 100);
  const y = (pct: number) => 86 - pct * .66;
  return (
    <article className="rounded-2xl bg-tint/52 p-3.5 ring-1 ring-border/45">
      <div className="flex items-start gap-2.5"><IconBubble icon={icon} /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold" style={{ color }}>{title}</h3><p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p></div></div>
      <div className="mt-3 grid grid-cols-2 gap-3">{[{ label: "Before", count: episodes.before, score: intensity.before }, { label: "After", count: episodes.after, score: intensity.after }].map((item, index) => <div key={item.label} className={index ? "text-right" : "text-left"}><p className="text-[9px] font-semibold uppercase text-muted-foreground">{item.label}</p><p className="mt-0.5 text-lg font-bold tabular-nums">{formatMetricValue(item.count, 2, "/day")}</p><p className="mt-0.5 text-[10px] font-semibold" style={{ color }}>{item.score == null ? "Intensity —" : `Intensity ${item.score.toFixed(1)}${intensityUnit}`}</p></div>)}</div>
      <div className="relative mt-3 h-36 overflow-hidden rounded-2xl bg-background/48 px-4 pb-5 pt-4 ring-1 ring-border/35">
        <div className="absolute inset-x-8 bottom-5 top-4 grid grid-cols-2 gap-12">{[{ value: episodes.before, opacity: .5 }, { value: episodes.after, opacity: 1 }].map((item, index) => { const pct = item.value == null ? 0 : clampPercent((Math.max(0, item.value) / countMax) * 100); return <div key={index} className="flex items-end justify-center">{item.value != null ? <span className="w-11 rounded-t-[10px]" style={{ height: `${Math.max(item.value === 0 ? 5 : 12, pct * .86)}%`, maxHeight: "100%", background: color, opacity: item.opacity, boxShadow: "inset 2px 2px 3px rgba(255,255,255,.55), inset -2px -3px 4px rgba(50,35,20,.18), 0 4px 8px rgba(45,52,35,.18)", filter: "saturate(1.55) contrast(1.08)" }} /> : null}</div>; })}</div>
        {beforePct != null || afterPct != null ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-6 bottom-5 top-4 h-[calc(100%-36px)] w-[calc(100%-48px)] overflow-visible">{beforePct != null && afterPct != null ? <line x1="25" y1={y(beforePct)} x2="75" y2={y(afterPct)} stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" /> : null}{beforePct != null ? <circle cx="25" cy={y(beforePct)} r="4.2" fill="white" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" /> : null}{afterPct != null ? <circle cx="75" cy={y(afterPct)} r="5" fill={color} stroke="white" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /> : null}</svg> : null}
        <div className="absolute inset-x-4 bottom-1 flex justify-between text-[9px] font-semibold text-muted-foreground"><span>Episodes/day</span><span>Intensity 0–{intensityMax}</span></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2"><div className={`rounded-xl bg-background/75 px-2 py-2 text-center text-[10px] font-semibold ring-1 ring-border/45 ${toneClass(countSummary.tone)}`}>Episodes: {countSummary.text}</div><div className={`rounded-xl bg-background/75 px-2 py-2 text-center text-[10px] font-semibold ring-1 ring-border/45 ${toneClass(intensitySummary.tone)}`}>Intensity: {intensitySummary.text}</div></div>
    </article>
  );
}

function TreatmentSection({ title, subtitle, icon, defaultOpen, children }: { title: string; subtitle: string; icon: string; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-tint/30"><IconBubble icon={icon} size={27} /><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p></div><ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></button>{open ? <div className="border-t border-border/45 p-3"><div className="space-y-3">{children}</div></div> : null}</section>;
}

function DetailedSummary({ model }: { model: PatternsContentModel }) {
  const { t, treatmentPain, treatmentTetanyEpisodes, treatmentTetany, treatmentPanicEpisodes, treatmentPanic, treatmentHotFlash, treatmentHotFlashEpisodes, treatmentHeadache, treatmentHeadacheIntensity, treatmentOverall, treatmentConfidence, treatmentBeforeLoggedDays, treatmentAfterLoggedDays, treatmentDate } = model;
  const metrics = [
    { label: t("Pain"), metric: treatmentPain, decimals: 1, unit: "/10", icon: "🔥" },
    { label: t("Tetany episodes"), metric: treatmentTetanyEpisodes, decimals: 2, unit: "/day", icon: "⚡" },
    { label: t("Tetany intensity"), metric: treatmentTetany, decimals: 1, unit: "/5", icon: "🌀" },
    { label: t("Panic episodes"), metric: treatmentPanicEpisodes, decimals: 2, unit: "/day", icon: "✨" },
    { label: t("Panic intensity"), metric: treatmentPanic, decimals: 1, unit: "/10", icon: "✨" },
    { label: t("Hot flash episodes"), metric: treatmentHotFlashEpisodes, decimals: 2, unit: "/day", icon: "🌡️" },
    { label: t("Hot-flash intensity"), metric: treatmentHotFlash, decimals: 1, unit: "/5", icon: "🌡️" },
    { label: t("Headache"), metric: treatmentHeadache, decimals: 2, unit: "/day", icon: "🧠" },
    { label: t("Headache intensity"), metric: treatmentHeadacheIntensity, decimals: 1, unit: "/10", icon: "🧠" },
  ].map((item) => ({ ...item, summary: comparisonSummary(item.metric.before, item.metric.after, item.decimals, item.unit) }));
  const groups: Array<{ status: DetailStatus; label: string; tone: Tone }> = [
    { status: "improved", label: t("Improved"), tone: "good" },
    { status: "worsened", label: t("Worsened"), tone: "bad" },
    { status: "unchanged", label: t("Unchanged"), tone: "neutral" },
    { status: "unavailable", label: t("Not enough data"), tone: "neutral" },
  ];
  return (
    <TreatmentSection title={t("Detailed treatment summary")} subtitle={t("Exactly what improved, worsened or stayed unchanged")} icon="📝" defaultOpen>
      {groups.map((group) => {
        const rows = metrics.filter((item) => item.summary.status === group.status);
        if (!rows.length) return null;
        return <div key={group.status} className="rounded-2xl bg-tint/45 p-3 ring-1 ring-border/40"><div className="flex items-center justify-between"><p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${toneClass(group.tone)}`}>{group.label}</p><span className="text-[10px] font-semibold text-muted-foreground">{rows.length}</span></div><div className="mt-2 space-y-2">{rows.map((item) => <div key={item.label} className="flex items-center gap-2 rounded-xl bg-background/72 px-2.5 py-2 ring-1 ring-border/35"><Ico e={item.icon} size={23} /><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-foreground">{item.label}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{formatMetricValue(item.metric.before, item.decimals, item.unit)} → {formatMetricValue(item.metric.after, item.decimals, item.unit)}</p></div><span className={`max-w-[46%] text-right text-[9px] font-semibold leading-tight ${toneClass(item.summary.tone)}`}>{item.summary.text}</span></div>)}</div></div>;
      })}
      <div className="grid grid-cols-2 gap-2"><OverviewTile icon="✨" label={t("Overall")} value={treatmentOverall} tone={treatmentOverall.includes("improvement") ? "good" : treatmentOverall.includes("worsening") ? "bad" : "neutral"} /><OverviewTile icon="✨" label={t("Confidence")} value={`${treatmentConfidence} · ${treatmentBeforeLoggedDays}/${treatmentAfterLoggedDays} days`} tone="neutral" /></div>
      <p className="px-1 text-[9px] leading-relaxed text-muted-foreground">{t("Treatment marker")}: {treatmentDate}. {t("The comparison uses up to 28 days on each side of this date.")}</p>
    </TreatmentSection>
  );
}

export function PatternsTreatmentDashboard({ model }: { model: PatternsContentModel }) {
  const { t, treatmentDate, treatmentPain, treatmentTetanyEpisodes, treatmentTetany, treatmentPanicEpisodes, treatmentPanic, treatmentHotFlash, treatmentHotFlashEpisodes, treatmentHeadache, treatmentHeadacheIntensity, adminTreatmentMetrics } = model;
  return (
    <>
      <TreatmentSetup model={model} />
      {treatmentDate ? <><TreatmentOverview model={model} /><TreatmentSection title={t("Treatment results")} subtitle={t("4 weeks before vs 4 weeks after treatment start")} icon="🔥" defaultOpen><SingleMetricCard title={t("Pain")} subtitle={t("Average pain · 4 weeks before vs 4 weeks after")} icon="🔥" metric={treatmentPain} colorKey="headache" max={10} decimals={1} unit="/10" /><CombinedTreatmentCard title={t("Tetany")} subtitle={t("Episodes and intensity in one view")} icon="⚡" episodes={treatmentTetanyEpisodes} intensity={treatmentTetany} colorKey="tetany" intensityMax={5} intensityUnit="/5" /><CombinedTreatmentCard title={t("Panic")} subtitle={t("Episodes and intensity in one view")} icon="✨" episodes={treatmentPanicEpisodes} intensity={treatmentPanic} colorKey="panic" intensityMax={10} intensityUnit="/10" /><CombinedTreatmentCard title={t("Hot flashes")} subtitle={t("Episodes and intensity in one view")} icon="🌡️" episodes={treatmentHotFlashEpisodes} intensity={treatmentHotFlash} colorKey="hotFlash" intensityMax={5} intensityUnit="/5" /><CombinedTreatmentCard title={t("Headache")} subtitle={t("Episodes and intensity in one view")} icon="🧠" episodes={treatmentHeadache} intensity={treatmentHeadacheIntensity} colorKey="headache" intensityMax={10} intensityUnit="/10" /></TreatmentSection>{adminTreatmentMetrics.length > 0 ? <TreatmentSection title={t("Custom metrics")} subtitle={t("Admin-created values before versus after treatment")} icon="✨" defaultOpen={false}>{adminTreatmentMetrics.map((item) => <SingleMetricCard key={item.id} title={item.title} subtitle={t("Average supplementary value · 4 weeks before vs 4 weeks after")} icon="✨" metric={item.metric} colorKey="neutral" max={item.max} decimals={1} unit={item.unit} />)}</TreatmentSection> : null}<DetailedSummary model={model} /></> : <section className="rounded-3xl bg-surface p-4 text-center shadow-sm ring-1 ring-border/80 lg:col-span-2"><Ico e="📅" size={34} /><p className="mt-2 text-sm font-semibold">{t("Add a treatment start date")}</p><p className="mx-auto mt-1 max-w-sm text-[10px] leading-relaxed text-muted-foreground">{t("Choose when the treatment started to compare the four weeks before and after it.")}</p></section>}
    </>
  );
}
