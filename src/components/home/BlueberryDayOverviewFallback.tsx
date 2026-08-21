import { DayOverviewCard as Card } from "@/components/home/DayOverviewPrimitives";
import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";
import { useI18n } from "@/hooks/useI18n";
import {
  PAIN_DESCRIPTIONS,
  isCycleTrackingHidden,
  painColor,
  type BixboData,
} from "@/lib/storage";

type MentalWellbeingOverviewEntry = {
  id: string;
  time: string;
  distress: number;
  states?: string[];
  factors?: string[];
  note?: string;
};

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

function hasBlueberryEntry(data: BixboData, date: string) {
  const log = data.dayLogs[date];
  const info = log?.periodInfo;
  return Boolean(
    log?.period ||
      info?.level ||
      info?.discharge ||
      info?.dischargeNote ||
      info?.symptoms?.length ||
      info?.clots ||
      info?.cramps != null ||
      info?.note,
  );
}

export function BlueberryDayOverviewFallback({
  date,
  data,
  onEdit,
}: {
  date: string;
  data: BixboData;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const log = data.dayLogs[date];
  const info = log?.periodInfo;
  const mentalEntries = (((log as typeof log & { mentalWellbeing?: MentalWellbeingOverviewEntry[] })?.mentalWellbeing) ?? [])
    .filter((entry) => Number.isFinite(entry.distress) && entry.distress >= 0 && entry.distress <= 10);
  const showBlueberryFallback = isCycleTrackingHidden(data) && hasBlueberryEntry(data, date);

  if (!showBlueberryFallback && !mentalEntries.length) return null;

  const flowLabel = (level?: string | null) => {
    switch (level) {
      case "spotting": return t("Spotting");
      case "light": return t("Light");
      case "medium": return t("Medium");
      case "heavy": return t("Heavy");
      case "very-heavy": return t("Very heavy");
      default: return "";
    }
  };

  return (
    <>
      {mentalEntries.length ? (
        <div className="px-5 pt-3 lg:px-0" data-bixbo-mental-day-overview="true">
          <Card title="Mental distress" icon="🧠">
            <ul className="space-y-3">
              {mentalEntries.map((entry, index) => {
                const rounded = Math.max(0, Math.min(10, Math.round(entry.distress)));
                const label = MENTAL_DISTRESS_LABELS[rounded] ?? "Mental distress";
                return (
                  <li key={entry.id} className={`${index ? "border-t border-border/60 pt-3" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                        style={{ background: painColor(entry.distress) }}
                        aria-label={`${entry.distress} of 10`}
                      >
                        {Number.isInteger(entry.distress) ? entry.distress : entry.distress.toFixed(1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          {entry.time} · {Number.isInteger(entry.distress) ? entry.distress : entry.distress.toFixed(1)}/10 · {t(label)}
                        </p>
                        {entry.states?.length ? (
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
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
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <style>{`[data-bixbo-mental-day-overview="true"] + .mx-5.mt-4.rounded-3xl { display: none; }`}</style>
        </div>
      ) : null}

      {showBlueberryFallback ? (
        <Card title="Blueberry" icon="🫐">
          <button type="button" onClick={onEdit} className="w-full text-left">
            <div className="my-2 border-t border-border/60" />
            {(info?.level || log?.period) ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Flow")}:</span>{" "}
                {flowLabel(info?.level ?? log?.period)}
              </p>
            ) : null}
            {info?.cramps != null ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Cramp pain")}:</span>{" "}
                <span style={{ color: painColor(info.cramps) }}>
                  {Number.isInteger(info.cramps) ? info.cramps : info.cramps.toFixed(1)}/10
                  {" — "}{t(PAIN_DESCRIPTIONS[Math.round(info.cramps)])}
                </span>
              </p>
            ) : null}
            {info?.discharge ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Discharge")}:</span>{" "}
                {t(info.discharge)}
                {info.dischargeNote ? ` — ${info.dischargeNote}` : ""}
              </p>
            ) : info?.dischargeNote ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Discharge")}:</span>{" "}{info.dischargeNote}
              </p>
            ) : null}
            {info?.symptoms?.length ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Period symptoms")}:</span>{" "}
                {info.symptoms.map(t).join(", ")}
              </p>
            ) : null}
            {info?.clots ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("Clots")}:</span>{" "}
                {t(info.clots === "none" ? "None" : info.clots === "small" ? "Small" : info.clots === "medium" ? "Medium" : "Large")}
              </p>
            ) : null}
            {info?.note ? (
              <p className="mt-2 whitespace-pre-line text-sm">
                <span className="font-semibold">{t("Note")}:</span> {info.note}
              </p>
            ) : null}
            <p className="mt-1 text-[10px] text-primary">{t("Tap to edit")}</p>
          </button>
        </Card>
      ) : null}
    </>
  );
}
