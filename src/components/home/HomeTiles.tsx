import { Ico, PillIcon } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { summarizeMedicationProgress } from "@/lib/domain/meds";
import { todayKey, type BixboData } from "@/lib/storage";

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
  const progress = summarizeMedicationProgress(
    data.meds,
    [todayKey()],
    data.medLog,
    data.medLogItems ?? {},
    new Date(),
    true,
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
          {progress.taken}/{progress.expected}
        </p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
        <PillIcon size={20} />
      </div>
    </button>
  );
}

