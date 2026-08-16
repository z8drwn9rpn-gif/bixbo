import { CalendarIcon, HeartIcon, ProfileIcon, SparkleIcon } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { useI18n } from "@/hooks/useI18n";
import { clampPercent, hasSymptoms, type ComparableDayLog } from "./coupleUtils";

type CoupleOverviewPanelProps = {
  days: string[];
  mine: Record<string, ComparableDayLog>;
  theirs: Record<string, ComparableDayLog>;
  score: number | null;
  myName: string;
  partnerName: string;
};

function painEntries(log?: ComparableDayLog) {
  return (log?.pain ?? []).filter((entry) => entry.entryKind !== "symptom-update");
}

function dailyPainAverage(log?: ComparableDayLog) {
  const entries = painEntries(log);
  if (!entries.length) return null;
  return entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length;
}

function painSignals(log?: ComparableDayLog) {
  const values = new Set<string>();
  for (const entry of log?.pain ?? []) {
    for (const symptom of entry.symptoms ?? []) values.add(symptom);
    for (const symptom of entry.pcosSymptoms ?? []) values.add(symptom);
    if (entry.headache) values.add("Headache");
    if (entry.nausea) values.add("Nausea");
    if (entry.hotFlashesOn || entry.hotFlashes != null) values.add("Hot flashes");
  }
  return values;
}

function SummaryItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="min-w-0 px-2 py-3 text-center">
      <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export function CoupleOverviewPanel({ days, mine, theirs, score, myName, partnerName }: CoupleOverviewPanelProps) {
  const { t } = useI18n();
  const safeScore = score == null ? 0 : clampPercent(score);
  const sharedLoggedDays = days.filter((day) => hasSymptoms(mine[day]) && hasSymptoms(theirs[day])).length;

  let similarPainDays = 0;
  let goodPainDaysTogether = 0;
  let veryGoodPainDaysTogether = 0;
  const sharedSignalCounts = new Map<string, number>();

  for (const day of days) {
    const mineAverage = dailyPainAverage(mine[day]);
    const partnerAverage = dailyPainAverage(theirs[day]);
    if (mineAverage != null && partnerAverage != null) {
      if (Math.abs(mineAverage - partnerAverage) <= 1) similarPainDays += 1;
      if (mineAverage <= 3 && partnerAverage <= 3) goodPainDaysTogether += 1;
      if (mineAverage <= 1 && partnerAverage <= 1) veryGoodPainDaysTogether += 1;
    }

    const mineSignals = painSignals(mine[day]);
    const partnerSignals = painSignals(theirs[day]);
    for (const signal of mineSignals) {
      if (!partnerSignals.has(signal)) continue;
      sharedSignalCounts.set(signal, (sharedSignalCounts.get(signal) ?? 0) + 1);
    }
  }

  const commonSharedSymptom = [...sharedSignalCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const scoreText = score == null
    ? t("Not enough shared data this month yet.")
    : safeScore >= 70
      ? t("You are very in sync this month.")
      : safeScore >= 45
        ? t("You share several health patterns this month.")
        : t("Your health patterns differ more this month.");

  return (
    <div className="space-y-3">
      <section className="rounded-[1.75rem] bg-surface p-4 shadow-sm ring-1 ring-border/80">
        <div className="flex items-center gap-4">
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-2"
            style={{ background: `conic-gradient(${CHART_COLORS.panic} ${safeScore}%, ${CHART_TINTS.panic} ${safeScore}% 100%)` }}
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-surface">
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{score == null ? "—" : `${safeScore.toFixed(0)}%`}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{t("similarity")}</p>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("Health similarity")}</p>
            <h2 className="mt-1 truncate text-xl font-bold text-foreground">{myName} + {partnerName}</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{scoreText}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] bg-surface shadow-sm ring-1 ring-border/80">
        <h3 className="px-4 pt-4 text-sm font-bold text-foreground">{t("This month together")}</h3>
        <div className="mt-2 grid grid-cols-4 divide-x divide-border/60">
          <SummaryItem icon={<CalendarIcon size={18} />} value={sharedLoggedDays} label={t("Shared log days")} />
          <SummaryItem icon={<HeartIcon size={18} />} value={similarPainDays} label={t("Similar pain days")} />
          <SummaryItem icon={<ProfileIcon size={18} />} value={goodPainDaysTogether} label={t("Good days together")} />
          <SummaryItem icon={<SparkleIcon size={18} />} value={veryGoodPainDaysTogether} label={t("Very good days together")} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <section className="rounded-[1.45rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/80">
          <p className="text-[10px] font-bold leading-tight text-foreground">{t("Most common shared symptom")}</p>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600">
              <HeartIcon size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{commonSharedSymptom ? t(commonSharedSymptom[0]) : t("No shared symptom yet")}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {commonSharedSymptom ? `${t("Shared on")} ${commonSharedSymptom[1]} ${t("days")}` : t("Keep logging to compare")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.45rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/80">
          <p className="text-[10px] font-bold leading-tight text-foreground">{t("Best overlap")}</p>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <SparkleIcon size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">{t("Pain levels")}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{t("Similar on")} {similarPainDays} {t("days")}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="flex items-start gap-3 rounded-[1.45rem] bg-tint px-4 py-3.5 ring-1 ring-border/50">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <SparkleIcon size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">{t("Insight")}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
            {similarPainDays > 0
              ? `${t("You had similar pain levels on")} ${similarPainDays} ${t("days this month")}.`
              : t("Keep logging on the same days to unlock a clearer shared trend.")}
          </p>
        </div>
      </section>
    </div>
  );
}
