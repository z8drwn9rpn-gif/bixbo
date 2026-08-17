import { useEffect, useState } from "react";

import { X } from "@/components/icons/BixboExtraIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/hooks/useI18n";
import { asArr, updateDayLog, type BixboData } from "@/lib/storage";

type UpdateFn = (updater: (data: BixboData) => BixboData) => void;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  data: BixboData;
  update: UpdateFn;
};

const SLEEP_OPTIONS = [
  "Awful", "Terrible", "Restless", "Poor", "Ok", "Broken sleep", "Woke up a lot",
  "Good", "Refreshed", "Great", "Perfect", "Slept in", "Too short", "Too long",
  "Groggy", "Foggy head", "Nightmares", "Vivid dreams", "Sweaty night", "Cold night",
  "Woke with headache", "Cramps at night", "Up to the toilet", "Fell asleep late",
  "Woke up early", "Hard to get up", "Deep & calm", "Best sleep ever",
] as const;

export function PastDaySleepSheet({ open, onOpenChange, date, data, update }: Props) {
  const { t, language } = useI18n();
  const current = data.dayLogs[date] ?? {};
  const [hours, setHours] = useState(current.sleepHours != null ? String(current.sleepHours).replace(".", ",") : "");
  const [quality, setQuality] = useState<string[]>(asArr(current.sleepQuality));

  useEffect(() => {
    const day = data.dayLogs[date] ?? {};
    setHours(day.sleepHours != null ? String(day.sleepHours).replace(".", ",") : "");
    setQuality(asArr(day.sleepQuality));
  }, [date, data.dayLogs]);

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const save = () => {
    const parsed = Number(hours.replace(",", "."));
    if (!hours.trim() || !Number.isFinite(parsed) || parsed < 0 || parsed > 24) return;
    updateDayLog(update, date, (log) => ({
      ...log,
      sleepHours: parsed,
      sleepQuality: quality.length ? quality : undefined,
    }));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="fixed inset-0 flex h-[100dvh] w-full max-w-none flex-col rounded-none border-0 bg-background p-0 pt-[env(safe-area-inset-top)]">
        <SheetHeader className="flex h-16 shrink-0 flex-row items-center justify-between border-b border-border px-5">
          <div className="min-w-0">
            <SheetTitle className="text-left font-serif text-lg">{t("Sleep")}</SheetTitle>
            <p className="truncate text-xs font-semibold text-primary">{dateLabel}</p>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label={t("Close")} className="grid h-10 w-10 place-items-center rounded-full bg-tint">
            <X className="h-5 w-5" />
          </button>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto w-full max-w-xl space-y-5">
            <section className="rounded-3xl bg-tint/55 p-4 ring-1 ring-border/60">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("Logging for")}</p>
              <p className="mt-1 text-base font-extrabold text-foreground">{dateLabel}</p>
            </section>

            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">{t("Sleep (hours)")}</label>
              <Input
                inputMode="decimal"
                value={hours}
                onChange={(event) => setHours(event.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="8"
                className="h-12 rounded-2xl text-base"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-foreground">{t("How I slept")}</p>
              <div className="flex flex-wrap gap-2">
                {SLEEP_OPTIONS.map((option) => {
                  const selected = quality.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setQuality((items) => selected ? items.filter((item) => item !== option) : [...items, option])}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${selected ? "bg-primary text-primary-foreground ring-primary" : "bg-tint text-foreground ring-border"}`}
                    >
                      {t(option)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <Button type="button" onClick={save} className="h-12 w-full rounded-2xl text-sm font-bold">
            {t("Save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
