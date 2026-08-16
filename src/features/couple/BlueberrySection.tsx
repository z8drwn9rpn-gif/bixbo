import { BlueberryIcon, WaterIcon } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS } from "@/components/ui/chart";
import { useI18n } from "@/hooks/useI18n";
import { nextPredictedPeriod, predictPeriods, todayKey, type PartnerData } from "@/lib/storage";
import { startOfMonth } from "./coupleUtils";

const PERIOD_COLORS: Record<string, string> = {
  spotting: "#F9C6D7",
  light: "#F19FBB",
  medium: CHART_COLORS.period,
  heavy: "#B33B6C",
  "very-heavy": "#7A1F45",
};

export function BlueberrySection({ partner, selectedMonth, selectedMonthLabel, isCurrentMonth }: { partner: PartnerData; selectedMonth: Date; selectedMonthLabel: string; isCurrentMonth: boolean }) {
  const { t } = useI18n();
  const cycle = partner.cycle;

  if (!cycle?.lastPeriodStart) {
    const anyPeriod = Object.values(partner.dayLogs).some((log) => log.period || log.periodInfo?.level);
    if (!anyPeriod) return null;
  }

  const monthStart = startOfMonth(selectedMonth);
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(rangeStart.getDate() - 14);
  const rangeEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  const predicted = cycle ? predictPeriods(cycle, rangeStart, rangeEnd) : [];
  const next = cycle && isCurrentMonth ? nextPredictedPeriod(cycle) : null;
  const first = startOfMonth(selectedMonth);
  const dayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOffset);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, date, inMonth: date.getFullYear() === selectedMonth.getFullYear() && date.getMonth() === selectedMonth.getMonth() };
  });

  const today = todayKey();
  const isPredicted = (key: string) => predicted.some((period) => key >= period.start && key <= period.end);
  const loggedLevel = (key: string) => {
    const log = partner.dayLogs[key];
    return log?.periodInfo?.level || log?.period || null;
  };

  return (
    <section aria-label={t("Partner's cycle calendar")} className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border">
      <h3 className="flex items-center gap-2 font-serif text-lg font-semibold"><BlueberryIcon size={21} /><span>{t("Partner's cycle calendar")}</span></h3>
      {next ? <div className="space-y-1 rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25"><p className="flex items-center gap-2"><WaterIcon size={18} /><span>{t("Next period")}: <span className="font-semibold">{next.start}</span></span></p><p className="text-xs text-muted-foreground">{t("Predicted window")}: {next.start} → {next.end}</p></div> : null}
      {cycle ? <p className="text-xs text-muted-foreground">{t("Cycle")} {cycle.cycleLength}d · {t("Period").toLowerCase()} {cycle.periodLength}d</p> : null}
      <div className="rounded-2xl bg-surface-sunken/32 p-3 ring-1 ring-border/25">
        <p className="mb-2 text-center text-xs font-medium">{selectedMonthLabel}</p>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{cells.map((cell) => {
          const logged = loggedLevel(cell.key);
          const predictedDay = isPredicted(cell.key) && !logged;
          const background = logged ? PERIOD_COLORS[logged] || CHART_COLORS.period : undefined;
          return <div key={cell.key} className={`grid aspect-square place-items-center rounded-full text-[10px] ${cell.inMonth ? "" : "opacity-30"} ${cell.key === today ? "ring-2 ring-primary" : ""}`} style={{ background, color: logged ? "white" : undefined, border: predictedDay ? `1.5px dashed ${CHART_COLORS.period}` : undefined }}>{cell.date.getDate()}</div>;
        })}</div>
      </div>
    </section>
  );
}
