import { useEffect, useMemo, useState } from "react";

import { Ico, X } from "@/components/icons/BixboExtraIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/hooks/useI18n";
import { nowHHMM, updateDayLog, type BixboData } from "@/lib/storage";

type UpdateFn = (updater: (data: BixboData) => BixboData) => void;
type DayLogs = BixboData["dayLogs"];
type DayLog = DayLogs[string];
type SleepEntry = { id: string; time: string; hours: number; quality?: string[] };

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

function valueFor(metric: QuickVitalMetric, dayLogs: DayLogs, date: string): string {
  if (metric === "sleep") return "";
  const day = dayLogs[date];
  const raw = metric === "temperature" ? day?.temperature : day?.weight;
  return raw == null ? "" : String(raw).replace(".", ",");
}

export function QuickVitalSheet({ open, onOpenChange, metric, date, data, update }: Props) {
  const { t, language } = useI18n();
  const meta = META[metric];
  const [targetDate, setTargetDate] = useState(date);
  const [value, setValue] = useState(() => valueFor(metric, data.dayLogs, date));
  const [keyboardInset, setKeyboardInset] = useState(0);
  const sourceDateValue = valueFor(metric, data.dayLogs, date);
  const targetDateValue = valueFor(metric, data.dayLogs, targetDate);

  useEffect(() => {
    if (!open) return;
    setTargetDate(date);
    setValue(sourceDateValue);
  }, [date, metric, open, sourceDateValue]);

  useEffect(() => {
    if (!open) return;
    setValue(targetDateValue);
  }, [metric, open, targetDate, targetDateValue]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.visualViewport) {
      setKeyboardInset(0);
      return;
    }

    const viewport = window.visualViewport;
    const syncKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset > 80 ? Math.round(inset) : 0);
    };

    syncKeyboardInset();
    viewport.addEventListener("resize", syncKeyboardInset);
    viewport.addEventListener("scroll", syncKeyboardInset);
    return () => {
      viewport.removeEventListener("resize", syncKeyboardInset);
      viewport.removeEventListener("scroll", syncKeyboardInset);
      setKeyboardInset(0);
    };
  }, [open]);

  const dateLabel = useMemo(
    () => new Date(`${targetDate}T12:00:00`).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short", year: "numeric" }),
    [language, targetDate],
  );

  const save = () => {
    const parsed = Number(value.replace(",", "."));
    if (!value.trim() || !Number.isFinite(parsed)) return;
    if (metric === "sleep" && (parsed <= 0 || parsed > 24)) return;
    if (metric === "temperature" && (parsed < 25 || parsed > 45)) return;
    if (metric === "weight" && (parsed <= 0 || parsed > 500)) return;

    updateDayLog(update, targetDate, (log) => {
      if (metric === "sleep") {
        const logWithSleep = log as DayLog & { sleepEntries?: SleepEntry[] };
        const existing: SleepEntry[] = logWithSleep.sleepEntries?.length
          ? logWithSleep.sleepEntries
          : log.sleepHours != null
            ? [{ id: `legacy-sleep-${targetDate}`, time: "", hours: log.sleepHours, quality: Array.isArray(log.sleepQuality) ? log.sleepQuality : log.sleepQuality ? [log.sleepQuality] : undefined }]
            : [];
        const next = [...existing, { id: crypto.randomUUID(), time: nowHHMM(), hours: parsed }];
        const total = next.reduce((sum, entry) => sum + entry.hours, 0);
        return {
          ...log,
          sleepEntries: next,
          sleepHours: Number(total.toFixed(2)),
        } as DayLog & { sleepEntries?: SleepEntry[] };
      }
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
        style={{ bottom: keyboardInset ? `${keyboardInset}px` : undefined }}
        className="left-1/2 right-auto w-[calc(100%-24px)] max-w-md -translate-x-1/2 overflow-x-hidden rounded-t-[28px] border border-border/70 bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 shadow-2xl transition-[bottom] duration-150 [&>button.absolute]:hidden"
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

        <div className="mt-3 min-w-0 space-y-3">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("Date")}</span>
            <Input
              type="date"
              value={targetDate}
              onChange={(event) => event.target.value && setTargetDate(event.target.value)}
              className="box-border h-10 w-full min-w-0 max-w-full rounded-2xl bg-surface px-3 text-sm font-semibold"
            />
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t(meta.label)}</span>
            <div className="relative min-w-0">
              <Input
                inputMode="decimal"
                enterKeyHint="done"
                value={value}
                onChange={(event) => setValue(event.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder={meta.placeholder}
                className="box-border h-11 w-full min-w-0 max-w-full rounded-2xl bg-surface pr-12 text-base font-semibold"
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
