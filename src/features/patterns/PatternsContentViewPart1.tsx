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

export function PatternsContentViewPart1({ model }: { model: PatternsContentModel }) {
  const { t, language, data, update, hydrated, view, dayLogs, cycleTrackingHidden, activeTab, setActiveTab, analysisRange, setAnalysisRange, cycles, phaseBuckets, painPhaseBars, moodPhaseBars, energyPhaseBars, hotFlashPhaseBars, pressurePhaseBars, bowelPhaseBars, adminCycleMetrics, commonFlow, highestPainPhase, bestEnergyPhase, worstMoodPhase, mostHotFlashPhase, currentMonthPrefix, previousMonthPrefix, currentMonthLabel, previousMonthLabel, monthlyComparisonLabel, currentMonthDays, elapsedDayCount, previousMonthDays, countAndAverage, panicCurrent, panicPrevious, tetanyCurrent, tetanyPrevious, hotFlashCurrent, hotFlashPrevious, headacheCurrent, headachePrevious, pressureCurrent, pressurePrevious, sleepAverage, weightAverage, adminMonthlyMetrics, medicationAdherence, workoutStats, workoutCurrent, workoutPrevious, pcosFrequency, histamineFrequency, sleepCurrent, sleepPrevious, weightCurrent, weightPrevious, medicationCurrent, medicationPrevious, pcosCurrent, pcosPrevious, histamineCurrent, histaminePrevious, monthlyLoggedDays, monthlyConfidence, monthlyChanges, mostImproved, mostWorsened, mostStable, formatChange, legacyTreatmentMigrationChecked, activeTreatment, archivedTreatments, treatmentDate, treatmentName, treatmentKind, treatmentResult, treatmentNotes, customTreatment, patchActiveTreatment, setTreatmentDate, setTreatmentName, setTreatmentKind, setTreatmentResult, setTreatmentNotes, setCustomTreatment, clearActiveTreatment, archiveTreatmentComparison, deleteTreatmentComparison, restoreArchivedTreatment, deleteArchivedTreatment, treatmentWindow, treatmentBeforeDays, treatmentAfterDays, treatmentBeforeLoggedDays, treatmentAfterLoggedDays, treatmentMetric, treatmentEventRate, treatmentPain, treatmentTetany, treatmentPanic, treatmentTetanyEpisodes, treatmentPanicEpisodes, treatmentHeadache, treatmentHeadacheIntensity, adminTreatmentMetrics, treatmentHotFlash, treatmentHotFlashEpisodes, treatmentResultOptions, selectedTreatmentResult, treatmentChanges, treatmentImprovedCount, treatmentWorsenedCount, treatmentUnchangedCount, strongestTreatmentChange, treatmentOverall, treatmentLoggedDays, treatmentConfidence, treatmentChangeLabel, formattedTreatmentDate, treatmentKindLabel, customCorrelationOptions, customCorrelationOptionKey, triggerOptions, outcomeOptions, selectedTrigger, setSelectedTrigger, selectedOutcome, setSelectedOutcome, hasScheduledMedicationMissed, hasAdminToggle, hasAdminChoice, hasAdminThreshold, hasTrigger, hasOutcome, allLoggedDays, analysisDays, daysWithTrigger, daysWithoutTrigger, percentWithTrigger, percentWithoutTrigger, selectedTriggerLabel, selectedOutcomeLabel, triggerDifference, triggerConfidence, strongestAssociations, saveTriggerCombination, removeTriggerCombination } = model;
  return (<>
        <PatternTabs active={activeTab} onChange={setActiveTab} hideCycle={cycleTrackingHidden} />

        {activeTab === "triggers" && (
          <div className="lg:col-span-2">
            <AnalysisRangeSelector value={analysisRange} onChange={setAnalysisRange} />
          </div>
        )}

        {!cycleTrackingHidden && activeTab === "cycle" && (
          <div className="flex flex-col gap-3 lg:contents">
            {/* ------------------------------------------------------------------ */}
            {/* Cycle phase                                                        */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.cycle", "painFlow", 10)}
              title="Pain & flow"
              subtitle="Average pain and menstrual flow by cycle phase"
              defaultOpen={true}
            >
              <Card
                title="Cycle phase — pain & flow"
                description="See how your symptoms usually change before, during and after your period."
              >
                <div className="mt-4">
                  <PhaseBarChart
                    title="Average pain"
                    description="Average daily pain intensity in each cycle phase."
                    bars={painPhaseBars}
                    max={10}
                    unit="/10"
                  />
                </div>

                {cycles.length > 0 ? (
                  <div className="mt-3 rounded-2xl bg-tint px-4 py-3 ring-1 ring-border/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">{t("Most common period flow")}</p>

                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Based on {cycles.length} historic cycle
                          {cycles.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold capitalize text-rose-600 dark:text-rose-400">
                        {commonFlow || "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Empty text="Log more periods to see your cycle pattern." />
                )}
                <div className="mt-4 rounded-3xl bg-background p-4 ring-1 ring-border">
                  <h3 className="text-sm font-semibold text-foreground">{t("Cycle Summary")}</h3>

                  <div className="mt-3 space-y-2.5">
                    <SummaryRow label="Highest pain" value={highestPainPhase} />

                    <SummaryRow label="Best energy" value={bestEnergyPhase} />

                    <SummaryRow label="Most negative mood" value={worstMoodPhase} />

                    <SummaryRow label="Most hot flashes" value={mostHotFlashPhase} />

                    <SummaryRow label="Most common flow" value={commonFlow || "—"} />
                  </div>
                </div>
              </Card>
            </CollapsibleSection>

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.cycle", "bodyChanges", 20)}
              title="Body changes"
              subtitle="Mood, energy, hot flashes, pressure and bowel symptoms"
              defaultOpen={false}
            >
              <Card
                title="Cycle phase — other"
                description="Mood, energy, hot flashes and bowel symptoms grouped by cycle phase."
              >
                <div className="mt-3 space-y-2.5">
                  <PhaseBarChart
                    title="Negative mood"
                    description="Average number of negative mood tags logged per day."
                    bars={moodPhaseBars}
                    max={3}
                    decimals={1}
                  />

                  <PhaseBarChart
                    title="Energy"
                    description="Average body-battery or energy score."
                    bars={energyPhaseBars}
                    max={5}
                    unit="/5"
                  />

                  <PhaseBarChart
                    title="Hot flashes"
                    description="Average hot-flash intensity."
                    bars={hotFlashPhaseBars}
                    max={5}
                    unit="/5"
                  />

                  <PhaseBarChart
                    title="Pressure intensity"
                    description="Average logged pressure intensity in each cycle phase."
                    bars={pressurePhaseBars}
                    max={10}
                    unit="/10"
                  />

                  <PhaseBarChart
                    title="Bowel symptoms"
                    description="Average number of bowel symptoms logged per day."
                    bars={bowelPhaseBars}
                    max={3}
                    decimals={1}
                  />
                </div>
              </Card>
            </CollapsibleSection>
            {adminCycleMetrics.length > 0 ? (
              <CollapsibleSection layoutOrderValue={layoutOrder(view, "patterns.cycle", "customMetrics", 30)} title="Custom metrics" subtitle="Admin-created numeric and scale fields" defaultOpen={false}>
                <Card title="Cycle phase — custom metrics" description="Admin-created values grouped by cycle phase.">
                  <div className="mt-3 space-y-2.5">{adminCycleMetrics.map((metric) => <PhaseBarChart key={metric.id} title={metric.title} description="Average saved supplementary value by cycle phase." bars={metric.bars} max={metric.max ?? 10} decimals={1} unit={metric.unit} />)}</div>
                </Card>
              </CollapsibleSection>
            ) : null}
          </div>
        )}

        {activeTab === "monthly" && (
          <div className="flex flex-col gap-3 lg:contents">
            <Card
              title="This month at a glance"
              description={`${monthlyComparisonLabel} · compared over the same number of days.`}
            >
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Most improved
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatChange(mostImproved)}
                  </p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Needs attention
                  </p>
                  <p className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-300">
                    {formatChange(mostWorsened)}
                  </p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Most stable
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatChange(mostStable)}</p>
                </div>
                <div className="rounded-2xl bg-tint p-3 ring-1 ring-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Confidence")}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{monthlyConfidence}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{monthlyLoggedDays} logged days</p>
                </div>
              </div>
            </Card>

            {adminMonthlyMetrics.length > 0 ? (
              <CollapsibleSection
                layoutOrderValue={layoutOrder(view, "patterns.monthly", "customMetrics", 60)}
                title="Custom metrics"
                subtitle="Admin-created numeric and scale fields"
                defaultOpen={false}
              >
                <Card
                  title="Monthly comparison — custom metrics"
                  description={`${monthlyComparisonLabel} · same number of elapsed days in each month.`}
                >
                  <div className="mt-3 space-y-2.5">
                    {adminMonthlyMetrics.map((metric) => (
                      <ComparisonMetric
                        key={metric.id}
                        title={metric.title}
                        subtitle="Average of saved supplementary values"
                        previous={metric.previous}
                        current={metric.current}
                        max={metric.max}
                        decimals={1}
                        unit={metric.unit}
                        color="green"
                        neutralTrend
                        icon={<Activity className="h-5 w-5" />}
                      />
                    ))}
                  </div>
                </Card>
              </CollapsibleSection>
            ) : null}

            <SummaryPanel
              title="Monthly Summary"
              items={[
                {
                  label: "Most improved",
                  value: formatChange(mostImproved),
                  tone: mostImproved && mostImproved.score > 0 ? "good" : "neutral",
                },
                {
                  label: "Needs attention",
                  value: formatChange(mostWorsened),
                  tone: mostWorsened && mostWorsened.score < 0 ? "bad" : "neutral",
                },
                { label: "Most stable", value: formatChange(mostStable), tone: "neutral" },
              ]}
              confidence={{
                level: monthlyConfidence,
                detail: `Based on ${monthlyLoggedDays} logged day${monthlyLoggedDays === 1 ? "" : "s"} in ${currentMonthLabel}`,
              }}
            />

            {/* ------------------------------------------------------------------ */}
            {/* Monthly comparison — panic and tetany                              */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.monthly", "panicTetany", 20)}
              title="Panic & tetany"
              subtitle="Monthly frequency and intensity comparison"
              defaultOpen={true}
            >
              <Card
                title="Monthly comparison — panic & tetany"
                description={`${monthlyComparisonLabel} · same number of elapsed days in each month.`}
              >
                <div className="mt-3 space-y-2.5">
                  <ComparisonMetric
                    title="Panic attacks"
                    subtitle="Number of logged panic attacks"
                    previous={panicPrevious.count}
                    current={panicCurrent.count}
                    decimals={0}
                    unit=""
                    color="purple"
                    higherIsWorse
                    icon={<Sparkles className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Panic intensity"
                    subtitle="Average intensity of logged panic attacks"
                    previous={panicPrevious.intensity}
                    current={panicCurrent.intensity}
                    max={10}
                    decimals={1}
                    unit="/10"
                    color="purple"
                    higherIsWorse
                    icon={<Brain className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Tetany episodes"
                    subtitle="Number of logged tetany episodes"
                    previous={tetanyPrevious.count}
                    current={tetanyCurrent.count}
                    decimals={0}
                    unit=""
                    color="blue"
                    higherIsWorse
                    icon={<Activity className="h-5 w-5" />}
                  />

                  <ComparisonMetric
                    title="Tetany intensity"
                    subtitle="Average intensity of logged tetany episodes"
                    previous={tetanyPrevious.intensity}
                    current={tetanyCurrent.intensity}
                    max={5}
                    decimals={1}
                    unit="/5"
                    color="blue"
                    higherIsWorse
                    icon={<Waves className="h-5 w-5" />}
                  />
                </div>
              </Card>
            </CollapsibleSection>

            {/* ------------------------------------------------------------------ */}
            {/* Monthly comparison — other                                         */}
            {/* ------------------------------------------------------------------ */}

            <CollapsibleSection title="Symptoms" subtitle="Hot flashes, headaches and pressure" defaultOpen={false}>
              <div className="space-y-3">
                <ComparisonMetric
                  title="Hot flashes"
                  subtitle="Number of logged hot flashes"
                  previous={hotFlashPrevious.count}
                  current={hotFlashCurrent.count}
                  decimals={0}
                  color="orange"
                  higherIsWorse
                  icon={<Flame className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Hot-flash intensity"
                  subtitle="Average intensity of logged hot flashes"
                  previous={hotFlashPrevious.intensity}
                  current={hotFlashCurrent.intensity}
                  max={5}
                  decimals={1}
                  unit="/5"
                  color="orange"
                  higherIsWorse
                  icon={<ThermometerSun className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Headaches"
                  subtitle="Number of logged headaches"
                  previous={headachePrevious.count}
                  current={headacheCurrent.count}
                  decimals={0}
                  color="cyan"
                  higherIsWorse
                  icon={<Brain className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Headache intensity"
                  subtitle="Average headache intensity"
                  previous={headachePrevious.intensity}
                  current={headacheCurrent.intensity}
                  max={10}
                  decimals={1}
                  unit="/10"
                  color="cyan"
                  higherIsWorse
                  icon={<HeartPulse className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Pressure entries"
                  subtitle="Number of pain logs containing pressure"
                  previous={pressurePrevious.count}
                  current={pressureCurrent.count}
                  decimals={0}
                  color="rose"
                  higherIsWorse
                  icon={<Waves className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Pressure intensity"
                  subtitle="Average intensity of logged pressure"
                  previous={pressurePrevious.intensity}
                  current={pressureCurrent.intensity}
                  max={10}
                  decimals={1}
                  unit="/10"
                  color="rose"
                  higherIsWorse
                  icon={<Activity className="h-5 w-5" />}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.monthly", "lifestyle", 40)}
              title="Lifestyle & routines"
              subtitle="Sleep, weight, medication and workouts"
              defaultOpen={false}
            >
              <div className="space-y-3">
                <ComparisonMetric
                  title="Average sleep"
                  subtitle="Average number of logged sleep hours"
                  previous={sleepPrevious}
                  current={sleepCurrent}
                  max={12}
                  decimals={1}
                  unit="h"
                  color="blue"
                  neutralTrend
                  icon={<Moon className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Average weight"
                  subtitle="Average logged body weight"
                  previous={weightPrevious}
                  current={weightCurrent}
                  decimals={1}
                  unit="kg"
                  color="slate"
                  neutralTrend
                  icon={<Scale className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Medication adherence"
                  subtitle="Percentage of scheduled doses marked as taken"
                  previous={medicationPrevious}
                  current={medicationCurrent}
                  max={100}
                  decimals={0}
                  unit="%"
                  color="emerald"
                  higherIsWorse={false}
                  icon={<Pill className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Workouts"
                  subtitle="Number of logged workout sessions"
                  previous={workoutPrevious.count}
                  current={workoutCurrent.count}
                  decimals={0}
                  color="teal"
                  higherIsWorse={false}
                  icon={<Dumbbell className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Workout time"
                  subtitle="Total logged workout minutes"
                  previous={workoutPrevious.minutes}
                  current={workoutCurrent.minutes}
                  decimals={0}
                  unit=" min"
                  color="teal"
                  higherIsWorse={false}
                  icon={<Activity className="h-5 w-5" />}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              layoutOrderValue={layoutOrder(view, "patterns.monthly", "hormones", 50)}
              title="Hormones"
              subtitle="PCOS and histamine changes"
              defaultOpen={false}
            >
              <div className="space-y-3">
                <ComparisonMetric
                  title="PCOS symptoms"
                  subtitle="Total number of logged PCOS symptom tags"
                  previous={pcosPrevious}
                  current={pcosCurrent}
                  decimals={0}
                  color="pink"
                  higherIsWorse
                  icon={<HeartPulse className="h-5 w-5" />}
                />

                <ComparisonMetric
                  title="Histamine flares"
                  subtitle="Number of food entries marked as a histamine flare"
                  previous={histaminePrevious}
                  current={histamineCurrent}
                  decimals={0}
                  color="amber"
                  higherIsWorse
                  icon={<Flame className="h-5 w-5" />}
                />
              </div>

            </CollapsibleSection>
          </div>
        )}

        {activeTab === "treatment" && (
          <div className="flex flex-col gap-3 lg:contents">
            <Card
              title="Treatment comparison"
              description="Compare the four weeks before treatment with the first four weeks after its start."
            >
              <div className="mt-3 space-y-2.5">
                <div>
                  <label htmlFor="treatment-name" className="text-sm font-semibold text-foreground">
                    {t("What did you start?")}
                  </label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t("Choose one of your medicines or enter another treatment.")}
                  </p>

                  {!customTreatment && view.meds.length > 0 ? (
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <select
                        id="treatment-name"
                        value={treatmentName}
                        onChange={(event) => setTreatmentName(event.target.value)}
                        className="min-h-11 min-w-0 rounded-2xl bg-tint px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <option value="">{t("Choose medicine")}</option>
                        {view.meds.map((med) => (
                          <option key={med.id} value={med.name}>
                            {med.name}
                            {med.dose ? ` — ${med.dose}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTreatment(true);
                          setTreatmentName("");
                        }}
                        className="min-h-11 rounded-2xl bg-background px-3 text-xs font-semibold text-primary ring-1 ring-border"
                      >
                        {t("Other")}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        id="treatment-name"
                        type="text"
                        value={treatmentName}
                        onChange={(event) => setTreatmentName(event.target.value)}
                        placeholder={t("e.g. Elicea, physiotherapy, low-histamine diet")}
                        className="min-h-11 min-w-0 rounded-2xl bg-tint px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      {view.meds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTreatment(false);
                            setTreatmentName("");
                          }}
                          className="min-h-11 rounded-2xl bg-background px-3 text-xs font-semibold text-primary ring-1 ring-border"
                        >
                          {t("Medicines")}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="treatment-kind" className="text-sm font-semibold text-foreground">
                    {t("Type")}
                  </label>
                  <select
                    id="treatment-kind"
                    value={treatmentKind}
                    onChange={(event) => setTreatmentKind(event.target.value as TreatmentKind)}
                    className="mt-2 min-h-11 w-full rounded-2xl bg-tint px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="medication">{t("Medication")}</option>
                    <option value="supplement">{t("Supplement")}</option>
                    <option value="diet">{t("Diet")}</option>
                    <option value="therapy">{t("Therapy")}</option>
                    <option value="exercise">{t("Exercise")}</option>
                    <option value="other">{t("Other")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="treatment-result" className="text-sm font-semibold text-foreground">
                    {t("Treatment result")}
                  </label>
                  <select
                    id="treatment-result"
                    value={treatmentResult}
                    onChange={(event) => setTreatmentResult(event.target.value as TreatmentResult)}
                    className="mt-2 min-h-12 w-full rounded-2xl bg-tint px-4 text-sm font-medium text-foreground outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="pain">{t("Pain")}</option>
                    <option value="panicEpisodes">{t("Panic episode")}</option>
                    <option value="tetanyEpisodes">{t("Tetany episode")}</option>
                    <option value="headache">{t("Headache")}</option>
                    <option value="panicIntensity">{t("Panic intensity")}</option>
                    <option value="tetanyIntensity">{t("Tetany intensity")}</option>
                  </select>
                </div>

                <div>
                  <span className="text-sm font-semibold text-foreground">{t("Treatment start date")}</span>
                  <div className="relative mt-2 min-h-12 overflow-hidden rounded-2xl bg-tint ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                    <div className="pointer-events-none flex min-h-12 items-center justify-between gap-3 px-4">
                      <span
                        className={`text-sm font-medium ${treatmentDate ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {formattedTreatmentDate}
                      </span>
                      <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
                    </div>
                    <input
                      type="date"
                      aria-label={t("Treatment start date")}
                      max={todayKey()}
                      value={treatmentDate}
                      onChange={(event) => setTreatmentDate(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-[0.01]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="treatment-notes" className="text-sm font-semibold text-foreground">
                    {t("Notes")} <span className="font-normal text-muted-foreground">{t("(optional)")}</span>
                  </label>
                  <textarea
                    id="treatment-notes"
                    value={treatmentNotes}
                    onChange={(event) => setTreatmentNotes(event.target.value)}
                    placeholder={t("Why you started it, dose change, or anything useful to remember")}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl bg-tint px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {(treatmentDate || treatmentName || treatmentNotes) && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3 ring-1 ring-border">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {treatmentName || t("Unnamed treatment")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {treatmentKindLabel} · Result: {selectedTreatmentResult.label}
                        {treatmentDate ? ` · Started ${formattedTreatmentDate}` : " · Start date not selected"}
                      </p>
                    </div>
                  </div>
                )}

                {(treatmentDate || treatmentName || treatmentNotes) && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={archiveTreatmentComparison}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary/10 px-3 text-sm font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Archive className="h-4 w-4" />
                      {t("Archive")}
                    </button>
                    <button
                      type="button"
                      onClick={deleteTreatmentComparison}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-destructive/10 px-3 text-sm font-semibold text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("Delete")}
                    </button>
                  </div>
                )}

                {!treatmentDate && (
                  <Empty text="Add what you started and choose its start date. Then log at least 7 days before and after it to unlock the comparison." />
                )}
              </div>
            </Card>

            {treatmentDate && (
              <>
                <SummaryPanel
                  title={treatmentName ? `${treatmentName} at a glance` : "Treatment at a glance"}
                  items={[
                    {
                      label: "Treatment",
                      value: `${treatmentName || "Unnamed"} · ${treatmentKindLabel}`,
                      tone: "neutral",
                    },
                    {
                      label: "Started",
                      value: formattedTreatmentDate,
                      tone: "neutral",
                    },
                    {
                      label: "Treatment result",
                      value: selectedTreatmentResult.label,
                      tone: "neutral",
                    },
                    {
                      label: "Logged data",
                      value: `${treatmentBeforeLoggedDays} before · ${treatmentAfterLoggedDays} after`,
                      tone: "neutral",
                    },
                    {
                      label: "Overall",
                      value: treatmentOverall,
                      tone: treatmentOverall.includes("improvement")
                        ? "good"
                        : treatmentOverall.includes("worsening")
                          ? "bad"
                          : "neutral",
                    },
                    {
                      label: "Strongest change",
                      value: treatmentChangeLabel(strongestTreatmentChange),
                      tone:
                        strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta < 0
                          ? "good"
                          : strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta > 0
                            ? "bad"
                            : "neutral",
                    },
                  ]}
                  confidence={{
                    level: treatmentConfidence,
                    detail: `Based on ${treatmentBeforeLoggedDays} days before and ${treatmentAfterLoggedDays} days after`,
                  }}
                />

                <CollapsibleSection
                  title="Treatment results"
                  subtitle="Pain, tetany, panic, hot flashes and headache before versus after"
                  defaultOpen={true}
                >
                  <div className="space-y-3">
                    <ComparisonMetric
                      title="Pain"
                      subtitle="Average pain · 4 weeks before vs 4 weeks after"
                      previous={treatmentPain.before}
                      current={treatmentPain.after}
                      max={10}
                      decimals={1}
                      unit="/10"
                      color="rose"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<HeartPulse className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Tetany episodes"
                      subtitle="Average number of tetany episodes per day"
                      previous={treatmentTetanyEpisodes.before}
                      current={treatmentTetanyEpisodes.after}
                      decimals={2}
                      unit="/day"
                      color="blue"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Activity className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Tetany intensity"
                      subtitle="Average tetany intensity before and after treatment"
                      previous={treatmentTetany.before}
                      current={treatmentTetany.after}
                      max={5}
                      decimals={1}
                      unit="/5"
                      color="blue"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Activity className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Panic episodes"
                      subtitle="Average number of panic episodes per day"
                      previous={treatmentPanicEpisodes.before}
                      current={treatmentPanicEpisodes.after}
                      decimals={2}
                      unit="/day"
                      color="purple"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Sparkles className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Panic intensity"
                      subtitle="Average panic intensity before and after treatment"
                      previous={treatmentPanic.before}
                      current={treatmentPanic.after}
                      max={10}
                      decimals={1}
                      unit="/10"
                      color="purple"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Sparkles className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Hot flashes"
                      subtitle="Average hot flash intensity before and after treatment"
                      previous={treatmentHotFlash.before}
                      current={treatmentHotFlash.after}
                      max={5}
                      decimals={1}
                      unit="/5"
                      color="orange"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Flame className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Hot flash episodes"
                      subtitle="Average number of hot flash entries per day"
                      previous={treatmentHotFlashEpisodes.before}
                      current={treatmentHotFlashEpisodes.after}
                      decimals={2}
                      unit="/day"
                      color="orange"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Flame className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Headache"
                      subtitle="Average number of headache entries per day"
                      previous={treatmentHeadache.before}
                      current={treatmentHeadache.after}
                      decimals={2}
                      unit="/day"
                      color="cyan"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Brain className="h-5 w-5" />}
                    />

                    <ComparisonMetric
                      title="Headache intensity"
                      subtitle="Average headache intensity before and after treatment"
                      previous={treatmentHeadacheIntensity.before}
                      current={treatmentHeadacheIntensity.after}
                      max={10}
                      decimals={1}
                      unit="/10"
                      color="cyan"
                      higherIsWorse
                      previousLabel="Before"
                      currentLabel="After"
                      icon={<Brain className="h-5 w-5" />}
                    />
                  </div>
                </CollapsibleSection>

                {adminTreatmentMetrics.length > 0 ? (
                  <CollapsibleSection
                    layoutOrderValue={layoutOrder(view, "patterns.treatment", "customMetrics", 20)}
                    title="Custom metrics"
                    subtitle="Admin-created values before versus after treatment"
                    defaultOpen={false}
                  >
                    <div className="space-y-3">
                      {adminTreatmentMetrics.map((item) => (
                        <ComparisonMetric
                          key={item.id}
                          title={item.title}
                          subtitle="Average supplementary value · 4 weeks before vs 4 weeks after"
                          previous={item.metric.before}
                          current={item.metric.after}
                          max={item.max}
                          decimals={1}
                          unit={item.unit}
                          color="green"
                          neutralTrend
                          previousLabel="Before"
                          currentLabel="After"
                          icon={<Activity className="h-5 w-5" />}
                        />
                      ))}
                    </div>
                  </CollapsibleSection>
                ) : null}

                <CollapsibleSection
                  title="Detailed treatment summary"
                  subtitle="Counts and treatment marker details"
                  defaultOpen={false}
                >
                  <SummaryPanel
                    title="Treatment Summary"
                    items={[
                      {
                        label: "Improved metrics",
                        value: `${treatmentImprovedCount}`,
                        tone: treatmentImprovedCount > 0 ? "good" : "neutral",
                      },
                      {
                        label: "Worsened metrics",
                        value: `${treatmentWorsenedCount}`,
                        tone: treatmentWorsenedCount > 0 ? "bad" : "neutral",
                      },
                      {
                        label: "Unchanged metrics",
                        value: `${treatmentUnchangedCount}`,
                        tone: "neutral",
                      },
                      {
                        label: "Strongest change",
                        value: treatmentChangeLabel(strongestTreatmentChange),
                        tone:
                          strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta < 0
                            ? "good"
                            : strongestTreatmentChange?.delta != null && strongestTreatmentChange.delta > 0
                              ? "bad"
                              : "neutral",
                      },
                      {
                        label: "Overall",
                        value: treatmentOverall,
                        tone: treatmentOverall.includes("improvement")
                          ? "good"
                          : treatmentOverall.includes("worsening")
                            ? "bad"
                            : "neutral",
                      },
                    ]}
                    confidence={{
                      level: treatmentConfidence,
                      detail: `Based on ${treatmentBeforeLoggedDays} days before and ${treatmentAfterLoggedDays} days after`,
                    }}
                  />

                  <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
                    Treatment marker: {treatmentDate}. The comparison uses up to 28 days on each side of this date.
                  </p>
                </CollapsibleSection>
              </>
            )}
          </div>
        )}

        </>);
}
