import { useEffect, useState } from "react";
import { ChevronLeft, Check, Ico, X } from "@/components/icons/BixboExtraIcons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogSchemaContext } from "@/features/logging/LogSchemaContext";
import { PanicForm, TetanyForm } from "@/features/logging/EpisodeForms";
import type { UpdateFn } from "@/features/logging/LogFormPrimitives";
import { useI18n } from "@/hooks/useI18n";
import {
  updateDayLog,
  type BixboData,
  type PanicAttack,
  type TetanyEpisode,
} from "@/lib/storage";

export type EpisodeEditTarget =
  | { kind: "tetany"; entry: TetanyEpisode }
  | { kind: "panic"; entry: PanicAttack };

export function EpisodePainEditSheet({
  open,
  onOpenChange,
  date,
  data,
  update,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  data: BixboData;
  update: UpdateFn;
  target: EpisodeEditTarget | null;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<TetanyEpisode | PanicAttack | null>(target?.entry ?? null);

  useEffect(() => {
    setDraft(target?.entry ?? null);
  }, [target]);

  const close = () => onOpenChange(false);

  const save = () => {
    if (!target || !draft) return;

    updateDayLog(update, date, (log) => {
      if (target.kind === "tetany") {
        const next = draft as TetanyEpisode;
        return {
          ...log,
          tetany: (log.tetany ?? []).map((entry) => (entry.id === target.entry.id ? next : entry)),
        };
      }

      const next = draft as PanicAttack;
      return {
        ...log,
        panic: (log.panic ?? []).map((entry) => (entry.id === target.entry.id ? next : entry)),
      };
    });

    close();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100svh] !max-h-[100svh] !w-full !max-w-none min-h-0 flex-col !gap-0 overflow-hidden !rounded-none !border-0 bg-background p-0 pt-[env(safe-area-inset-top)] !shadow-none !transition-none !animate-none [&>button.absolute]:hidden"
      >
        <SheetHeader className="mb-0 min-h-14 shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-3 pb-1 pt-0 sm:px-5">
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-[76px] items-center gap-1 rounded-xl px-2 text-sm text-muted-foreground transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            {t("Overview")}
          </button>
          <SheetTitle className="pb-3 font-serif text-lg">{t("Pain")}</SheetTitle>
          <button
            type="button"
            onClick={close}
            aria-label={t("Close")}
            className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </SheetHeader>

        {target ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="sticky top-0 z-30 flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-border/45 bg-background/96 px-5 py-1 backdrop-blur">
              <span className="min-w-[68px]" aria-hidden="true" />
              <div className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 text-xs font-semibold text-foreground/80">
                <Ico e={target.kind === "tetany" ? "⭐" : "✨"} size={14} />
                <span>{t(target.kind === "tetany" ? "Tetany" : "Panic attack")}</span>
              </div>
              <button
                type="button"
                onClick={save}
                className="inline-flex min-h-11 min-w-[68px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xs font-semibold leading-none">{t("Save")}</span>
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
              <div className="mx-auto w-full max-w-xl rounded-2xl border border-border p-3">
                <LogSchemaContext.Provider value={null}>
                  {target.kind === "tetany" ? (
                    <TetanyForm
                      key={`tetany:${target.entry.id}`}
                      date={date}
                      data={data}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  ) : (
                    <PanicForm
                      key={`panic:${target.entry.id}`}
                      date={date}
                      data={data}
                      update={update}
                      onDone={close}
                      initialEntry={target.entry}
                      embedded
                      onDraftChange={setDraft}
                    />
                  )}
                </LogSchemaContext.Provider>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
