import { useState, type ReactNode } from "react";
import { ChevronDown, Ico, Trash2 } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS } from "@/components/ui/chart";
import { changeToneFromDelta, changeToneTextClass, outcomeChangeDirection } from "@/lib/patternChangeSemantics";
import type { PatternsContentModel } from "./usePatternsContentModel";
import { AnalysisRangeSelector, Empty, clampPercent } from "./shared";

type Tone = "good" | "bad" | "neutral";

function toneClass(tone: Tone) {
  if (tone === "good") return "text-emerald-700 dark:text-emerald-300";
  if (tone === "bad") return "text-rose-600 dark:text-rose-300";
  return "text-muted-foreground";
}

function iconForAssociation(label: string) {
  const value = label.toLowerCase();
  if (value.includes("pain")) return "🔥";
  if (value.includes("tetany")) return "⚡";
  if (value.includes("panic")) return "✨";
  if (value.includes("energy")) return "⚡";
  if (value.includes("period")) return "🫐";
  if (value.includes("headache")) return "🧠";
  if (value.includes("pressure")) return "💢";
  if (value.includes("med") || value.includes("dose")) return "💊";
  return "✨";
}

function IconChip({ icon, size = 30 }: { icon: string; size?: number }) {
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-background/85 ring-1 ring-border/50" style={{ boxShadow: "0 4px 10px rgba(45,52,35,.14)" }}><Ico e={icon} size={size} /></span>;
}

function ConfidenceStar({ size = 25 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse cx="32" cy="56" rx="15" ry="3" fill="#263318" opacity="0.12" />
      <path d="m32 7 7 14 16 2.3-11.5 11.2 2.7 15.8L32 42.8 17.8 50.3l2.7-15.8L9 23.3 25 21 32 7Z" fill="#f6c945" stroke="#c99421" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="m25 17 4-7 2 11-7 2 1-6Z" fill="#fff4ad" opacity="0.7" />
    </svg>
  );
}

function DashboardCard({ title, subtitle, icon, children, jumpLabel }: { title: string; subtitle: string; icon?: string; children: ReactNode; jumpLabel?: string }) {
  return <section data-bixbo-jump-label={jumpLabel ?? title} className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2"><div className="flex items-start gap-3 px-4 pb-3 pt-4">{icon ? <IconChip icon={icon} /> : null}<div className="min-w-0 flex-1"><h2 className="text-sm font-bold uppercase tracking-[0.055em] text-foreground">{title}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p></div></div><div className="px-3 pb-3">{children}</div></section>;
}

function CollapsibleDashboardCard({ title, subtitle, icon, defaultOpen, children }: { title: string; subtitle: string; icon?: string; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-tint/30">{icon ? <IconChip icon={icon} size={27} /> : null}<div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p></div><ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></button>{open ? <div className="border-t border-border/45 p-3">{children}</div> : null}</section>;
}

function AssociationCard({ association, index }: { association: { trigger: string; outcome: string; outcomeId: string; difference: number; withCount: number; withoutCount: number }; index: number }) {
  const tone = changeToneFromDelta(association.difference, outcomeChangeDirection(association.outcomeId));
  const direction = association.difference > 0 ? "more common" : association.difference < 0 ? "less common" : "equally common";
  return <article className="rounded-2xl bg-tint/52 p-3.5 ring-1 ring-border/45"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: "linear-gradient(145deg,#a78bfa,#6d28d9)", boxShadow: "inset 1px 1px 2px rgba(255,255,255,.62), inset -1px -2px 3px rgba(45,25,80,.2), 0 2px 5px rgba(91,63,153,.28)" }}>{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-snug text-foreground">{association.trigger} → {association.outcome}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Outcome was <span className={`font-semibold ${changeToneTextClass(tone)}`}>{Math.abs(association.difference).toFixed(0)} percentage points {direction}</span> on days with this trigger.</p><p className="mt-2 border-t border-border/35 pt-2 text-[10px] leading-relaxed text-muted-foreground">Based on {association.withCount} days with and {association.withoutCount} days without the trigger.</p></div></div></article>;
}

function TriggerGauge({ label, detail, percentage, color }: { label: string; detail: string; percentage: number | null; color: string }) {
  const pct = percentage == null ? 0 : clampPercent(percentage);
  const display = percentage == null ? "—" : `${percentage.toFixed(0)}%`;
  const fillHeight = percentage == null ? 0 : percentage === 0 ? 4 : Math.max(8, pct * 0.78);
  return <div className="rounded-2xl bg-tint/48 px-2.5 py-2.5 text-center ring-1 ring-border/45"><p className="text-[11px] font-semibold" style={{ color }}>{label}</p><p className="mt-0.5 text-[22px] font-bold tabular-nums text-foreground">{display}</p><div className="relative mx-auto mt-1.5 h-24 w-[64px]"><div className="absolute inset-x-1.5 bottom-1 top-1 rounded-[28px] border border-border/55 bg-gradient-to-r from-background/65 via-white/88 to-background/55 shadow-[inset_3px_0_7px_rgba(80,75,55,.08),inset_-3px_0_7px_rgba(80,75,55,.08),0_4px_9px_rgba(45,52,35,.10)]"><span className="absolute inset-x-1 top-1 h-3 rounded-[50%] border border-border/45 bg-white/75" /><span className="absolute inset-x-1 bottom-1 h-3 rounded-[50%] border border-border/40 bg-background/70" />{percentage == null ? <span className="absolute inset-0 grid place-items-center text-lg font-semibold text-muted-foreground">—</span> : <span data-bixbo-chart-mark="bar" title={`${label}: ${percentage.toFixed(0)}%`} className="absolute inset-x-1.5 bottom-2 rounded-b-[22px]" style={{ height: `${fillHeight}%`, background: color, filter: "saturate(1.7) contrast(1.1)", boxShadow: "inset 3px 0 5px rgba(255,255,255,.25), inset -3px 0 5px rgba(40,35,20,.18), 0 2px 5px rgba(45,52,35,.16)" }}><span className="absolute -top-1 left-0 right-0 h-2.5 rounded-[50%]" style={{ background: color, boxShadow: "inset 0 2px 2px rgba(255,255,255,.42), 0 1px 2px rgba(40,35,20,.22)" }} /></span>}</div></div><p className="mt-0.5 text-[10px] font-semibold tabular-nums" style={{ color }}>{display}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{detail}</p></div>;
}

function SummaryItem({ icon, star, label, value, tone = "neutral" }: { icon?: string; star?: boolean; label: string; value: string; tone?: Tone }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-tint/45 px-3 py-2.5 ring-1 ring-border/40"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/80 shadow-sm ring-1 ring-border/45">{star ? <ConfidenceStar /> : <Ico e={icon} size={25} />}</span><span className="min-w-0 flex-1 text-[11px] text-muted-foreground">{label}</span><span className={`max-w-[58%] text-right text-[12px] font-semibold leading-snug ${toneClass(tone)}`}>{value}</span></div>;
}

export function PatternsTriggersDashboard({ model }: { model: PatternsContentModel }) {
  const { t, view, analysisRange, setAnalysisRange, triggerOptions, outcomeOptions, selectedTrigger, setSelectedTrigger, selectedOutcome, setSelectedOutcome, daysWithTrigger, daysWithoutTrigger, percentWithTrigger, percentWithoutTrigger, selectedTriggerLabel, selectedOutcomeLabel, triggerDifference, triggerConfidence, strongestAssociations, saveTriggerCombination, removeTriggerCombination } = model;
  const selectedTone = changeToneFromDelta(triggerDifference, outcomeChangeDirection(selectedOutcome));
  const selectedAssociation = triggerDifference == null ? t("Not enough data") : triggerDifference === 0 ? t("No measured difference") : `${Math.abs(triggerDifference).toFixed(0)} pp ${triggerDifference > 0 ? t("higher") : t("lower")} ${t("with trigger")}`;

  return <>
    <div className="lg:col-span-2"><AnalysisRangeSelector value={analysisRange} onChange={setAnalysisRange} /></div>
    <DashboardCard title={t("Smart correlations")} subtitle={t("Automatically ranked associations calculated only from your own logs.")}>{strongestAssociations.length === 0 ? <Empty text="Log at least 3 days with and 3 days without a trigger to unlock smart correlations." /> : <div className="space-y-2.5">{strongestAssociations.slice(0, 3).map((association, index) => <AssociationCard key={`smart-${association.trigger}-${association.outcome}`} association={association} index={index} />)}<div className="rounded-2xl bg-purple-500/7 px-3 py-2.5 ring-1 ring-purple-500/12"><p className="text-[10px] leading-relaxed text-muted-foreground">{t("Correlations show associations in your logs. They do not prove that one factor caused another.")}</p></div></div>}</DashboardCard>

    <DashboardCard title={t("Trigger comparison")} subtitle={t("Compare how often an outcome occurred on days with and without a possible trigger.")} icon="🎯">
      <div className="space-y-3"><label className="block"><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Possible trigger")}</span><div className="relative mt-1.5"><span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"><Ico e="💊" size={25} /></span><select value={selectedTrigger} onChange={(event) => setSelectedTrigger(event.target.value)} className="min-h-12 w-full appearance-none rounded-2xl bg-tint/55 py-3 pl-12 pr-11 text-sm font-medium text-foreground outline-none ring-1 ring-border/55 focus:ring-2 focus:ring-primary">{triggerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" /></div></label><label className="block"><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Compare with outcome")}</span><div className="relative mt-1.5"><span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"><Ico e={iconForAssociation(selectedOutcomeLabel)} size={25} /></span><select value={selectedOutcome} onChange={(event) => setSelectedOutcome(event.target.value)} className="min-h-12 w-full appearance-none rounded-2xl bg-tint/55 py-3 pl-12 pr-11 text-sm font-medium text-foreground outline-none ring-1 ring-border/55 focus:ring-2 focus:ring-primary">{outcomeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" /></div></label></div>
      <div className="mt-3 grid grid-cols-2 gap-2.5"><TriggerGauge label={t("With trigger")} detail={`${daysWithTrigger.length} ${t(daysWithTrigger.length === 1 ? "logged day" : "logged days")}`} percentage={percentWithTrigger} color={CHART_COLORS.panic} /><TriggerGauge label={t("Without trigger")} detail={`${daysWithoutTrigger.length} ${t(daysWithoutTrigger.length === 1 ? "logged day" : "logged days")}`} percentage={percentWithoutTrigger} color={CHART_COLORS.workout} /></div>
      <div className="mt-3 rounded-2xl bg-purple-500/6 p-3.5 ring-1 ring-purple-500/12"><div className="flex items-start gap-3"><IconChip icon={iconForAssociation(selectedOutcomeLabel)} size={27} /><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{selectedOutcomeLabel}</span> {t("occurred on")} <span className="font-bold text-violet-600 dark:text-violet-300">{percentWithTrigger == null ? "—" : `${percentWithTrigger.toFixed(0)}%`}</span> {t("of days with")} <span className="font-semibold text-foreground">{selectedTriggerLabel.toLowerCase()}</span>, {t("compared with")} <span className="font-bold text-emerald-600 dark:text-emerald-300">{percentWithoutTrigger == null ? "—" : `${percentWithoutTrigger.toFixed(0)}%`}</span> {t("of days without it.")}</p></div><p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{t("This shows an association in your logs, not proof that the selected trigger caused the outcome.")}</p></div>
      <div className="mt-3 rounded-2xl bg-background/55 p-3 ring-1 ring-border/45"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15"><ConfidenceStar /></span><h3 className="text-sm font-semibold text-foreground">{t("Trigger Summary")}</h3></div><div className="mt-3 space-y-2"><SummaryItem icon="📊" label={t("Selected association")} value={selectedAssociation} tone={selectedTone} /><SummaryItem icon="👥" label={t("Days with trigger")} value={`${daysWithTrigger.length}`} /><SummaryItem icon="👥" label={t("Days without trigger")} value={`${daysWithoutTrigger.length}`} /><SummaryItem star label={t("Confidence")} value={triggerConfidence} tone={triggerConfidence === "High" ? "good" : "neutral"} /></div><p className="mt-2 px-1 text-[10px] leading-relaxed text-muted-foreground">{t("Confidence depends on the number of days in both groups")}</p></div>
    </DashboardCard>

    <CollapsibleDashboardCard title={t("Strongest correlations")} subtitle={t("Ranked associations calculated only from your logged data")} defaultOpen={false}>{strongestAssociations.length === 0 ? <Empty text="Log at least 3 days with and 3 days without a trigger to calculate correlations." /> : <div className="space-y-2.5">{strongestAssociations.map((association, index) => <AssociationCard key={`${association.trigger}-${association.outcome}`} association={association} index={index} />)}</div>}</CollapsibleDashboardCard>
    <button type="button" onClick={saveTriggerCombination} disabled={!selectedTrigger || !selectedOutcome} className="min-h-12 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm ring-1 ring-primary/35 transition hover:brightness-[1.04] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-2" style={{ boxShadow: "inset 1px 1px 2px rgba(255,255,255,.30), inset -1px -2px 3px rgba(35,45,20,.20), 0 3px 8px rgba(45,52,35,.16)" }}>{t("Save this comparison")}</button>
    <CollapsibleDashboardCard title={t("Saved comparisons")} subtitle={t("Open a saved trigger and outcome pair")} icon="📁" defaultOpen={false}>{(view.settings.savedTriggers ?? []).length === 0 ? <Empty text="No saved comparisons yet." /> : <div className="space-y-2">{(view.settings.savedTriggers ?? []).map((saved) => { const savedTriggerLabel = triggerOptions.find((option) => option.id === saved.a)?.label ?? saved.a; const savedOutcomeLabel = outcomeOptions.find((option) => option.id === saved.b)?.label ?? saved.b; return <div key={saved.id} className="flex items-center gap-3 rounded-2xl bg-tint/48 px-3 py-3 ring-1 ring-border/45"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/80 ring-1 ring-border/40"><Ico e={iconForAssociation(savedOutcomeLabel)} size={24} /></span><button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setSelectedTrigger(saved.a); setSelectedOutcome(saved.b); }}><p className="truncate text-xs font-semibold text-foreground">{savedTriggerLabel}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">→ {savedOutcomeLabel}</p></button><button type="button" aria-label={t("Remove saved comparison")} onClick={() => removeTriggerCombination(saved.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/8 text-destructive ring-1 ring-destructive/15"><Trash2 className="h-4 w-4" /></button></div>; })}</div>}</CollapsibleDashboardCard>
  </>;
}
