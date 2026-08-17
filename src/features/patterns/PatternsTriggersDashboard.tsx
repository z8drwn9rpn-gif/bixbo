import { useState, type ReactNode } from "react";
import { ChevronDown, Ico, Trash2, TrendingDown, TrendingUp } from "@/components/icons/BixboExtraIcons";
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
  if (value.includes("pain")) return "❤️";
  if (value.includes("tetany")) return "⚡";
  if (value.includes("panic")) return "⭐";
  if (value.includes("energy")) return "⚡";
  if (value.includes("period")) return "🌡️";
  if (value.includes("med") || value.includes("dose")) return "💊";
  return "⭐";
}

function IconChip({ icon, size = 30 }: { icon: string; size?: number }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-background/85 ring-1 ring-border/50"
      style={{ boxShadow: "0 4px 10px rgba(45,52,35,.14)" }}
    >
      <Ico e={icon} size={size} />
    </span>
  );
}

function DashboardCard({
  title,
  subtitle,
  icon,
  children,
  jumpLabel,
}: {
  title: string;
  subtitle: string;
  icon: string;
  children: ReactNode;
  jumpLabel?: string;
}) {
  return (
    <section
      data-bixbo-jump-label={jumpLabel ?? title}
      className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2"
    >
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <IconChip icon={icon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-[0.055em] text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="px-3 pb-3">{children}</div>
    </section>
  );
}

function CollapsibleDashboardCard({
  title,
  subtitle,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-border/80 lg:col-span-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-tint/30"
      >
        <IconChip icon={icon} size={27} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-border/45 p-3">{children}</div> : null}
    </section>
  );
}

function AssociationCard({
  association,
  index,
}: {
  association: {
    trigger: string;
    outcome: string;
    outcomeId: string;
    difference: number;
    withCount: number;
    withoutCount: number;
  };
  index: number;
}) {
  const tone = changeToneFromDelta(association.difference, outcomeChangeDirection(association.outcomeId));
  const direction = association.difference > 0 ? "more common" : association.difference < 0 ? "less common" : "equally common";

  return (
    <article className="rounded-2xl bg-tint/52 p-3.5 ring-1 ring-border/45">
      <div className="flex items-start gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{
            background: "linear-gradient(145deg,#a78bfa,#6d28d9)",
            boxShadow: "inset 1px 1px 2px rgba(255,255,255,.62), inset -1px -2px 3px rgba(45,25,80,.2), 0 2px 5px rgba(91,63,153,.28)",
          }}
        >
          {index + 1}
        </span>
        <IconChip icon={iconForAssociation(`${association.trigger} ${association.outcome}`)} size={26} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {association.trigger} → {association.outcome}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Outcome was{" "}
            <span className={`font-semibold ${changeToneTextClass(tone)}`}>
              {Math.abs(association.difference).toFixed(0)} percentage points {direction}
            </span>{" "}
            on days with this trigger.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/35 pt-2.5">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Based on {association.withCount} days with and {association.withoutCount} days without the trigger.
        </p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/85 ring-1 ring-border/45 ${toneClass(tone)}`}>
          {association.difference >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        </span>
      </div>
    </article>
  );
}

function TriggerGauge({
  label,
  detail,
  percentage,
  color,
}: {
  label: string;
  detail: string;
  percentage: number | null;
  color: string;
}) {
  const pct = percentage == null ? 0 : clampPercent(percentage);
  const display = percentage == null ? "—" : `${percentage.toFixed(0)}%`;

  return (
    <div className="rounded-2xl bg-tint/48 px-3 py-3 text-center ring-1 ring-border/45">
      <p className="text-[11px] font-semibold" style={{ color }}>{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{display}</p>
      <div className="relative mx-auto mt-2 flex h-28 w-[72px] items-end justify-center rounded-[28px] bg-background/70 p-2 ring-1 ring-border/45">
        <div className="absolute inset-x-2 bottom-2 top-2 rounded-[22px] bg-tint/55 ring-1 ring-border/30" />
        {percentage == null ? (
          <span className="relative z-10 mb-9 text-lg font-semibold text-muted-foreground">—</span>
        ) : (
          <span
            data-bixbo-chart-mark="bar"
            className="relative z-10 w-11 rounded-t-[10px]"
            style={{
              height: `${Math.max(5, pct * 0.86)}px`,
              background: color,
              filter: "saturate(1.58) contrast(1.08)",
            }}
          />
        )}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function SummaryItem({ icon, label, value, tone = "neutral" }: { icon: string; label: string; value: string; tone?: Tone }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-tint/45 px-3 py-2.5 ring-1 ring-border/40">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/80 shadow-sm ring-1 ring-border/45">
        <Ico e={icon} size={25} />
      </span>
      <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">{label}</span>
      <span className={`max-w-[58%] text-right text-[12px] font-semibold leading-snug ${toneClass(tone)}`}>{value}</span>
    </div>
  );
}

export function PatternsTriggersDashboard({ model }: { model: PatternsContentModel }) {
  const {
    t,
    view,
    analysisRange,
    setAnalysisRange,
    triggerOptions,
    outcomeOptions,
    selectedTrigger,
    setSelectedTrigger,
    selectedOutcome,
    setSelectedOutcome,
    daysWithTrigger,
    daysWithoutTrigger,
    percentWithTrigger,
    percentWithoutTrigger,
    selectedTriggerLabel,
    selectedOutcomeLabel,
    triggerDifference,
    triggerConfidence,
    strongestAssociations,
    saveTriggerCombination,
    removeTriggerCombination,
  } = model;

  const selectedTone = changeToneFromDelta(triggerDifference, outcomeChangeDirection(selectedOutcome));
  const selectedAssociation =
    triggerDifference == null
      ? t("Not enough data")
      : triggerDifference === 0
        ? t("No measured difference")
        : `${Math.abs(triggerDifference).toFixed(0)} pp ${triggerDifference > 0 ? t("higher") : t("lower")} ${t("with trigger")}`;

  return (
    <>
      <div className="lg:col-span-2">
        <AnalysisRangeSelector value={analysisRange} onChange={setAnalysisRange} />
      </div>

      <DashboardCard
        title={t("Smart correlations")}
        subtitle={t("Automatically ranked associations calculated only from your own logs.")}
        icon="⭐"
      >
        {strongestAssociations.length === 0 ? (
          <Empty text="Log at least 3 days with and 3 days without a trigger to unlock smart correlations." />
        ) : (
          <div className="space-y-2.5">
            {strongestAssociations.slice(0, 3).map((association, index) => (
              <AssociationCard key={`smart-${association.trigger}-${association.outcome}`} association={association} index={index} />
            ))}
            <div className="flex items-start gap-2 rounded-2xl bg-purple-500/7 px-3 py-2.5 ring-1 ring-purple-500/12">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background/80 ring-1 ring-border/40">
                <Ico e="⭐" size={20} />
              </span>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {t("Correlations show associations in your logs. They do not prove that one factor caused another.")}
              </p>
            </div>
          </div>
        )}
      </DashboardCard>

      <DashboardCard
        title={t("Trigger comparison")}
        subtitle={t("Compare how often an outcome occurred on days with and without a possible trigger.")}
        icon="🎯"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Possible trigger")}</span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                <Ico e="💊" size={25} />
              </span>
              <select
                value={selectedTrigger}
                onChange={(event) => setSelectedTrigger(event.target.value)}
                className="min-h-12 w-full appearance-none rounded-2xl bg-tint/55 py-3 pl-12 pr-11 text-sm font-medium text-foreground outline-none ring-1 ring-border/55 transition focus:ring-2 focus:ring-primary"
              >
                {triggerOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Compare with outcome")}</span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                <Ico e="⚡" size={25} />
              </span>
              <select
                value={selectedOutcome}
                onChange={(event) => setSelectedOutcome(event.target.value)}
                className="min-h-12 w-full appearance-none rounded-2xl bg-tint/55 py-3 pl-12 pr-11 text-sm font-medium text-foreground outline-none ring-1 ring-border/55 transition focus:ring-2 focus:ring-primary"
              >
                {outcomeOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            </div>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <TriggerGauge
            label={t("With trigger")}
            detail={`${daysWithTrigger.length} ${t(daysWithTrigger.length === 1 ? "logged day" : "logged days")}`}
            percentage={percentWithTrigger}
            color={CHART_COLORS.panic}
          />
          <TriggerGauge
            label={t("Without trigger")}
            detail={`${daysWithoutTrigger.length} ${t(daysWithoutTrigger.length === 1 ? "logged day" : "logged days")}`}
            percentage={percentWithoutTrigger}
            color={CHART_COLORS.workout}
          />
        </div>

        <div className="mt-3 rounded-2xl bg-purple-500/6 p-3.5 ring-1 ring-purple-500/12">
          <div className="flex items-start gap-3">
            <IconChip icon={iconForAssociation(selectedOutcomeLabel)} size={27} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedOutcomeLabel}</span> {t("occurred on")}{" "}
              <span className="font-bold text-violet-600 dark:text-violet-300">{percentWithTrigger == null ? "—" : `${percentWithTrigger.toFixed(0)}%`}</span>{" "}
              {t("of days with")} <span className="font-semibold text-foreground">{selectedTriggerLabel.toLowerCase()}</span>, {t("compared with")}{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-300">{percentWithoutTrigger == null ? "—" : `${percentWithoutTrigger.toFixed(0)}%`}</span>{" "}
              {t("of days without it.")}
            </p>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {t("This shows an association in your logs, not proof that the selected trigger caused the outcome.")}
          </p>
        </div>

        <div className="mt-3 rounded-2xl bg-background/55 p-3 ring-1 ring-border/45">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15"><Ico e="⭐" size={25} /></span>
            <h3 className="text-sm font-semibold text-foreground">{t("Trigger Summary")}</h3>
          </div>
          <div className="mt-3 space-y-2">
            <SummaryItem icon="📊" label={t("Selected association")} value={selectedAssociation} tone={selectedTone} />
            <SummaryItem icon="👥" label={t("Days with trigger")} value={`${daysWithTrigger.length}`} />
            <SummaryItem icon="👥" label={t("Days without trigger")} value={`${daysWithoutTrigger.length}`} />
            <SummaryItem icon="🛡️" label={t("Confidence")} value={triggerConfidence} tone={triggerConfidence === "High" ? "good" : "neutral"} />
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-muted-foreground">
            {t("Confidence depends on the number of days in both groups")}
          </p>
        </div>
      </DashboardCard>

      <CollapsibleDashboardCard
        title={t("Strongest correlations")}
        subtitle={t("Ranked associations calculated only from your logged data")}
        icon="⭐"
        defaultOpen={false}
      >
        {strongestAssociations.length === 0 ? (
          <Empty text="Log at least 3 days with and 3 days without a trigger to calculate correlations." />
        ) : (
          <div className="space-y-2.5">
            {strongestAssociations.map((association, index) => (
              <AssociationCard key={`${association.trigger}-${association.outcome}`} association={association} index={index} />
            ))}
          </div>
        )}
      </CollapsibleDashboardCard>

      <button
        type="button"
        onClick={saveTriggerCombination}
        disabled={!selectedTrigger || !selectedOutcome}
        className="min-h-12 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm ring-1 ring-primary/35 transition hover:brightness-[1.04] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-2"
        style={{ boxShadow: "inset 1px 1px 2px rgba(255,255,255,.30), inset -1px -2px 3px rgba(35,45,20,.20), 0 3px 8px rgba(45,52,35,.16)" }}
      >
        {t("Save this comparison")}
      </button>

      <CollapsibleDashboardCard
        title={t("Saved comparisons")}
        subtitle={t("Open a saved trigger and outcome pair")}
        icon="📁"
        defaultOpen={false}
      >
        {(view.settings.savedTriggers ?? []).length === 0 ? (
          <Empty text="No saved comparisons yet." />
        ) : (
          <div className="space-y-2">
            {(view.settings.savedTriggers ?? []).map((saved) => {
              const savedTriggerLabel = triggerOptions.find((option) => option.id === saved.a)?.label ?? saved.a;
              const savedOutcomeLabel = outcomeOptions.find((option) => option.id === saved.b)?.label ?? saved.b;
              return (
                <div key={saved.id} className="flex items-center gap-3 rounded-2xl bg-tint/48 px-3 py-3 ring-1 ring-border/45">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/80 ring-1 ring-border/40">
                    <Ico e={iconForAssociation(savedOutcomeLabel)} size={24} />
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSelectedTrigger(saved.a);
                      setSelectedOutcome(saved.b);
                    }}
                  >
                    <p className="truncate text-xs font-semibold text-foreground">{savedTriggerLabel}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">→ {savedOutcomeLabel}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={t("Remove saved comparison")}
                    onClick={() => removeTriggerCombination(saved.id)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/8 text-destructive ring-1 ring-destructive/15 transition hover:bg-destructive/12"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleDashboardCard>
    </>
  );
}
