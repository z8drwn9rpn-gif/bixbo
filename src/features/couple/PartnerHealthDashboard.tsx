import {
  BoltIcon,
  CalendarIcon,
  ChevronDown,
  ClockIcon,
  PanicIcon,
  PillIcon,
} from "@/components/icons/BixboExtraIcons";
import { BixboIcon } from "@/components/icons/BixboIcon";
import { useI18n } from "@/hooks/useI18n";
import {
  PAIN_DESCRIPTIONS,
  painColor,
  type ExtraMed,
  type Med,
  type PainEntry,
  type PanicAttack,
  type TetanyEpisode,
} from "@/lib/storage";

type PainWithDate = PainEntry & { dateKey: string };
type TetanyWithDate = TetanyEpisode & { dateKey: string };
type PanicWithDate = PanicAttack & { dateKey: string };
type MedDay = { dateKey: string; meds: Med[]; medLog: Record<string, boolean>; extra: ExtraMed[] };

type PartnerHealthDashboardProps = {
  partnerName: string;
  visibleDay: string;
  pain: PainWithDate[];
  tetany: TetanyWithDate[];
  panic: PanicWithDate[];
  medDays: MedDay[];
};

function formatDate(dateKey: string, language: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function splitEmojiLabel(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)*)\s*(.*)$/u,
  );
  if (!match) return { emoji: undefined, label: trimmed };
  return { emoji: match[1], label: match[2].trim() };
}

function stripRemainingEmoji(value: string) {
  return value
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?/gu, "")
    .replace(/\u200D/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function Chip({ children, tone = "violet" }: { children: React.ReactNode; tone?: "violet" | "green" | "neutral" }) {
  const classes = tone === "green"
    ? "bg-primary/10 text-primary"
    : tone === "neutral"
      ? "bg-tint text-muted-foreground"
      : "bg-violet-500/10 text-violet-700";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium leading-none ${classes}`}>{children}</span>;
}

function MoodChips({ items }: { items: string[] }) {
  const { t } = useI18n();
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("Mood")}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const source = splitEmojiLabel(item);
          const localized = splitEmojiLabel(t(item));
          const emoji = source.emoji ?? localized.emoji;
          const label = stripRemainingEmoji(localized.label || source.label || t(item)) || t("Mood");
          return (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full bg-tint py-1 pl-1 pr-2.5 text-[10px] font-medium leading-none text-muted-foreground ring-1 ring-border/35"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface">
                <BixboIcon emoji={emoji} label={label} size={17} fallback="note" effects="stable" />
              </span>
              <span>{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PainCard({ entry, language }: { entry: PainWithDate; language: string }) {
  const { t } = useI18n();
  const description = PAIN_DESCRIPTIONS[Math.max(0, Math.min(10, Math.round(entry.score)))] ?? "Pain";
  const score = Number.isInteger(entry.score) ? String(entry.score) : entry.score.toFixed(1);

  return (
    <article className="rounded-[1.4rem] bg-surface px-3.5 py-3.5 shadow-sm ring-1 ring-border/70">
      <div className="grid grid-cols-[56px_1fr] gap-3">
        <div className="border-r border-border/60 pr-3 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full text-base font-bold text-white" style={{ background: painColor(entry.score) }}>
            {score}
          </div>
          <p className="mt-1.5 text-[9px] font-medium leading-tight text-muted-foreground">{t(description)}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarIcon size={15} />{formatDate(entry.dateKey, language)}</span>
            <span className="inline-flex items-center gap-1"><ClockIcon size={15} />{entry.time}</span>
          </div>

          {entry.parts?.length ? <p className="mt-2 text-sm font-bold text-foreground">{entry.parts.map(t).join(", ")}</p> : entry.score === 0 ? <p className="mt-2 text-sm font-semibold text-foreground">{t("Pain free")}</p> : null}

          {entry.quality?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.quality.map((item) => <Chip key={item}>{t(item)}</Chip>)}</div> : null}
          {entry.symptoms?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.symptoms.map((item) => <Chip key={item} tone="green">{t(item)}</Chip>)}</div> : null}
          {entry.pcosSymptoms?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.pcosSymptoms.map((item) => <Chip key={item} tone="green">{t(item)}</Chip>)}</div> : null}
          {entry.mood?.length ? <MoodChips items={entry.mood} /> : null}

          <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            {entry.headache ? <p>{t("Headache")}{entry.headacheIntensity != null ? ` ${entry.headacheIntensity}/10` : ""}{entry.headacheTypes?.length ? ` · ${entry.headacheTypes.map(t).join(", ")}` : ""}</p> : null}
            {entry.nausea ? <p>{t("Nausea")}{entry.nauseaSeverity != null ? ` ${entry.nauseaSeverity}/10` : ""}{entry.nauseaTypes?.length ? ` · ${entry.nauseaTypes.map(t).join(", ")}` : ""}</p> : null}
            {entry.hotFlashesOn || entry.hotFlashes != null ? <p>{t("Hot flashes")}{entry.hotFlashes != null ? ` ${entry.hotFlashes}/5` : ""}</p> : null}
            {entry.pressureTypes?.length ? <p>{t("Pressure")}: {entry.pressureTypes.map(t).join(", ")}{entry.pressureIntensity != null ? ` · ${entry.pressureIntensity}/10` : ""}</p> : null}
            {entry.note ? <p className="rounded-xl bg-tint px-2.5 py-2 text-foreground/75">{entry.note}</p> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function TetanyCard({ entry, language }: { entry: TetanyWithDate; language: string }) {
  const { t } = useI18n();
  return (
    <article className="rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600"><BoltIcon size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground"><span>{formatDate(entry.dateKey, language)}</span><span>{entry.time}</span></div>
          <p className="mt-1 text-sm font-bold text-foreground">{t("Tetany episode")} · {entry.intensity}/5</p>
          {entry.types?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.types.map((item) => <Chip key={item}>{t(item)}</Chip>)}</div> : null}
          {entry.location?.length ? <p className="mt-2 text-[11px] text-muted-foreground">{t("Location")}: {entry.location.map(t).join(", ")}</p> : null}
          {entry.triggers?.length ? <p className="mt-1 text-[11px] text-muted-foreground">{t("Triggers")}: {entry.triggers.map(t).join(", ")}</p> : null}
          {entry.helped?.length ? <p className="mt-1 text-[11px] text-muted-foreground">{t("Helped by")}: {entry.helped.map(t).join(", ")}</p> : null}
          {entry.note ? <p className="mt-2 rounded-xl bg-tint px-2.5 py-2 text-[11px] text-foreground/75">{entry.note}</p> : null}
        </div>
      </div>
    </article>
  );
}

function PanicCard({ entry, language }: { entry: PanicWithDate; language: string }) {
  const { t } = useI18n();
  return (
    <article className="rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600"><PanicIcon size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground"><span>{formatDate(entry.dateKey, language)}</span><span>{entry.time}</span></div>
          <p className="mt-1 text-sm font-bold text-foreground">{t("Panic attack")} · {entry.intensity}/10</p>
          {entry.physical?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.physical.map((item) => <Chip key={item}>{t(item)}</Chip>)}</div> : null}
          {entry.cognitive?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.cognitive.map((item) => <Chip key={item} tone="green">{t(item)}</Chip>)}</div> : null}
          {entry.trigger ? <p className="mt-2 text-[11px] text-muted-foreground">{t("Trigger")}: {entry.trigger}</p> : null}
          {entry.helped?.length ? <p className="mt-1 text-[11px] text-muted-foreground">{t("Helped by")}: {entry.helped.map(t).join(", ")}</p> : null}
          {entry.note ? <p className="mt-2 rounded-xl bg-tint px-2.5 py-2 text-[11px] text-foreground/75">{entry.note}</p> : null}
        </div>
      </div>
    </article>
  );
}

function medicationRows(day: MedDay) {
  const scheduled = day.meds.flatMap((med) => med.asNeeded ? [] : med.times.filter((time) => day.medLog[`${med.id}@${time}`]).map((time) => ({ id: `${med.id}@${time}`, time, name: med.name, dose: med.dose })));
  const extra = day.extra.map((item) => ({ id: item.id, time: item.time, name: item.name, dose: item.dose }));
  return [...scheduled, ...extra].sort((a, b) => b.time.localeCompare(a.time));
}

function MedicationDayCard({ day, language }: { day: MedDay; language: string }) {
  const rows = medicationRows(day);
  if (!rows.length) return null;
  return (
    <article className="rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><PillIcon size={21} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground">{formatDate(day.dateKey, language)}</p>
          <div className="mt-1.5 space-y-1.5">{rows.map((row) => <p key={row.id} className="text-[11px] text-foreground"><span className="font-semibold">{row.time}</span> · {row.name}{row.dose ? ` (${row.dose})` : ""}</p>)}</div>
        </div>
      </div>
    </article>
  );
}

function CategorySection({ title, currentLabel, current, historyCount, history }: { title: string; currentLabel: string; current: React.ReactNode; historyCount: number; history: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-[1.75rem] bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{currentLabel}</span>
      </div>
      <div className="mt-3">{current}</div>
      {historyCount > 0 ? (
        <details className="group mt-3 border-t border-border/60 pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-1 py-1 text-xs font-semibold text-foreground">
            <span>{t("Show earlier entries")} ({historyCount})</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-2.5">{history}</div>
        </details>
      ) : null}
    </section>
  );
}

export function PartnerHealthDashboard({ partnerName, visibleDay, pain, tetany, panic, medDays }: PartnerHealthDashboardProps) {
  const { t, language } = useI18n();
  const currentLabel = visibleDay === new Date().toISOString().slice(0, 10) ? t("Today") : formatDate(visibleDay, language);
  const currentPain = pain.filter((entry) => entry.dateKey === visibleDay);
  const olderPain = pain.filter((entry) => entry.dateKey !== visibleDay);
  const currentTetany = tetany.filter((entry) => entry.dateKey === visibleDay);
  const olderTetany = tetany.filter((entry) => entry.dateKey !== visibleDay);
  const currentPanic = panic.filter((entry) => entry.dateKey === visibleDay);
  const olderPanic = panic.filter((entry) => entry.dateKey !== visibleDay);
  const currentMeds = medDays.filter((day) => day.dateKey === visibleDay && medicationRows(day).length > 0);
  const olderMeds = medDays.filter((day) => day.dateKey !== visibleDay && medicationRows(day).length > 0);

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">{t("Partner's health log")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{partnerName} · {t("pain entries and shared symptoms")}</p>
      </div>

      <CategorySection
        title={`${t("Pain")} (${pain.length})`}
        currentLabel={currentLabel}
        current={currentPain.length ? <div className="space-y-2.5">{currentPain.map((entry) => <PainCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No pain entries today.")}</p>}
        historyCount={olderPain.length}
        history={olderPain.map((entry) => <PainCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}
      />

      <CategorySection
        title={`${t("Tetany")} (${tetany.length})`}
        currentLabel={currentLabel}
        current={currentTetany.length ? <div className="space-y-2.5">{currentTetany.map((entry) => <TetanyCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No tetany episodes today.")}</p>}
        historyCount={olderTetany.length}
        history={olderTetany.map((entry) => <TetanyCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}
      />

      <CategorySection
        title={`${t("Panic attacks")} (${panic.length})`}
        currentLabel={currentLabel}
        current={currentPanic.length ? <div className="space-y-2.5">{currentPanic.map((entry) => <PanicCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No panic attacks today.")}</p>}
        historyCount={olderPanic.length}
        history={olderPanic.map((entry) => <PanicCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}
      />

      <CategorySection
        title={t("Medication")}
        currentLabel={currentLabel}
        current={currentMeds.length ? <div className="space-y-2.5">{currentMeds.map((day) => <MedicationDayCard key={day.dateKey} day={day} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No medication logged today.")}</p>}
        historyCount={olderMeds.length}
        history={olderMeds.map((day) => <MedicationDayCard key={day.dateKey} day={day} language={language} />)}
      />
    </section>
  );
}
