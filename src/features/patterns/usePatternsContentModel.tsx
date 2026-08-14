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
} from "@/components/icons/BixboExtraIcons";
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

export function usePatternsContentModel() {
const { t, language } = useI18n();

const { data, update, hydrated } = useBixbo();

const view = hydrated ? data : EMPTY;

const dayLogs = view.dayLogs;

const cycleTrackingHidden = isCycleTrackingHidden(view);

const [activeTab, setActiveTab] = useState<PatternTab>(cycleTrackingHidden ? "monthly" : "cycle");

const [analysisRange, setAnalysisRange] = useState<AnalysisRange>(30);

useEffect(() => {
    if (cycleTrackingHidden && activeTab === "cycle") {
      setActiveTab("monthly");
    }
  }, [activeTab, cycleTrackingHidden]);

const cycles = useMemo(() => (cycleTrackingHidden ? [] : historicCycles(view)), [cycleTrackingHidden, view]);

const phaseBuckets = useMemo(() => phaseDays(cycles), [cycles]);

const painPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, (log) => avgDayPain(log) ?? null),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, (log) => avgDayPain(log) ?? null),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, (log) => avgDayPain(log) ?? null),
    },
  ];

const moodPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, negativeMoodCount),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, negativeMoodCount),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, negativeMoodCount),
    },
  ];

const energyPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayEnergy),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayEnergy),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayEnergy),
    },
  ];

const hotFlashPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayHotFlash),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayHotFlash),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayHotFlash),
    },
  ];

const pressurePhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayPressureIntensity),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayPressureIntensity),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayPressureIntensity),
    },
  ];

const bowelPhaseBars: PhaseBar[] = [
    {
      label: "Before",
      value: phaseAvg(phaseBuckets.before, dayLogs, dayBowelSymptoms),
    },
    {
      label: "During",
      value: phaseAvg(phaseBuckets.during, dayLogs, dayBowelSymptoms),
    },
    {
      label: "After",
      value: phaseAvg(phaseBuckets.after, dayLogs, dayBowelSymptoms),
    },
  ];

const adminCycleMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {
    const feature = getRegistryFeature(view, featureBase.id);
    return registryAdminCycleFieldsForFeature(view, featureBase.id).map((field) => {
      const metricFn = (log: DayLog) => {
        const values = (log.adminFields?.[featureBase.id] ?? []).map((entry) => strictAdminNumericValue(entry.values[field.id])).filter((value) => Number.isFinite(value));
        return avg(values);
      };
      return { id: `${featureBase.id}:${field.id}`, title: `${feature.label} · ${field.label}`, bars: [
        { label: "Before", value: phaseAvg(phaseBuckets.before, dayLogs, metricFn) },
        { label: "During", value: phaseAvg(phaseBuckets.during, dayLogs, metricFn) },
        { label: "After", value: phaseAvg(phaseBuckets.after, dayLogs, metricFn) },
      ] as PhaseBar[], max: field.kind === "scale" ? field.scale?.max : undefined, unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "" };
    });
  });

const commonFlow = phaseFlowMode(phaseBuckets.during, dayLogs);

const highestPainPhase = phaseLabelByValue(painPhaseBars);

const bestEnergyPhase = phaseLabelByValue(energyPhaseBars);

const worstMoodPhase = phaseLabelByValue(moodPhaseBars);

const mostHotFlashPhase = phaseLabelByValue(hotFlashPhaseBars);

const [currentMonthPrefix, previousMonthPrefix] = thisAndLastMonthPrefixes();

const currentMonthLabel = monthLabelFromPrefix(currentMonthPrefix, language);

const previousMonthLabel = monthLabelFromPrefix(previousMonthPrefix, language);

const monthlyComparisonLabel = `${currentMonthLabel} vs ${previousMonthLabel}`;

const currentMonthDays = daysOfMonth(currentMonthPrefix).filter((day) => day <= todayKey());

const elapsedDayCount = currentMonthDays.length;

const previousMonthDays = daysOfMonth(previousMonthPrefix).slice(0, elapsedDayCount);

function countAndAverage(
    days: string[],
    countFn: (log: DayLog) => number,
    intensityFn: (log: DayLog) => number | null,
  ) {
    let count = 0;
    const intensities: number[] = [];

    days.forEach((day) => {
      const log = dayLogs[day];

      if (!log) return;

      count += countFn(log);

      const intensity = intensityFn(log);

      if (intensity != null && Number.isFinite(intensity)) {
        intensities.push(intensity);
      }
    });

    return {
      count,
      intensity: avg(intensities),
    };
  }

const panicCurrent = countAndAverage(currentMonthDays, (log) => log.panic?.length ?? 0, dayPanicIntensity);

const panicPrevious = countAndAverage(previousMonthDays, (log) => log.panic?.length ?? 0, dayPanicIntensity);

const tetanyCurrent = countAndAverage(currentMonthDays, (log) => log.tetany?.length ?? 0, dayTetanyIntensity);

const tetanyPrevious = countAndAverage(previousMonthDays, (log) => log.tetany?.length ?? 0, dayTetanyIntensity);

const hotFlashCurrent = countAndAverage(
    currentMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0).length,
    dayHotFlash,
  );

const hotFlashPrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0).length,
    dayHotFlash,
  );

const headacheCurrent = countAndAverage(
    currentMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.headache).length,
    dayHeadacheIntensity,
  );

const headachePrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.headache).length,
    dayHeadacheIntensity,
  );

const pressureCurrent = countAndAverage(
    currentMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.pressureIntensity != null).length,
    dayPressureIntensity,
  );

const pressurePrevious = countAndAverage(
    previousMonthDays,
    (log) => (log.pain ?? []).filter((entry) => entry.pressureIntensity != null).length,
    dayPressureIntensity,
  );

const sleepAverage = (days: string[]) =>
    avg(days.map((day) => dayLogs[day]?.sleepHours).filter((value): value is number => value != null));

const weightAverage = (days: string[]) =>
    avg(days.map((day) => latestWeightForDay(dayLogs[day])).filter((value): value is number => value != null));

const adminMonthlyMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {
    const feature = getRegistryFeature(view, featureBase.id);
    return registryAdminMonthlyFieldsForFeature(view, featureBase.id).map((field) => {
      const averageForDays = (days: string[]) => {
        const values = days.flatMap((day) =>
          (dayLogs[day]?.adminFields?.[featureBase.id] ?? [])
            .map((entry) => strictAdminNumericValue(entry.values[field.id]))
            .filter((value) => Number.isFinite(value)),
        );
        return avg(values);
      };
      return {
        id: `${featureBase.id}:${field.id}`,
        title: `${feature.label} · ${field.label}`,
        previous: averageForDays(previousMonthDays),
        current: averageForDays(currentMonthDays),
        max: field.kind === "scale" ? field.scale?.max : undefined,
        unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "",
      };
    });
  });

const medicationAdherence = (days: string[]) => {
    const scheduledMeds = view.meds.filter((med) => !med.asNeeded);
    const comparisonNow = new Date();
    const cutoffMinutes = comparisonNow.getHours() * 60 + comparisonNow.getMinutes();
    const lastComparableDay = days[days.length - 1];

    let expected = 0;
    let taken = 0;

    days.forEach((day) => {
      scheduledMeds.forEach((med) => {
        med.times.forEach((time) => {
          const key = `${med.id}@${time}`;
          const isTaken = !!view.medLog[day]?.[key];

          if (day === lastComparableDay && !isTaken) {
            const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
            if (!match) return;

            const scheduledMinutes = Number(match[1]) * 60 + Number(match[2]);
            if (scheduledMinutes > cutoffMinutes) return;
          }

          expected += 1;
          if (isTaken) taken += 1;
        });
      });
    });

    return expected > 0 ? (taken / expected) * 100 : null;
  };

const workoutStats = (days: string[]) => {
    let count = 0;
    let minutes = 0;

    days.forEach((day) => {
      (dayLogs[day]?.workout ?? []).forEach((workout) => {
        count += 1;
        minutes += workout.minutes || 0;
      });
    });

    return {
      count,
      minutes,
    };
  };

const workoutCurrent = workoutStats(currentMonthDays);

const workoutPrevious = workoutStats(previousMonthDays);

const pcosFrequency = (days: string[]) =>
    days.reduce(
      (total, day) =>
        total +
        (dayLogs[day]?.pain ?? []).reduce((dayTotal, painEntry) => dayTotal + (painEntry.pcosSymptoms?.length ?? 0), 0),
      0,
    );

const histamineFrequency = (days: string[]) =>
    days.reduce(
      (total, day) => total + (dayLogs[day]?.food ?? []).filter((foodEntry) => foodEntry.histamineFlare).length,
      0,
    );

const sleepCurrent = sleepAverage(currentMonthDays);

const sleepPrevious = sleepAverage(previousMonthDays);

const weightCurrent = weightAverage(currentMonthDays);

const weightPrevious = weightAverage(previousMonthDays);

const medicationCurrent = medicationAdherence(currentMonthDays);

const medicationPrevious = medicationAdherence(previousMonthDays);

const pcosCurrent = pcosFrequency(currentMonthDays);

const pcosPrevious = pcosFrequency(previousMonthDays);

const histamineCurrent = histamineFrequency(currentMonthDays);

const histaminePrevious = histamineFrequency(previousMonthDays);

const monthlyLoggedDays = currentMonthDays.filter((day) => Boolean(dayLogs[day])).length;

const monthlyConfidence: ConfidenceLevel =
    monthlyLoggedDays >= 21 ? "High" : monthlyLoggedDays >= 7 ? "Medium" : "Low";

const monthlyChanges = (() => {
    const entries = [
      {
        label: "Panic attacks",
        previous: panicPrevious.count,
        current: panicCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Tetany episodes",
        previous: tetanyPrevious.count,
        current: tetanyCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Hot flashes",
        previous: hotFlashPrevious.count,
        current: hotFlashCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Headaches",
        previous: headachePrevious.count,
        current: headacheCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Pressure entries",
        previous: pressurePrevious.count,
        current: pressureCurrent.count,
        higherIsWorse: true,
        unit: "",
      },
      {
        label: "Medication adherence",
        previous: medicationPrevious,
        current: medicationCurrent,
        higherIsWorse: false,
        unit: "%",
      },
      {
        label: "Workouts",
        previous: workoutPrevious.count,
        current: workoutCurrent.count,
        higherIsWorse: false,
        unit: "",
      },
      {
        label: "Workout time",
        previous: workoutPrevious.minutes,
        current: workoutCurrent.minutes,
        higherIsWorse: false,
        unit: " min",
      },
      { label: "PCOS symptoms", previous: pcosPrevious, current: pcosCurrent, higherIsWorse: true, unit: "" },
      {
        label: "Histamine flares",
        previous: histaminePrevious,
        current: histamineCurrent,
        higherIsWorse: true,
        unit: "",
      },
    ].filter((entry) => entry.previous != null && entry.current != null);

    return entries.map((entry) => {
      const delta = Number(entry.current) - Number(entry.previous);
      const score = entry.higherIsWorse ? -delta : delta;
      return { ...entry, delta, score };
    });
  })();

const mostImproved = [...monthlyChanges].sort((a, b) => b.score - a.score)[0] ?? null;

const mostWorsened = [...monthlyChanges].sort((a, b) => a.score - b.score)[0] ?? null;

const mostStable = [...monthlyChanges].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0] ?? null;

const formatChange = (entry: (typeof monthlyChanges)[number] | null) => {
    if (!entry) return "Not enough data";
    const sign = entry.delta > 0 ? "+" : "";
    return `${entry.label}: ${sign}${entry.delta.toFixed(entry.unit === "%" ? 0 : 1)}${entry.unit}`;
  };

const legacyTreatmentMigrationChecked = useRef(false);

const activeTreatment = view.patterns?.activeTreatment;

const archivedTreatments = view.patterns?.treatmentArchive ?? [];

const treatmentDate = activeTreatment?.date ?? "";

const treatmentName = activeTreatment?.name ?? "";

const treatmentKind: TreatmentKind = activeTreatment?.kind ?? "medication";

const treatmentResult: TreatmentResult = activeTreatment?.result ?? "pain";

const treatmentNotes = activeTreatment?.notes ?? "";

const customTreatment = activeTreatment?.custom ?? false;

const patchActiveTreatment = (patch: Partial<NonNullable<typeof activeTreatment>>) => {
    update((d) => {
      const current = d.patterns?.activeTreatment ?? {
        date: "",
        name: "",
        kind: "medication" as TreatmentKind,
        result: "pain" as TreatmentResult,
        notes: "",
        custom: false,
      };
      return {
        ...d,
        patterns: {
          ...(d.patterns ?? { treatmentArchive: [] }),
          activeTreatment: { ...current, ...patch },
          treatmentArchive: d.patterns?.treatmentArchive ?? [],
        },
      };
    });
  };

const setTreatmentDate = (value: string) => patchActiveTreatment({ date: value });

const setTreatmentName = (value: string) => patchActiveTreatment({ name: value });

const setTreatmentKind = (value: TreatmentKind) => patchActiveTreatment({ kind: value });

const setTreatmentResult = (value: TreatmentResult) => patchActiveTreatment({ result: value });

const setTreatmentNotes = (value: string) => patchActiveTreatment({ notes: value });

const setCustomTreatment = (value: boolean) => patchActiveTreatment({ custom: value });

useEffect(() => {
    if (!hydrated || legacyTreatmentMigrationChecked.current || typeof window === "undefined") return;
    legacyTreatmentMigrationChecked.current = true;

    const migrationKey = "bixbo:patterns:treatment:migrated-to-main-data";
    if (window.localStorage.getItem(migrationKey) === "1") return;

    const parseObject = (raw: string | null): Record<string, unknown> | null => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };
    const parseArray = (raw: string | null): ArchivedTreatment[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ArchivedTreatment[]) : [];
      } catch {
        return [];
      }
    };

    const legacyActive =
      parseObject(window.localStorage.getItem("bixbo:patterns:treatment")) ??
      parseObject(window.localStorage.getItem("bixbo:patterns:treatment:backup"));
    const legacyArchivePrimary = parseArray(window.localStorage.getItem("bixbo:patterns:treatment-archive"));
    const legacyArchiveBackup = parseArray(window.localStorage.getItem("bixbo:patterns:treatment-archive:backup"));
    const legacyArchive = legacyArchivePrimary.length ? legacyArchivePrimary : legacyArchiveBackup;

    if (legacyActive || legacyArchive.length) {
      update((d) => {
        const alreadyHasActive = Boolean(d.patterns?.activeTreatment);
        const alreadyHasArchive = Boolean(d.patterns?.treatmentArchive?.length);
        const importedActive = legacyActive
          ? {
              date: typeof legacyActive.date === "string" ? legacyActive.date : "",
              name: typeof legacyActive.name === "string" ? legacyActive.name : "",
              kind: (typeof legacyActive.kind === "string" ? legacyActive.kind : "medication") as TreatmentKind,
              result: (typeof legacyActive.result === "string" ? legacyActive.result : "pain") as TreatmentResult,
              notes: typeof legacyActive.notes === "string" ? legacyActive.notes : "",
              custom: Boolean(legacyActive.custom),
            }
          : undefined;

        return {
          ...d,
          patterns: {
            ...(d.patterns ?? { treatmentArchive: [] }),
            activeTreatment: alreadyHasActive ? d.patterns?.activeTreatment : importedActive,
            treatmentArchive: alreadyHasArchive ? d.patterns!.treatmentArchive : legacyArchive,
          },
        };
      });
    }

    // Keep the old keys as an emergency read-only copy for this migration,
    // but never use them as the canonical source again.
    window.localStorage.setItem(migrationKey, "1");
  }, [hydrated, update]);

const clearActiveTreatment = () => {
    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        activeTreatment: undefined,
        treatmentArchive: d.patterns?.treatmentArchive ?? [],
      },
    }));
  };

const archiveTreatmentComparison = () => {
    if (!treatmentDate) {
      window.alert("Choose a treatment start date before archiving.");
      return;
    }

    if (
      !window.confirm(
        "Archive this treatment? It will move to Treatment history and remain available for future review. Daily health logs and medications will not be changed.",
      )
    ) {
      return;
    }

    const archived: ArchivedTreatment = {
      id: `${Date.now()}`,
      name: treatmentName.trim() || "Unnamed treatment",
      kind: treatmentKind,
      result: treatmentResult,
      notes: treatmentNotes.trim(),
      startDate: treatmentDate,
      archivedAt: todayKey(),
      custom: customTreatment,
    };

    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        activeTreatment: undefined,
        treatmentArchive: [archived, ...(d.patterns?.treatmentArchive ?? [])],
      },
    }));
  };

const deleteTreatmentComparison = () => {
    if (
      !window.confirm(
        "Permanently delete this treatment comparison? This removes the treatment name, type, start date and notes. Daily health logs and medications will NOT be deleted.",
      )
    ) {
      return;
    }

    clearActiveTreatment();
  };

const restoreArchivedTreatment = (archived: ArchivedTreatment) => {
    if (
      treatmentDate &&
      !window.confirm(
        "Replace the current active treatment with this archived treatment? The current active treatment will not be archived automatically.",
      )
    ) {
      return;
    }

    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        activeTreatment: {
          date: archived.startDate,
          name: archived.name === "Unnamed treatment" ? "" : archived.name,
          kind: archived.kind,
          result: archived.result ?? "pain",
          notes: archived.notes,
          custom: archived.custom,
        },
        treatmentArchive: (d.patterns?.treatmentArchive ?? []).filter((item) => item.id !== archived.id),
      },
    }));
  };

const deleteArchivedTreatment = (id: string) => {
    if (
      !window.confirm(
        "Permanently delete this archived treatment? Daily health logs and medications will NOT be deleted.",
      )
    ) {
      return;
    }

    update((d) => ({
      ...d,
      patterns: {
        ...(d.patterns ?? { treatmentArchive: [] }),
        treatmentArchive: (d.patterns?.treatmentArchive ?? []).filter((item) => item.id !== id),
      },
    }));
  };

const treatmentWindow = (before: boolean) => {
    if (!treatmentDate) return [] as string[];

    const days: string[] = [];

    for (let index = 1; index <= 28; index += 1) {
      days.push(before ? addDays(treatmentDate, -index) : addDays(treatmentDate, index - 1));
    }

    return days;
  };

const treatmentBeforeDays = treatmentWindow(true);

const treatmentAfterDays = treatmentWindow(false).filter((day) => day <= todayKey());

const treatmentBeforeLoggedDays = treatmentBeforeDays.filter((day) => Boolean(dayLogs[day])).length;

const treatmentAfterLoggedDays = treatmentAfterDays.filter((day) => Boolean(dayLogs[day])).length;

const treatmentMetric = (metricFn: (log: DayLog) => number | null): TreatmentMetric => ({
    before: avg(
      treatmentBeforeDays.map((day) => metricFn(dayLogs[day] ?? {})).filter((value): value is number => value != null),
    ),
    after: avg(
      treatmentAfterDays.map((day) => metricFn(dayLogs[day] ?? {})).filter((value): value is number => value != null),
    ),
  });

const treatmentEventRate = (countFn: (log: DayLog) => number): TreatmentMetric => ({
    before: treatmentBeforeDays.length
      ? treatmentBeforeDays.reduce((sum, day) => sum + countFn(dayLogs[day] ?? {}), 0) / treatmentBeforeDays.length
      : null,
    after: treatmentAfterDays.length
      ? treatmentAfterDays.reduce((sum, day) => sum + countFn(dayLogs[day] ?? {}), 0) / treatmentAfterDays.length
      : null,
  });

const treatmentPain = treatmentMetric((log) => avgDayPain(log) ?? null);

const treatmentTetany = treatmentMetric(dayTetanyIntensity);

const treatmentPanic = treatmentMetric(dayPanicIntensity);

const treatmentTetanyEpisodes = treatmentEventRate((log) => log.tetany?.length ?? 0);

const treatmentPanicEpisodes = treatmentEventRate((log) => log.panic?.length ?? 0);

const treatmentHeadache = treatmentEventRate(
    (log) =>
      (log.pain ?? []).filter(
        (entry) =>
          entry.headache ||
          entry.headacheIntensity != null ||
          (entry.headacheTypes?.length ?? 0) > 0,
      ).length,
  );

const treatmentHeadacheIntensity = treatmentMetric(dayHeadacheIntensity);

const adminTreatmentMetrics = BIXBO_REGISTRY.flatMap((featureBase) => {
    const feature = getRegistryFeature(view, featureBase.id);
    return registryAdminTreatmentFieldsForFeature(view, featureBase.id).map((field) => {
      const metric = treatmentMetric((log) => {
        const values = (log.adminFields?.[featureBase.id] ?? [])
          .map((entry) => strictAdminNumericValue(entry.values[field.id]))
          .filter((value) => Number.isFinite(value));
        return avg(values);
      });
      return {
        id: `${featureBase.id}:${field.id}`,
        title: `${feature.label} · ${field.label}`,
        metric,
        max: field.kind === "scale" ? field.scale?.max : undefined,
        unit: field.kind === "scale" && field.scale?.max != null ? `/${field.scale.max}` : "",
      };
    });
  });

const treatmentHotFlash = treatmentMetric(dayHotFlash);

const treatmentHotFlashEpisodes = treatmentEventRate(
    (log) =>
      (log.pain ?? []).filter(
        (entry) => entry.hotFlashesOn || (entry.hotFlashes ?? 0) > 0,
      ).length,
  );

const treatmentResultOptions: Array<{
    id: TreatmentResult;
    label: string;
    metric: TreatmentMetric;
    decimals: number;
    unit: string;
    max?: number;
    color: MetricColor;
  }> = [
    { id: "pain", label: "Pain", metric: treatmentPain, decimals: 1, unit: "/10", max: 10, color: "rose" },
    {
      id: "panicEpisodes",
      label: "Panic episode",
      metric: treatmentPanicEpisodes,
      decimals: 2,
      unit: "/day",
      color: "purple",
    },
    {
      id: "tetanyEpisodes",
      label: "Tetany episode",
      metric: treatmentTetanyEpisodes,
      decimals: 2,
      unit: "/day",
      color: "blue",
    },
    {
      id: "headache",
      label: "Headache",
      metric: treatmentHeadache,
      decimals: 2,
      unit: "/day",
      color: "cyan",
    },
    {
      id: "panicIntensity",
      label: "Panic intensity",
      metric: treatmentPanic,
      decimals: 1,
      unit: "/10",
      max: 10,
      color: "purple",
    },
    {
      id: "tetanyIntensity",
      label: "Tetany intensity",
      metric: treatmentTetany,
      decimals: 1,
      unit: "/5",
      max: 5,
      color: "blue",
    },
  ];

const selectedTreatmentResult =
    treatmentResultOptions.find((option) => option.id === treatmentResult) ?? treatmentResultOptions[0];

const treatmentChanges = [
    { label: "Pain", metric: treatmentPain },
    { label: "Tetany episodes", metric: treatmentTetanyEpisodes },
    { label: "Tetany intensity", metric: treatmentTetany },
    { label: "Panic episodes", metric: treatmentPanicEpisodes },
    { label: "Panic intensity", metric: treatmentPanic },
    { label: "Hot flashes", metric: treatmentHotFlash },
    { label: "Hot flash episodes", metric: treatmentHotFlashEpisodes },
    { label: "Headache", metric: treatmentHeadache },
    { label: "Headache intensity", metric: treatmentHeadacheIntensity },
  ]
    .filter((entry) => entry.metric.before != null && entry.metric.after != null)
    .map((entry) => {
      const delta = Number(entry.metric.after) - Number(entry.metric.before);
      return {
        ...entry,
        delta,
        percent: percentageChange(entry.metric.before, entry.metric.after),
      };
    });

const treatmentImprovedCount = treatmentChanges.filter((entry) => entry.delta < 0).length;

const treatmentWorsenedCount = treatmentChanges.filter((entry) => entry.delta > 0).length;

const treatmentUnchangedCount = treatmentChanges.filter((entry) => entry.delta === 0).length;

const strongestTreatmentChange =
    [...treatmentChanges].sort((a, b) => Math.abs(b.percent ?? b.delta) - Math.abs(a.percent ?? a.delta))[0] ?? null;

const treatmentOverall =
    treatmentChanges.length === 0
      ? "Not enough data"
      : treatmentImprovedCount > treatmentWorsenedCount
        ? "Overall improvement"
        : treatmentWorsenedCount > treatmentImprovedCount
          ? "Overall worsening"
          : "Mixed or unchanged";

const treatmentLoggedDays = treatmentBeforeLoggedDays + treatmentAfterLoggedDays;

const treatmentConfidence: ConfidenceLevel =
    treatmentBeforeLoggedDays >= 21 && treatmentAfterLoggedDays >= 21
      ? "High"
      : treatmentBeforeLoggedDays >= 7 && treatmentAfterLoggedDays >= 7
        ? "Medium"
        : "Low";

const treatmentChangeLabel = (entry: (typeof treatmentChanges)[number] | null) => {
    if (!entry) return "Not enough data";
    const direction = entry.delta < 0 ? "improved" : entry.delta > 0 ? "worsened" : "unchanged";
    const relative = entry.percent == null ? "" : ` · ${formatSignedPercent(entry.percent)}`;
    return `${entry.label}: ${direction}${relative}`;
  };

const formattedTreatmentDate = treatmentDate
    ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${treatmentDate}T12:00:00`),
      )
    : "Select treatment start date";

const treatmentKindLabel =
    treatmentKind === "medication"
      ? "Medication"
      : treatmentKind === "supplement"
        ? "Supplement"
        : treatmentKind === "diet"
          ? "Diet"
          : treatmentKind === "therapy"
            ? "Therapy"
            : treatmentKind === "exercise"
              ? "Exercise"
              : "Other";

const customCorrelationOptions: SelectOption[] = BIXBO_REGISTRY.flatMap((featureBase) => {
    const feature = getRegistryFeature(view, featureBase.id);
    return registryAdminCorrelationFieldsForFeature(view, featureBase.id).flatMap((field) => {
      if (field.kind === "toggle") {
        return [{ id: `admin-toggle:${featureBase.id}:${field.id}`, label: `${feature.label} · ${field.label}` }];
      }
      if (field.kind === "chips") {
        return (field.options ?? []).filter((option) => option.trim()).map((option) => ({
          id: `admin-choice:${featureBase.id}:${field.id}:${encodeURIComponent(option)}`,
          label: `${feature.label} · ${field.label}: ${field.optionLabels?.[option] ?? option}`,
        }));
      }
      const threshold = registryAdminCorrelationThreshold(view, featureBase.id, field.id);
      if (!threshold) return [];
      return [{
        id: `admin-threshold:${featureBase.id}:${field.id}`,
        label: `${feature.label} · ${field.label}: daily avg ${threshold.operator === "gte" ? "≥" : "≤"} ${threshold.value}`,
      }];
    });
  });

const customCorrelationOptionKey = customCorrelationOptions.map((option) => option.id).join("|");

const triggerOptions: SelectOption[] = [
    {
      id: "highCaffeine",
      label: "High caffeine (≥200 mg)",
    },
    {
      id: "anyCaffeine",
      label: "Any caffeine",
    },
    {
      id: "alcohol",
      label: "Alcohol",
    },
    {
      id: "workout",
      label: "Any workout",
    },
    {
      id: "longWorkout",
      label: "Long workout (≥45 min)",
    },
    {
      id: "poorSleep",
      label: "Poor sleep (<6 h)",
    },
    {
      id: "oversleep",
      label: "Long sleep (>9 h)",
    },
    {
      id: "highHistamine",
      label: "High-histamine food",
    },
    {
      id: "histamineFlare",
      label: "Histamine flare",
    },
    {
      id: "period",
      label: "Period day",
    },
    {
      id: "heavyPeriod",
      label: "Heavy period",
    },
    {
      id: "panic",
      label: "Panic attack",
    },
    {
      id: "tetany",
      label: "Tetany episode",
    },
    {
      id: "headache",
      label: "Headache",
    },
    {
      id: "hotFlash",
      label: "Hot flash",
    },
    {
      id: "medicationMissed",
      label: "Scheduled medication missed",
    },
    ...view.custom.foodQuickAdd.map((food) => ({
      id: `food:${food}`,
      label: `Ate "${food}"`,
    })),
    ...customCorrelationOptions,
  ].filter((option) => {
    if (!cycleTrackingHidden) return true;
    return option.id !== "period" && option.id !== "heavyPeriod";
  });

const outcomeOptions: SelectOption[] = [
    {
      id: "tetany",
      label: "Tetany episode",
    },
    {
      id: "panic",
      label: "Panic attack",
    },
    {
      id: "pain3",
      label: "Pain ≥3",
    },
    {
      id: "pain5",
      label: "Pain ≥5",
    },
    {
      id: "pain7",
      label: "Pain ≥7",
    },
    {
      id: "hotFlash",
      label: "Hot flash",
    },
    {
      id: "headache",
      label: "Headache",
    },
    {
      id: "lowEnergy",
      label: "Low energy",
    },
    {
      id: "negativeMood",
      label: "Negative mood",
    },
    {
      id: "bowelSymptoms",
      label: "Bowel symptoms",
    },
    {
      id: "poorSleep",
      label: "Poor sleep",
    },
    {
      id: "histamineFlare",
      label: "Histamine flare",
    },
    {
      id: "pcosSymptoms",
      label: "PCOS symptoms",
    },
    ...customCorrelationOptions,
  ];

const triggerOptionIdKey = triggerOptions.map((option) => option.id).join("\u0000");
const outcomeOptionIdKey = outcomeOptions.map((option) => option.id).join("\u0000");

const [selectedTrigger, setSelectedTrigger] = useState(triggerOptions[0]?.id ?? "");

const [selectedOutcome, setSelectedOutcome] = useState(outcomeOptions[0]?.id ?? "");

useEffect(() => {
    const ids = triggerOptionIdKey ? triggerOptionIdKey.split("\u0000") : [];
    if (!ids.includes(selectedTrigger)) setSelectedTrigger(ids[0] ?? "");
  }, [selectedTrigger, triggerOptionIdKey]);

useEffect(() => {
    const ids = outcomeOptionIdKey ? outcomeOptionIdKey.split("\u0000") : [];
    if (!ids.includes(selectedOutcome)) setSelectedOutcome(ids[0] ?? "");
  }, [outcomeOptionIdKey, selectedOutcome]);

const hasScheduledMedicationMissed = (day: string): boolean => {
    const scheduledMeds = view.meds.filter((med) => !med.asNeeded);

    if (scheduledMeds.length === 0) return false;

    return scheduledMeds.some((med) => med.times.some((time) => !view.medLog[day]?.[`${med.id}@${time}`]));
  };

const hasAdminToggle = (log: DayLog, id: string): boolean => {
    const [, rawFeatureId, fieldId] = id.split(":");
    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;
    return (log.adminFields?.[featureId] ?? []).some((entry) => entry.values[fieldId] === true);
  };

const hasAdminChoice = (log: DayLog, id: string): boolean => {
    const [, rawFeatureId, fieldId, encodedOption] = id.split(":");
    const featureId = rawFeatureId as keyof NonNullable<DayLog["adminFields"]>;
    const option = decodeURIComponent(encodedOption ?? "");
    return (log.adminFields?.[featureId] ?? []).some((entry) => {
      const value = entry.values[fieldId];
      return Array.isArray(value) && value.includes(option);
    });
  };

const hasAdminThreshold = (log: DayLog, id: string): boolean => {
    const [, rawFeatureId, fieldId] = id.split(":");
    const featureId = rawFeatureId as RegistryFeatureId;
    const threshold = registryAdminCorrelationThreshold(view, featureId, fieldId);
    if (!threshold) return false;
    const values = (log.adminFields?.[featureId] ?? [])
      .map((entry) => strictAdminNumericValue(entry.values[fieldId]))
      .filter((value) => Number.isFinite(value));
    const dailyAverage = avg(values);
    if (dailyAverage == null) return false;
    return threshold.operator === "gte" ? dailyAverage >= threshold.value : dailyAverage <= threshold.value;
  };

const hasTrigger = (day: string, log: DayLog | undefined, trigger: string): boolean => {
    if (!log) return false;

    if (trigger.startsWith("admin-toggle:")) return hasAdminToggle(log, trigger);
    if (trigger.startsWith("admin-choice:")) return hasAdminChoice(log, trigger);
    if (trigger.startsWith("admin-threshold:")) return hasAdminThreshold(log, trigger);

    if (trigger === "highCaffeine") {
      return (log.food ?? []).some((food) => (food.caffeineMg ?? 0) >= 200);
    }

    if (trigger === "anyCaffeine") {
      return (log.food ?? []).some((food) => (food.caffeineMg ?? 0) > 0);
    }

    if (trigger === "alcohol") {
      return (log.food ?? []).some((food) => (food.alcoholDrinks ?? 0) > 0);
    }

    if (trigger === "workout") {
      return (log.workout?.length ?? 0) > 0;
    }

    if (trigger === "longWorkout") {
      return (log.workout ?? []).some((workout) => (workout.minutes ?? 0) >= 45);
    }

    if (trigger === "poorSleep") {
      return log.sleepHours != null && log.sleepHours < 6;
    }

    if (trigger === "oversleep") {
      return log.sleepHours != null && log.sleepHours > 9;
    }

    if (trigger === "highHistamine") {
      return (log.food ?? []).some((food) => food.highHistamine);
    }

    if (trigger === "histamineFlare") {
      return (log.food ?? []).some((food) => food.histamineFlare);
    }

    if (trigger === "period") {
      const level = log.periodInfo?.level ?? log.period;
      return (
        level === "spotting" || level === "light" || level === "medium" || level === "heavy" || level === "very-heavy"
      );
    }

    if (trigger === "heavyPeriod") {
      const level = log.periodInfo?.level ?? log.period;
      return level === "heavy" || level === "very-heavy";
    }

    if (trigger === "panic") {
      return (log.panic?.length ?? 0) > 0;
    }

    if (trigger === "tetany") {
      return (log.tetany?.length ?? 0) > 0;
    }

    if (trigger === "headache") {
      return (log.pain ?? []).some((painEntry) => painEntry.headache);
    }

    if (trigger === "hotFlash") {
      return (log.pain ?? []).some((painEntry) => painEntry.hotFlashesOn);
    }

    if (trigger === "medicationMissed") {
      return hasScheduledMedicationMissed(day);
    }

    if (trigger.startsWith("food:")) {
      const foodName = trigger.slice(5);

      return (log.food ?? []).some((food) => food.what === foodName);
    }

    return false;
  };

const hasOutcome = (log: DayLog | undefined, outcome: string): boolean => {
    if (!log) return false;

    if (outcome.startsWith("admin-toggle:")) return hasAdminToggle(log, outcome);
    if (outcome.startsWith("admin-choice:")) return hasAdminChoice(log, outcome);
    if (outcome.startsWith("admin-threshold:")) return hasAdminThreshold(log, outcome);

    if (outcome === "tetany") {
      return (log.tetany?.length ?? 0) > 0;
    }

    if (outcome === "panic") {
      return (log.panic?.length ?? 0) > 0;
    }

    if (outcome === "pain3") {
      return (avgDayPain(log) ?? 0) >= 3;
    }

    if (outcome === "pain5") {
      return (avgDayPain(log) ?? 0) >= 5;
    }

    if (outcome === "pain7") {
      return (avgDayPain(log) ?? 0) >= 7;
    }

    if (outcome === "hotFlash") {
      return (log.pain ?? []).some((painEntry) => painEntry.hotFlashesOn);
    }

    if (outcome === "headache") {
      return (log.pain ?? []).some((painEntry) => painEntry.headache);
    }

    if (outcome === "lowEnergy") {
      const energy = dayEnergy(log);
      return energy != null && energy <= 2;
    }

    if (outcome === "negativeMood") {
      return negativeMoodCount(log) > 0;
    }

    if (outcome === "bowelSymptoms") {
      return (dayBowelSymptoms(log) ?? 0) > 0;
    }

    if (outcome === "poorSleep") {
      return log.sleepHours != null && log.sleepHours < 6;
    }

    if (outcome === "histamineFlare") {
      return (log.food ?? []).some((food) => food.histamineFlare);
    }

    if (outcome === "pcosSymptoms") {
      return (log.pain ?? []).some((painEntry) => (painEntry.pcosSymptoms?.length ?? 0) > 0);
    }

    return false;
  };

const allLoggedDays = useMemo(() => Object.keys(dayLogs).sort(), [dayLogs]);

const analysisDays = useMemo(() => {
    const start = addDays(todayKey(), -(analysisRange - 1));
    return allLoggedDays.filter((day) => day >= start && day <= todayKey());
  }, [allLoggedDays, analysisRange]);

const daysWithTrigger = analysisDays.filter((day) => hasTrigger(day, dayLogs[day], selectedTrigger));

const daysWithoutTrigger = analysisDays.filter((day) => !hasTrigger(day, dayLogs[day], selectedTrigger));

const percentWithTrigger =
    daysWithTrigger.length > 0
      ? (daysWithTrigger.filter((day) => hasOutcome(dayLogs[day], selectedOutcome)).length / daysWithTrigger.length) *
        100
      : null;

const percentWithoutTrigger =
    daysWithoutTrigger.length > 0
      ? (daysWithoutTrigger.filter((day) => hasOutcome(dayLogs[day], selectedOutcome)).length /
          daysWithoutTrigger.length) *
        100
      : null;

const selectedTriggerLabel = triggerOptions.find((option) => option.id === selectedTrigger)?.label ?? selectedTrigger;

const selectedOutcomeLabel = outcomeOptions.find((option) => option.id === selectedOutcome)?.label ?? selectedOutcome;

const triggerDifference =
    percentWithTrigger != null && percentWithoutTrigger != null ? percentWithTrigger - percentWithoutTrigger : null;

const triggerConfidence: ConfidenceLevel =
    daysWithTrigger.length >= 15 && daysWithoutTrigger.length >= 15
      ? "High"
      : daysWithTrigger.length >= 5 && daysWithoutTrigger.length >= 5
        ? "Medium"
        : "Low";

const strongestAssociations = (() => {
    const results: Array<{
      trigger: string;
      outcome: string;
      difference: number;
      withCount: number;
      withoutCount: number;
    }> = [];

    triggerOptions.forEach((trigger) => {
      const withDays = analysisDays.filter((day) => hasTrigger(day, dayLogs[day], trigger.id));
      const withoutDays = analysisDays.filter((day) => !hasTrigger(day, dayLogs[day], trigger.id));
      if (withDays.length < 3 || withoutDays.length < 3) return;

      outcomeOptions.forEach((outcome) => {
        // Do not rank an event against itself (for example Panic → Panic or
        // Poor sleep → Poor sleep). Those are tautologies, not correlations.
        if (trigger.id === outcome.id) return;

        const equivalentPairs = new Set([
          "panic:panic",
          "tetany:tetany",
          "headache:headache",
          "hotFlash:hotFlash",
          "poorSleep:poorSleep",
          "histamineFlare:histamineFlare",
        ]);
        if (equivalentPairs.has(`${trigger.id}:${outcome.id}`)) return;

        const withRate =
          (withDays.filter((day) => hasOutcome(dayLogs[day], outcome.id)).length / withDays.length) * 100;
        const withoutRate =
          (withoutDays.filter((day) => hasOutcome(dayLogs[day], outcome.id)).length / withoutDays.length) * 100;
        const difference = withRate - withoutRate;
        if (Math.abs(difference) < 10) return;
        results.push({
          trigger: trigger.label,
          outcome: outcome.label,
          difference,
          withCount: withDays.length,
          withoutCount: withoutDays.length,
        });
      });
    });

    return results.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 3);
  })();

const saveTriggerCombination = () => {
    const alreadySaved = (view.settings.savedTriggers ?? []).some(
      (saved) => saved.a === selectedTrigger && saved.b === selectedOutcome,
    );

    if (alreadySaved) return;

    update((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        savedTriggers: [
          ...(draft.settings.savedTriggers ?? []),
          {
            id: `${Date.now()}`,
            a: selectedTrigger,
            b: selectedOutcome,
          },
        ],
      },
    }));
  };

const removeTriggerCombination = (id: string) => {
    update((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        savedTriggers: (draft.settings.savedTriggers ?? []).filter((saved) => saved.id !== id),
      },
    }));
  };

return { t, language, data, update, hydrated, view, dayLogs, cycleTrackingHidden, activeTab, setActiveTab, analysisRange, setAnalysisRange, cycles, phaseBuckets, painPhaseBars, moodPhaseBars, energyPhaseBars, hotFlashPhaseBars, pressurePhaseBars, bowelPhaseBars, adminCycleMetrics, commonFlow, highestPainPhase, bestEnergyPhase, worstMoodPhase, mostHotFlashPhase, currentMonthPrefix, previousMonthPrefix, currentMonthLabel, previousMonthLabel, monthlyComparisonLabel, currentMonthDays, elapsedDayCount, previousMonthDays, countAndAverage, panicCurrent, panicPrevious, tetanyCurrent, tetanyPrevious, hotFlashCurrent, hotFlashPrevious, headacheCurrent, headachePrevious, pressureCurrent, pressurePrevious, sleepAverage, weightAverage, adminMonthlyMetrics, medicationAdherence, workoutStats, workoutCurrent, workoutPrevious, pcosFrequency, histamineFrequency, sleepCurrent, sleepPrevious, weightCurrent, weightPrevious, medicationCurrent, medicationPrevious, pcosCurrent, pcosPrevious, histamineCurrent, histaminePrevious, monthlyLoggedDays, monthlyConfidence, monthlyChanges, mostImproved, mostWorsened, mostStable, formatChange, legacyTreatmentMigrationChecked, activeTreatment, archivedTreatments, treatmentDate, treatmentName, treatmentKind, treatmentResult, treatmentNotes, customTreatment, patchActiveTreatment, setTreatmentDate, setTreatmentName, setTreatmentKind, setTreatmentResult, setTreatmentNotes, setCustomTreatment, clearActiveTreatment, archiveTreatmentComparison, deleteTreatmentComparison, restoreArchivedTreatment, deleteArchivedTreatment, treatmentWindow, treatmentBeforeDays, treatmentAfterDays, treatmentBeforeLoggedDays, treatmentAfterLoggedDays, treatmentMetric, treatmentEventRate, treatmentPain, treatmentTetany, treatmentPanic, treatmentTetanyEpisodes, treatmentPanicEpisodes, treatmentHeadache, treatmentHeadacheIntensity, adminTreatmentMetrics, treatmentHotFlash, treatmentHotFlashEpisodes, treatmentResultOptions, selectedTreatmentResult, treatmentChanges, treatmentImprovedCount, treatmentWorsenedCount, treatmentUnchangedCount, strongestTreatmentChange, treatmentOverall, treatmentLoggedDays, treatmentConfidence, treatmentChangeLabel, formattedTreatmentDate, treatmentKindLabel, customCorrelationOptions, customCorrelationOptionKey, triggerOptions, outcomeOptions, selectedTrigger, setSelectedTrigger, selectedOutcome, setSelectedOutcome, hasScheduledMedicationMissed, hasAdminToggle, hasAdminChoice, hasAdminThreshold, hasTrigger, hasOutcome, allLoggedDays, analysisDays, daysWithTrigger, daysWithoutTrigger, percentWithTrigger, percentWithoutTrigger, selectedTriggerLabel, selectedOutcomeLabel, triggerDifference, triggerConfidence, strongestAssociations, saveTriggerCombination, removeTriggerCombination };
}

export type PatternsContentModel = ReturnType<typeof usePatternsContentModel>;
