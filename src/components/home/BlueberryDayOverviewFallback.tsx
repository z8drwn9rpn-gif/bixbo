import { DayOverviewCard as Card } from "@/components/home/DayOverviewPrimitives";
import { useI18n } from "@/hooks/useI18n";
import {
  PAIN_DESCRIPTIONS,
  isCycleTrackingHidden,
  painColor,
  type BixboData,
} from "@/lib/storage";

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

  // DayPreview already renders Blueberry when ordinary cycle tracking is visible.
  // This fallback keeps the saved Blueberry log visible for HAK/other modes where
  // cycle predictions are intentionally hidden, without re-enabling the calendar.
  if (!isCycleTrackingHidden(data) || !hasBlueberryEntry(data, date)) return null;

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
  );
}
