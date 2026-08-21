import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";
import { DayOverviewCard as Card, DayOverviewDeleteButton as DeleteBtn } from "@/components/home/DayOverviewPrimitives";
import { useI18n } from "@/hooks/useI18n";
import { painColor, type BixboData, type DayLog } from "@/lib/storage";

type MentalWellbeingEntry = {
  id: string;
  time: string;
  distress: number;
  states: string[];
  factors: string[];
  note?: string;
};

type MentalDayLog = DayLog & { mentalWellbeing?: MentalWellbeingEntry[] };

const MENTAL_DISTRESS_LABELS = [
  "None",
  "Very mild",
  "Mild",
  "Uncomfortable",
  "Moderate",
  "Distressing",
  "Strong",
  "Severe",
  "Very severe",
  "Extreme",
  "Worst possible",
] as const;

export function MentalDistressDayOverviewCard({
  date,
  data,
  update,
  onEdit,
}: {
  date: string;
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onEdit?: (cat: string, entry: unknown) => void;
}) {
  const { t } = useI18n();
  const entries = ((data.dayLogs[date] as MentalDayLog | undefined)?.mentalWellbeing ?? [])
    .filter((entry) => Number.isFinite(entry.distress) && entry.distress >= 0 && entry.distress <= 10);

  if (!entries.length) return null;

  const editEntry = (entry: MentalWellbeingEntry) => onEdit?.("custom:mental-wellbeing", entry);

  const deleteEntry = (id: string) => {
    update((current) => {
      const day = current.dayLogs[date] as MentalDayLog | undefined;
      if (!day) return current;
      const remaining = (day.mentalWellbeing ?? []).filter((entry) => entry.id !== id);
      return {
        ...current,
        dayLogs: {
          ...current.dayLogs,
          [date]: {
            ...day,
            mentalWellbeing: remaining.length ? remaining : undefined,
          } as MentalDayLog,
        },
      };
    });
  };

  return (
    <Card title="Mental distress" icon="🧠">
      <ul className="space-y-2">
        {entries.map((entry, index) => {
          const rounded = Math.max(0, Math.min(10, Math.round(entry.distress)));
          const label = MENTAL_DISTRESS_LABELS[rounded] ?? "Mental distress";
          return (
            <li key={entry.id} className={`flex flex-wrap items-start gap-3 ${index ? "border-t border-border/60 pt-3" : ""}`}>
              <button
                type="button"
                onClick={() => editEntry(entry)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: painColor(entry.distress) }}
                aria-label={`${t("Edit")} ${t("Mental distress")}`}
              >
                {Number.isInteger(entry.distress) ? entry.distress : entry.distress.toFixed(1)}
              </button>
              <button type="button" onClick={() => editEntry(entry)} className="min-w-0 flex-1 text-left">
                <p className="text-xs text-muted-foreground">
                  {entry.time} · {t(label)}
                </p>
                <div className="my-2 border-t border-border/60" />
                {entry.states?.length ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Mental states")}:</span>{" "}
                    <SemanticIcoText text={entry.states.map(t).join(", ")} size={13} />
                  </p>
                ) : null}
                {entry.factors?.length ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Factors")}:</span>{" "}
                    <SemanticIcoText text={entry.factors.map(t).join(", ")} size={13} />
                  </p>
                ) : null}
                {entry.note ? (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Note")}:</span> {entry.note}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
              </button>
              <DeleteBtn onClick={() => deleteEntry(entry.id)} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
