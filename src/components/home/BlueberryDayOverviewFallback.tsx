import { createPortal } from "react-dom";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DayOverviewCard as Card } from "@/components/home/DayOverviewPrimitives";
import { CustomLogForm } from "@/components/CustomLogForm";
import { X } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { customLogDefinitions } from "@/lib/appRegistry";
import {
  PAIN_DESCRIPTIONS,
  isCycleTrackingHidden,
  painColor,
  useBixbo,
  type BixboData,
  type CustomLogEntry,
} from "@/lib/storage";
import { MentalDistressDayOverviewCard } from "./MentalDistressDayOverviewCard";

type MentalOverviewEntry = {
  id: string;
  time: string;
  distress: number;
  states: string[];
  factors: string[];
  note?: string;
};

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
  const { update } = useBixbo();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [mentalHost, setMentalHost] = useState<HTMLElement | null>(null);
  const [editingMental, setEditingMental] = useState<MentalOverviewEntry | null>(null);
  const log = data.dayLogs[date];
  const info = log?.periodInfo;
  const showBlueberryFallback = isCycleTrackingHidden(data) && hasBlueberryEntry(data, date);
  const mentalEntries = (((log as typeof log & { mentalWellbeing?: MentalOverviewEntry[] })?.mentalWellbeing) ?? []);
  const mentalDefinition = useMemo(
    () => customLogDefinitions(data).find((definition) => definition.id === "mental-wellbeing"),
    [data],
  );

  useLayoutEffect(() => {
    setMentalHost(null);
    if (!mentalEntries.length || typeof document === "undefined") return;

    const parent = markerRef.current?.parentElement;
    if (!parent) return;

    const host = document.createElement("div");
    host.dataset.bixboMentalOverviewHost = "true";
    const painCard = parent.querySelector<HTMLElement>('[data-bixbo-day-overview-card="pain"]');
    const previewRoot = parent.querySelector<HTMLElement>(":scope > .space-y-3");
    const emptyState = parent.querySelector<HTMLElement>(":scope > .mx-5.mt-4.rounded-3xl");
    const oldEmptyDisplay = emptyState?.style.display ?? "";

    if (painCard) painCard.insertAdjacentElement("afterend", host);
    else if (previewRoot) previewRoot.prepend(host);
    else if (emptyState) {
      emptyState.style.display = "none";
      emptyState.insertAdjacentElement("beforebegin", host);
    } else parent.append(host);

    setMentalHost(host);
    return () => {
      if (emptyState) emptyState.style.display = oldEmptyDisplay;
      host.remove();
    };
  }, [date, mentalEntries.length, log?.pain?.length]);

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

  const editOverlay = editingMental && mentalDefinition && typeof document !== "undefined"
    ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/25 px-2 pt-8 backdrop-blur-[1px] sm:items-center"
          onClick={() => setEditingMental(null)}
        >
          <div
            className="relative max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-background shadow-2xl ring-1 ring-border sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-30 flex h-11 items-center justify-end rounded-t-[2rem] bg-background px-3 pt-1 sm:rounded-t-[2rem]">
              <button
                type="button"
                onClick={() => setEditingMental(null)}
                aria-label={t("Close")}
                className="grid h-8 w-8 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CustomLogForm
              key={editingMental.id}
              definition={mentalDefinition}
              date={date}
              data={data}
              update={update}
              onDone={() => setEditingMental(null)}
              initialEntry={editingMental as unknown as CustomLogEntry}
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <span ref={markerRef} className="hidden" aria-hidden="true" />
      {mentalHost ? createPortal(
        <MentalDistressDayOverviewCard
          date={date}
          data={data}
          update={update}
          onEdit={(_, entry) => setEditingMental(entry as MentalOverviewEntry)}
        />,
        mentalHost,
      ) : null}
      {editOverlay}

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
