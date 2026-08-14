import { SemanticIcoText } from "@/components/icons/BixboFoodIcons";
import { useI18n } from "@/hooks/useI18n";
import { asArr, type BixboData, type SexEntry } from "@/lib/storage";
import { DayOverviewCard, DayOverviewDeleteButton } from "./DayOverviewPrimitives";

type DisplaySexEntry = SexEntry & {
  painWhenUi?: "during" | "after" | "both";
  painScale?: number;
  painLocations?: string[];
};

export function DayOverviewSexCard({
  entries,
  date,
  update,
  onEdit,
}: {
  entries: SexEntry[];
  date: string;
  update: (updater: (data: BixboData) => BixboData) => void;
  onEdit?: (cat: string, entry: unknown) => void;
}) {
  const { t } = useI18n();
  if (!entries.length) return null;

  return (
    <DayOverviewCard title="ŠukŠuk!" icon="❤️" compact>
      <ul className="space-y-1">
        {entries.map((entry, index) => {
          const sx = entry as DisplaySexEntry;
          const hasPain = Boolean(sx.painful && sx.painful !== "no");
          return (
            <li key={sx.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-1.5" : ""}`}>
              <button onClick={() => onEdit?.("sex", sx)} className="min-w-0 flex-1 text-left">
                <p className="text-xs text-muted-foreground">{sx.time}</p>
                <div className="my-1 border-t border-border/60" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Type")}:</span>{" "}
                  {t(String(sx.kind).replace(/_/g, " "))}
                </p>
                {sx.protection ? (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Protection")}:</span> {t(sx.protection)}
                  </p>
                ) : null}
                {asArr(sx.feelingAfter).length ? (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Feeling after")}:</span>{" "}
                    <SemanticIcoText text={asArr(sx.feelingAfter).join(", ")} size={13} />
                  </p>
                ) : null}
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("Pain")}:</span> {t(hasPain ? "Yes" : "No")}
                  {hasPain && sx.painWhenUi ? ` · ${t(sx.painWhenUi)}` : ""}
                  {hasPain && sx.painScale != null ? ` · ${sx.painScale}/10` : ""}
                </p>
                {hasPain && sx.painLocations?.length ? (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Where")}:</span> {sx.painLocations.map(t).join(", ")}
                  </p>
                ) : null}
                {sx.symptomsAfter?.length ? (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Symptoms after")}:</span> {sx.symptomsAfter.map(t).join(", ")}
                  </p>
                ) : null}
                {sx.orgasm ? (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Orgasm")}:</span> {t(sx.orgasm === "yes" ? "Yes" : "No")}
                  </p>
                ) : null}
                {sx.note ? (
                  <p className="mt-1 whitespace-pre-line text-xs leading-snug">
                    <span className="font-semibold">{t("Note")}:</span> {sx.note}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[10px] text-primary">{t("Tap to edit")}</p>
              </button>
              <DayOverviewDeleteButton
                onClick={() =>
                  update((data) => ({
                    ...data,
                    dayLogs: {
                      ...data.dayLogs,
                      [date]: {
                        ...data.dayLogs[date],
                        sex: (data.dayLogs[date]?.sex ?? []).filter((item) => item.id !== sx.id),
                      },
                    },
                  }))
                }
              />
            </li>
          );
        })}
      </ul>
    </DayOverviewCard>
  );
}
