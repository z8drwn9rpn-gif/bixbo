import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Archive,
  Brain,
  CalendarDays,
  Dumbbell,
  Flame,
  HeartPulse,
  ChevronDown,
  Moon,
  Pill,
  RotateCcw,
  Scale,
  Sparkles,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
  Trash2,
  Waves,
} from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_REGISTRY, getRegistryFeature, registryAdminCorrelationFieldsForFeature, registryAdminCorrelationThreshold, registryAdminCycleFieldsForFeature, registryAdminMonthlyFieldsForFeature, registryAdminTreatmentFieldsForFeature, type RegistryFeatureId } from "@/lib/appRegistry";
import { layoutOrder } from "@/lib/layoutRegistry";
import {
  EMPTY,
  addDays,
  avgDayPain,
  isCycleTrackingHidden,
  todayKey,
  useBixbo,
  type DayLog,
  type PatternTreatmentKind,
  type PatternTreatmentResult,
  type ArchivedPatternTreatment,
} from "@/lib/storage";
import {
  avg,
  dayBowelSymptoms,
  dayEnergy,
  dayHeadacheIntensity,
  dayHotFlash,
  dayPanicIntensity,
  dayPressureIntensity,
  dayTetanyIntensity,
  daysOfMonth,
  historicCycles,
  negativeMoodCount,
  phaseAvg,
  phaseDays,
  phaseFlowMode,
  thisAndLastMonthPrefixes,
} from "@/lib/patterns";
import { TrText, strictAdminNumericValue, latestWeightForDay, PATTERN_TABS, METRIC_COLORS, PHASE_COLORS, Card, Empty, formatMetricValue, clampPercent, percentageChange, formatSignedPercent, phaseLabelByValue, PhaseBarChart, monthLabelFromPrefix, ComparisonMetric, MetricColumn, SummaryRow, ConfidenceBadge, SummaryPanel, PatternTabs, AnalysisRangeSelector, CollapsibleSection, TriggerResult } from "./shared";
import type { MetricColor, PhaseBar, ComparisonMetricProps, TreatmentMetric, SelectOption, VitalEntry, DayLogWithVitals, PatternTab, AnalysisRange, TreatmentKind, TreatmentResult, ArchivedTreatment, ConfidenceLevel, SummaryItem } from "./shared";
import type { PatternsContentModel } from "./usePatternsContentModel";

export function PatternsContentViewPart2({ model }: { model: PatternsContentModel }) {
  const { t, language, data, update, hydrated, view, dayLogs, cycleTrackingHidden, activeTab, setActiveTab, analysisRange, setAnalysisRange, cycles, phaseBuckets, painPhaseBars, moodPhaseBars, energyPhaseBars, hotFlashPhaseBars, pressurePhaseBars, bowelPhaseBars, adminCycleMetrics, commonFlow, highestPainPhase, bestEnergyPhase, worstMoodPhase, mostHotFlashPhase, currentMonthPrefix, previousMonthPrefix, currentMonthLabel, previousMonthLabel, monthlyComparisonLabel, currentMonthDays, elapsedDayCount, previousMonthDays, countAndAverage, panicCurrent, panicPrevious, tetanyCurrent, tetanyPrevious, hotFlashCurrent, hotFlashPrevious, headacheCurrent, headachePrevious, pressureCurrent, pressurePrevious, sleepAverage, weightAverage, adminMonthlyMetrics, medicationAdherence, workoutStats, workoutCurrent, workoutPrevious, pcosFrequency, histamineFrequency, sleepCurrent, sleepPrevious, weightCurrent, weightPrevious, medicationCurrent, medicationPrevious, pcosCurrent, pcosPrevious, histamineCurrent, histaminePrevious, monthlyLoggedDays, monthlyConfidence, monthlyChanges, mostImproved, mostWorsened, mostStable, formatChange, legacyTreatmentMigrationChecked, activeTreatment, archivedTreatments, treatmentDate, treatmentName, treatmentKind, treatmentResult, treatmentNotes, customTreatment, patchActiveTreatment, setTreatmentDate, setTreatmentName, setTreatmentKind, setTreatmentResult, setTreatmentNotes, setCustomTreatment, clearActiveTreatment, archiveTreatmentComparison, deleteTreatmentComparison, restoreArchivedTreatment, deleteArchivedTreatment, treatmentWindow, treatmentBeforeDays, treatmentAfterDays, treatmentBeforeLoggedDays, treatmentAfterLoggedDays, treatmentMetric, treatmentEventRate, treatmentPain, treatmentTetany, treatmentPanic, treatmentTetanyEpisodes, treatmentPanicEpisodes, treatmentHeadache, treatmentHeadacheIntensity, adminTreatmentMetrics, treatmentHotFlash, treatmentHotFlashEpisodes, treatmentResultOptions, selectedTreatmentResult, treatmentChanges, treatmentImprovedCount, treatmentWorsenedCount, treatmentUnchangedCount, strongestTreatmentChange, treatmentOverall, treatmentLoggedDays, treatmentConfidence, treatmentChangeLabel, formattedTreatmentDate, treatmentKindLabel, customCorrelationOptions, customCorrelationOptionKey, triggerOptions, outcomeOptions, selectedTrigger, setSelectedTrigger, selectedOutcome, setSelectedOutcome, hasScheduledMedicationMissed, hasAdminToggle, hasAdminChoice, hasAdminThreshold, hasTrigger, hasOutcome, allLoggedDays, analysisDays, daysWithTrigger, daysWithoutTrigger, percentWithTrigger, percentWithoutTrigger, selectedTriggerLabel, selectedOutcomeLabel, triggerDifference, triggerConfidence, strongestAssociations, saveTriggerCombination, removeTriggerCombination } = model;
  return (<>{activeTab === "treatment" && archivedTreatments.length > 0 && (
          <CollapsibleSection
            title="Treatment history"
            subtitle={`${archivedTreatments.length} archived treatment${archivedTreatments.length === 1 ? "" : "s"}`}
            defaultOpen={true}
          >
            <div className="space-y-2.5">
              {archivedTreatments.map((archived) => {
                const archivedKindLabel =
                  archived.kind === "medication"
                    ? "Medication"
                    : archived.kind === "supplement"
                      ? "Supplement"
                      : archived.kind === "diet"
                        ? "Diet"
                        : archived.kind === "therapy"
                          ? "Therapy"
                          : archived.kind === "exercise"
                            ? "Exercise"
                            : "Other";

                const startLabel = new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(`${archived.startDate}T12:00:00`));

                const archivedLabel = new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(`${archived.archivedAt}T12:00:00`));

                return (
                  <article key={archived.id} className="rounded-2xl bg-tint p-3.5 ring-1 ring-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{archived.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {archivedKindLabel}
                          {archived.result
                            ? ` · Result: ${
                                archived.result === "panicEpisodes"
                                  ? "Panic episode"
                                  : archived.result === "tetanyEpisodes"
                                    ? "Tetany episode"
                                    : archived.result === "headache"
                                      ? "Headache"
                                      : archived.result === "panicIntensity"
                                        ? "Panic intensity"
                                        : archived.result === "tetanyIntensity"
                                          ? "Tetany intensity"
                                          : archived.result === "negativeMood"
                                            ? "Negative mood"
                                            : "Pain"
                              }`
                            : ""}
                          · Started {startLabel}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Archived {archivedLabel}</p>
                        {archived.notes && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {archived.notes}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Archived
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => restoreArchivedTreatment(archived)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-background px-3 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-surface"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore for comparison
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteArchivedTreatment(archived.id)}
                        aria-label={`Delete archived treatment ${archived.name}`}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {activeTab === "triggers" && (
          <div className="flex flex-col gap-3 lg:contents">
            <Card
              title="Smart correlations"
              description="Automatically ranked associations calculated only from your own logs."
            >
              {strongestAssociations.length === 0 ? (
                <Empty text="Log at least 3 days with and 3 days without a trigger to unlock smart correlations." />
              ) : (
                <div className="mt-3 space-y-2.5">
                  {strongestAssociations.slice(0, 5).map((association, index) => (
                    <article
                      key={`smart-${association.trigger}-${association.outcome}`}
                      className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface text-xs font-bold ring-1 ring-border/50">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {association.trigger} → {association.outcome}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            The outcome was {Math.abs(association.difference).toFixed(0)} percentage points{" "}
                            {association.difference > 0 ? "more common" : "less common"} on days with this trigger.
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Based on {association.withCount} days with and {association.withoutCount} days without the
                            trigger.
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  <p className="text-[10px] leading-relaxed text-muted-foreground"><TrText value="Correlations show associations in your logs. They do not prove that one factor caused another." /></p>
                </div>
              )}
            </Card>
            {/* ------------------------------------------------------------------ */}
            {/* Trigger comparison                                                 */}
            {/* ------------------------------------------------------------------ */}
            <Card
              title="Trigger comparison"
              description="Compare how often an outcome occurred on days with and without a possible trigger."
            >
              <div className="mt-3 space-y-2.5">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Possible trigger
                  </span>

                  <select
                    value={selectedTrigger}
                    onChange={(event) => setSelectedTrigger(event.target.value)}
                    className="mt-1.5 w-full rounded-2xl bg-tint px-4 py-3 text-sm text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-primary"
                  >
                    {triggerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Compare with outcome
                  </span>

                  <select
                    value={selectedOutcome}
                    onChange={(event) => setSelectedOutcome(event.target.value)}
                    className="mt-1.5 w-full rounded-2xl bg-tint px-4 py-3 text-sm text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-primary"
                  >
                    {outcomeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <TriggerResult
                  label="With trigger"
                  detail={`${daysWithTrigger.length} logged day${daysWithTrigger.length === 1 ? "" : "s"}`}
                  percentage={percentWithTrigger}
                  color={CHART_COLORS.panic}
                />

                <TriggerResult
                  label="Without trigger"
                  detail={`${daysWithoutTrigger.length} logged day${daysWithoutTrigger.length === 1 ? "" : "s"}`}
                  percentage={percentWithoutTrigger}
                  color={CHART_COLORS.workout}
                />
              </div>

              {percentWithTrigger == null && percentWithoutTrigger == null ? (
                <Empty text="There is not enough matching data for this comparison." />
              ) : (
                <div className="mt-4 rounded-2xl bg-tint p-4 ring-1 ring-border/40">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedOutcomeLabel}</span> occurred on{" "}
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {percentWithTrigger != null ? `${percentWithTrigger.toFixed(0)}%` : "—"}
                    </span>{" "}
                    of days with{" "}
                    <span className="font-semibold text-foreground">{selectedTriggerLabel.toLowerCase()}</span>,
                    compared with{" "}
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {percentWithoutTrigger != null ? `${percentWithoutTrigger.toFixed(0)}%` : "—"}
                    </span>{" "}
                    of days without it.
                  </p>

                  {triggerDifference != null && (
                    <div
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-background/60 px-3 py-2 text-xs font-semibold"
                      style={{
                        color:
                          triggerDifference > 0
                            ? CHART_COLORS.headache
                            : triggerDifference < 0
                              ? CHART_COLORS.workout
                              : "var(--muted-foreground)",
                      }}
                    >
                      {triggerDifference > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : triggerDifference < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : null}

                      {triggerDifference === 0
                        ? "No measured difference"
                        : `${Math.abs(triggerDifference).toFixed(0)} percentage points ${
                            triggerDifference > 0 ? "higher" : "lower"
                          } with the trigger`}
                    </div>
                  )}

                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground"><TrText value="This shows an association in your logs, not proof that the selected trigger caused the outcome." /></p>
                </div>
              )}

              <SummaryPanel
                title="Trigger Summary"
                items={[
                  {
                    label: "Selected association",
                    value:
                      triggerDifference == null
                        ? "Not enough data"
                        : triggerDifference === 0
                          ? "No measured difference"
                          : `${Math.abs(triggerDifference).toFixed(0)} pp ${triggerDifference > 0 ? "higher" : "lower"} with trigger`,
                    tone:
                      triggerDifference != null && triggerDifference > 0
                        ? "bad"
                        : triggerDifference != null && triggerDifference < 0
                          ? "good"
                          : "neutral",
                  },
                  { label: "Days with trigger", value: `${daysWithTrigger.length}` },
                  { label: "Days without trigger", value: `${daysWithoutTrigger.length}` },
                ]}
                confidence={{
                  level: triggerConfidence,
                  detail: "Confidence depends on the number of days in both groups",
                }}
              />

              <CollapsibleSection
                title="Strongest correlations"
                subtitle="Ranked associations calculated only from your logged data"
                defaultOpen={false}
              >
                {strongestAssociations.length === 0 ? (
                  <Empty text="Log at least 3 days with and 3 days without a trigger to calculate correlations." />
                ) : (
                  <div className="space-y-3">
                    {strongestAssociations.map((association) => (
                      <div
                        key={`${association.trigger}-${association.outcome}`}
                        className="rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                      >
                        <p className="text-sm font-semibold text-foreground">{association.trigger}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">→ {association.outcome}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Based on {association.withCount} days with and {association.withoutCount} days without the
                          trigger
                        </p>
                        <p
                          className={`mt-2 text-sm font-bold ${
                            association.difference > 0
                              ? "text-rose-600 dark:text-rose-300"
                              : "text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {Math.abs(association.difference).toFixed(0)} percentage points{" "}
                          {association.difference > 0 ? "higher" : "lower"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <button
                type="button"
                onClick={saveTriggerCombination}
                disabled={!selectedTrigger || !selectedOutcome}
                className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-[1.03] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save this comparison
              </button>

              <CollapsibleSection
                title="Saved comparisons"
                subtitle="Open a saved trigger and outcome pair"
                defaultOpen={false}
              >
                {(view.settings.savedTriggers ?? []).length === 0 ? (
                  <Empty text="No saved comparisons yet." />
                ) : (
                  <div className="space-y-2">
                    {(view.settings.savedTriggers ?? []).map((saved) => {
                      const savedTriggerLabel =
                        triggerOptions.find((option) => option.id === saved.a)?.label ?? saved.a;

                      const savedOutcomeLabel =
                        outcomeOptions.find((option) => option.id === saved.b)?.label ?? saved.b;

                      return (
                        <div
                          key={saved.id}
                          className="flex items-center gap-3 rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40"
                        >
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
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm text-muted-foreground transition hover:bg-background hover:text-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>
            </Card>{" "}
          </div>
        )}
    </>);
}
