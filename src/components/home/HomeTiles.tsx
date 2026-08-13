import { Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboIcons";

import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";
import {
  BlueberryIcon,
  ClockIcon,
  FlameIcon,
  HeartIcon,
  Ico,
  IcoText,
  NoteIcon,
  PanicIcon,
  PillIcon,
  PoopIcon,
  StarIcon,
} from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { isScheduledDoseTaken } from "@/lib/medicationAdherence";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  avgDayPain,
  latestDayWeight,
  averageDayTemperature,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  isIntercourseKind,
  type BixboData,
  type BowelEntry,
  type SexEntry,
} from "@/lib/storage";


export function VitalTile({
  emoji,
  label,
  value,
  onClick,
}: {
  emoji: string;
  label: string;
  value: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface p-2 ring-1 ring-border hover:bg-tint"
    >
      <Ico e={emoji} size={16} />
      <span className="font-serif text-base font-bold leading-tight">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground">{t(label)}</span>
    </button>
  );
}

export function MedsProgress({ data, onClick }: { data: BixboData; onClick: () => void }) {
  const { t } = useI18n();
  const k = todayKey();
  const scheduled = data.meds.filter((m) => !m.asNeeded);
  const total = scheduled.reduce((s, m) => s + m.times.length, 0);
  const taken = scheduled.reduce(
    (s, m) => s + m.times.filter((t) => isScheduledDoseTaken(m, k, t, data.medLog, data.medLogItems ?? {})).length,
    0,
  );
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-surface p-3 text-left ring-1 ring-border transition hover:bg-tint active:scale-[0.99]"
      aria-label={t("Open meds log")}
    >
      <div>
        <p className="text-xs text-muted-foreground">{t("Meds today")}</p>
        <p className="font-serif text-lg font-bold">
          {taken}/{total || 0}
        </p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
        <PillIcon size={20} />
      </div>
    </button>
  );
}

