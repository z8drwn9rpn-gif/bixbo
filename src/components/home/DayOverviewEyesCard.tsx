import { useState } from "react";
import { ChevronLeft, X } from "@/components/icons/BixboExtraIcons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/hooks/useI18n";
import { updateDayLog, type BixboData, type DayLog } from "@/lib/storage";
import { EyesForm, type EyesEpisode, type EyesPainIntensity } from "@/features/logging/EyesForm";
import {
  DayOverviewCard as Card,
  DayOverviewDeleteButton as DeleteBtn,
} from "@/components/home/DayOverviewPrimitives";

type DayLogWithEyes = DayLog & { eyes?: EyesEpisode[] };

function affectedEyeLabel(affected: EyesEpisode["affected"]): string {
  if (affected === "left") return "Left eye";
  if (affected === "right") return "Right eye";
  return "Both eyes";
}

function painIntensityLabel(intensity: EyesPainIntensity | undefined): string {
  if (intensity === "severe") return "Severe pain";
  if (intensity === "something") return "Feeling something there";
  return "No pain";
}

export function DayOverviewEyesCard({
  entries,
  date,
  update,
}: {
  entries: EyesEpisode[];
  date: string;
  update: (updater: (data: BixboData) => BixboData) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<EyesEpisode | null>(null);
  if (!entries.length && !editing) return null;

  return (
    <>
      {entries.length ? (
        <Card title="Eyes" icon="👁️">
          <ul className="space-y-3">
            {entries.map((entry, index) => (
              <li key={entry.id} className={`flex items-start gap-2 ${index ? "border-t border-border/60 pt-3" : ""}`}>
                <button type="button" onClick={() => setEditing(entry)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {entry.time} · {t(affectedEyeLabel(entry.affected))}
                  </p>
                  <div className="my-2 border-t border-border/60" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">{t("Pain intensity")}:</span>{" "}
                    {t(painIntensityLabel(entry.painIntensity))}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
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
                    updateDayLog(update, date, (log) => {
                      const current = log as DayLogWithEyes;
                      return {
                        ...log,
                        eyes: (current.eyes ?? []).filter((saved) => saved.id !== entry.id),
                      };
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Sheet open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <SheetContent
          side="bottom"
          className="fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100svh] !max-h-[100svh] !w-full !max-w-none min-h-0 flex-col !gap-0 overflow-hidden !rounded-none !border-0 bg-background p-0 pt-[env(safe-area-inset-top)] !shadow-none !transition-none !animate-none [&>button.absolute]:hidden"
        >
          <SheetHeader className="mb-0 min-h-14 shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-3 pb-1 pt-0 sm:px-5">
            <button type="button" onClick={() => setEditing(null)} className="inline-flex min-h-11 min-w-[76px] items-center gap-1 rounded-xl px-2 text-sm text-muted-foreground transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" /> {t("Overview")}
            </button>
            <SheetTitle className="pb-3 font-serif text-lg">{t("Pain")}</SheetTitle>
            <button type="button" onClick={() => setEditing(null)} aria-label={t("Close")} className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="h-5 w-5" />
            </button>
          </SheetHeader>
          {editing ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
              <div className="mx-auto w-full max-w-xl rounded-2xl border border-border p-3">
                <p className="mb-3 text-center text-xs font-semibold text-foreground/80">{t("Eyes")}</p>
                <EyesForm
                  key={editing.id}
                  date={date}
                  update={update}
                  onDone={() => setEditing(null)}
                  initialEntry={editing}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
