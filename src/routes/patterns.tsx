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
import { PatternsContent } from "@/features/patterns/PatternsContent";
export { PatternsContent };

export const Route = createFileRoute("/patterns")({
  head: () => ({
    meta: [
      {
        title: "Health of Bixbo — Bixbo Patterns",
      },
      {
        name: "description",
        content: "Compare cycle phases, monthly health changes, treatments and possible symptom triggers.",
      },
      {
        property: "og:title",
        content: "Health of Bixbo — Bixbo Patterns",
      },
      {
        property: "og:description",
        content: "Cycle, monthly, treatment and trigger comparisons.",
      },
    ],
  }),
  component: PatternsPage,
});

function PatternsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("Health of Bixbo")}>
      <div className="px-5 pt-2 lg:px-0">
        <div className="grid grid-cols-2 rounded-2xl bg-tint p-1 ring-1 ring-border/70 lg:mx-auto lg:w-full lg:max-w-[420px]">
          <Link
            to="/insights"
            className="rounded-xl px-4 py-2 text-center text-sm font-semibold text-muted-foreground transition hover:bg-surface/70 hover:text-foreground"
          >
            Insights
          </Link>
          <span className="rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-sm">
            Patterns
          </span>
        </div>
      </div>
      <PatternsContent />
    </AppShell>
  );
}
