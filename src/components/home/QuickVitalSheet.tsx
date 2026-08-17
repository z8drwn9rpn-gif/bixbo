import { useEffect, useMemo, useState } from "react";

import { Ico, X } from "@/components/icons/BixboExtraIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/hooks/useI18n";
import { nowHHMM, updateDayLog, type BixboData } from "@/lib/storage";

type UpdateFn = (updater: (data: BixboData) => BixboData) => void;

export type QuickVitalMetric = "sleep" | "temperature" | "weight";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: QuickVitalMetric;
  date: string;
  data: BixboData;
  update: UpdateFn;
};

const META: Record<QuickVitalMetric, { title: string; icon: string; label: string; unit: string; placeholder: string }> = {
  sleep: { title: "Sleep", icon: "😴", label: "Sleep (hours)", unit: "h", placeholder: "8" },
  temperature: { title: "Temp", icon: "🌡️", label: "Temperature", unit: "°C", placeholder: "36,6" },
  weight: { title: "Weight", icon: "⚖️", label: "Weight", unit: "kg", placeholder: "68" },
};

function valueFor(metric: QuickVitalMetric, data: BixboData, date: string): string {
  const day = data.dayLogs[date];
  const raw = metric === "sleep" ? day?.sleepHours : metric === "temperature" ? day?.temperature : day?.weight;
  return raw == null ? "" : String(raw).replace(".", ",");
}

export function QuickVitalSheet({ open, onOpenChange, metric, date, data, update }: Props) {
  const { t, language } = useI18n();
  const meta = META[metric];
  const [targetDate, setTargetDate] = useState(date);
  const [value, setValue] = useState(() => valueFor(metric, data, date));

  useEffect(() => {
    if (!open) return;
    setTargetDate(date);
    setValue(valueFor(metric, data, date));
  }, [data, date, metric, open]);

  useEffect(() => {
    if (!open) return;
    setValue(valueFor(metric, data, targetDate));
  }, [data, metric, open, targetDate]);

  const dateLabel = useMemo(
    () => new Date(`${targetDate}T12:00:00`).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short", year: "numeric" }),
    [language, targetDate],
  );

  const save = () => {
    const parsed = Number(value.replace(",", "."));
    if (!value.trim() || !Number.isFinite(parsed)) return;
    if (metric === "sleep" && (parsed < 0 || parsed > 24)) return;
    if (metric === "temperature" && (parsed < 25 || parsed > 45)) return;
    if (metric === "weight" && (parsed <= 0 || parsed > 500)) return;

    updateDayLog(update, targetDate, (log) => {
      if (metric === "sleep") return { ...log, sleepHours: parsed };
      if (metric === "temperature") {
        return {
          ...log,
          temperature: parsed,
          temperatureEntries: [...(log.temperatureEntries ?? []), { id: crypto.randomUUID(), time: nowHHMM(), value: parsed }],
        };
      }
      return {
        ...log,
        weight: parsed,
        weightEntries: [...(log.weightEntries ?? []), { id: crypto.randomUUID(), time: nowHHMM(), value: parsed }],
      };
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="left-1/2 right-auto w-[calc(100%-24px)] max-w-md -translate-x-1/2 rounded-t-[28px] border border-border/70 bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-2xl"
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="flex-row items-center justify-between space-y-0 px-1 py-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border/60"><Ico e={meta.icon} size={25} /></span>
            <div className="min-w-0 text-left">
              <SheetTitle className="font-serif text-lg leading-tight">{t(meta.title)}</SheetTitle>
              <p className="mt-0.5 text-[10px] font-semibold text-primary">{dateLabel}</p>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label={t("Close")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border/50">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Date")}</span>
            <Input type="date" value={targetDate} onChange={(event) => event.target.value && setTargetDate(event.target.value)} className="h-10 rounded-2xl bg-surface text-sm font-semibold" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t(meta.label)}</span>
            <div className="relative">
              <Input
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder={meta.placeholder}
                className="h-11 rounded-2xl bg-surface pr-12 text-base font-semibold"
                autoFocus
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{meta.unit}</span>
            </div>
          </label>

          <Button type="button" onClick={save} disabled={!value.trim()} className="h-11 w-full rounded-2xl text-sm font-bold shadow-sm">
            {t("Save")} ✓
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
