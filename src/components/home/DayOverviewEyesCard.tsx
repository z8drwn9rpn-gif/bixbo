import { useI18n } from "@/hooks/useI18n";
import { updateDayLog, type BixboData, type EyesEpisode } from "@/lib/storage";
import {
  DayOverviewCard as Card,
  DayOverviewDeleteButton as DeleteBtn,
} from "@/components/home/DayOverviewPrimitives";

function affectedEyeLabel(affected: EyesEpisode["affected"]): string {
  if (affected === "left") return "Left eye";
  if (affected === "right") return "Right eye";
  return "Both eyes";
}

export function DayOverviewEyesCard({
  entries,
  date,
  update,
  onEdit,
}: {
  entries: EyesEpisode[];
  date: string;
  update: (updater: (data: BixboData) => BixboData) => void;
  onEdit?: (entry: EyesEpisode) => void;
}) {
  const { t } = useI18n();
  if (!entries.length) return null;

  return (
    <Card title="Eyes" icon="👁️">
      <ul className="space-y-3">
        {entries.map((entry, index) => (
          <li key={entry.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
            <button type="button" onClick={() => onEdit?.(entry)} className="min-w-0 flex-1 text-left">
              <p className="text-xs text-muted-foreground">
                {entry.time} · {t(affectedEyeLabel(entry.affected))}
              </p>
              <div className="my-2 border-t border-border/60" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Pain with eye movement")}:</span>{" "}
                {t(entry.painWithMovement ? "Yes" : "No")}
              </p>
              {entry.visionChanges.length ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Vision")}:</span>{" "}
                  {entry.visionChanges.map(t).join(", ")}
                </p>
              ) : null}
              {entry.note ? (
                <p className="mt-2 whitespace-pre-line text-sm">
                  <span className="font-semibold">{t("Note")}:</span> {entry.note}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
            </button>
            <DeleteBtn
              onClick={() =>
                updateDayLog(update, date, (log) => ({
                  ...log,
                  eyes: (log.eyes ?? []).filter((saved) => saved.id !== entry.id),
                }))
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
