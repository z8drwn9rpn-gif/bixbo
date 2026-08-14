import { Ico, PillIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { avgDayPain } from "@/lib/domain/pain";
import { summarizeMedicationProgress } from "@/lib/domain/meds";
import { todayKey, type BixboData } from "@/lib/storage";

export function TodayHeaderSummary({ data, onOpen }: { data: BixboData; onOpen: () => void }) {
  const { t } = useI18n();
  const dateKey = todayKey();
  const todayPain = avgDayPain(data.dayLogs[dateKey]);
  const progress = summarizeMedicationProgress(
    data.meds,
    [dateKey],
    data.medLog,
    data.medLogItems ?? {},
    new Date(),
    true,
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-[82px] flex-col items-end justify-center rounded-2xl px-2 py-1 transition hover:bg-tint"
      aria-label={t("Open today's summary")}
    >
      <span className="text-[10px] font-semibold leading-none text-muted-foreground">{t("Today")}</span>
      <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-none text-foreground">
        <Ico name="flame" size={14} /> {todayPain != null ? todayPain.toFixed(1) : "—"}
        <span className="text-muted-foreground">·</span>
        <PillIcon size={14} /> {progress.taken}/{progress.expected}
      </span>
    </button>
  );
}
