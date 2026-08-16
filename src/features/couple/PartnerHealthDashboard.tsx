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

function joinDetailParts(values: Array<string | null | undefined | false>) {
  return values.filter((value): value is string => Boolean(value)).join(" · ");
}

function Chip({ children, tone = "violet" }: { children: React.ReactNode; tone?: "violet" | "green" | "neutral" }) {
  const classes = tone === "green"
    ? "bg-primary/10 text-primary"
    : tone === "neutral"
      ? "bg-tint text-muted-foreground"
      : "bg-violet-500/10 text-violet-700";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium leading-none ${classes}`}>{children}</span>;
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      <span className="font-semibold text-foreground">{label}:</span> {children}
    </p>
  );
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

function PainDetails({ entry }: { entry: PainWithDate }) {
  const { t } = useI18n();
  const nauseaSummary = joinDetailParts([
    entry.nauseaTypes?.length ? entry.nauseaTypes.map(t).join(", ") : null,
    entry.nauseaSeverity != null ? `${entry.nauseaSeverity}/10` : null,
    entry.nauseaOngoing ? t("ongoing") : entry.nauseaMinutes != null ? `${entry.nauseaMinutes} min` : null,
  ]);
  const headacheSummary = joinDetailParts([
    entry.headacheTypes?.length ? entry.headacheTypes.map(t).join(", ") : null,
    entry.headacheIntensity != null ? `${entry.headacheIntensity}/10` : null,
  ]);
  const pressureSummary = joinDetailParts([
    entry.pressureTypes?.length ? entry.pressureTypes.map(t).join(", ") : null,
    entry.pressureIntensity != null ? `${entry.pressureIntensity}/10` : null,
  ]);

  return (
    <>
      {entry.quality?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.quality.map((item) => <Chip key={item}>{t(item)}</Chip>)}</div> : null}
      {entry.symptoms?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.symptoms.map((item) => <Chip key={item} tone="green">{t(item)}</Chip>)}</div> : null}
      {entry.pcosSymptoms?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.pcosSymptoms.map((item) => <Chip key={item} tone="green">{t(item)}</Chip>)}</div> : null}

      <div className="mt-2 space-y-1.5">
        {entry.fluNote ? <DetailLine label="Flu">{entry.fluNote}</DetailLine> : null}
        {pressureSummary ? <DetailLine label={t("Pressure")}>{pressureSummary}</DetailLine> : null}
        {entry.nausea || nauseaSummary ? <DetailLine label={t("Nausea")}>{nauseaSummary || t("Yes")}</DetailLine> : null}
        {entry.nauseaTriggers?.length ? <DetailLine label={t("Triggers")}>{entry.nauseaTriggers.map(t).join(", ")}</DetailLine> : null}
        {entry.nauseaSymptoms?.length ? <DetailLine label={`${t("Nausea")} ${t("symptoms")}`}>{entry.nauseaSymptoms.map(t).join(", ")}</DetailLine> : null}
        {entry.nauseaHelped?.length ? <DetailLine label={t("Relieved by")}>{entry.nauseaHelped.map(t).join(", ")}</DetailLine> : null}
        {entry.nauseaNote ? <DetailLine label={t("Nausea note")}>{entry.nauseaNote}</DetailLine> : null}
        {entry.hotFlashesOn || entry.hotFlashes != null ? <DetailLine label={t("Hot flashes")}>{entry.hotFlashes != null ? `${entry.hotFlashes}/5` : t("Yes")}</DetailLine> : null}
        {entry.hotFlashesNote ? <DetailLine label={t("Hot flashes note")}>{entry.hotFlashesNote}</DetailLine> : null}
        {entry.headache || headacheSummary ? <DetailLine label={t("Headache")}>{headacheSummary || t("Yes")}</DetailLine> : null}
        {entry.headacheNote ? <DetailLine label={t("Headache note")}>{entry.headacheNote}</DetailLine> : null}
        {entry.headacheMed ? (
          <DetailLine label={t("Headache med")}>
            <span className="inline-flex items-center gap-1"><PillIcon size={14} />{entry.headacheMed}{entry.headacheMedTime ? ` ${t("at")} ${entry.headacheMedTime}` : ""}</span>
          </DetailLine>
        ) : null}
        {entry.stress != null ? <DetailLine label={t("Stress")}>{entry.stress}/10</DetailLine> : null}
        {entry.bodyBattery != null ? <DetailLine label={t("Battery")}>{entry.bodyBattery}/5</DetailLine> : null}
      </div>

      {entry.mood?.length ? <MoodChips items={entry.mood} /> : null}
      {entry.note ? <p className="mt-2 whitespace-pre-line rounded-xl bg-tint px-2.5 py-2 text-[11px] leading-relaxed text-foreground/75"><span className="font-semibold text-foreground">{t("Note")}:</span> {entry.note}</p> : null}
    </>
  );
}

function SymptomUpdateCard({ entry, language, nested = false }: { entry: PainWithDate; language: string; nested?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={nested ? "border-l border-border/70 pl-3" : "rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70"}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        {!nested ? <span className="inline-flex items-center gap-1"><CalendarIcon size={15} />{formatDate(entry.dateKey, language)}</span> : null}
        <span className="inline-flex items-center gap-1"><ClockIcon size={15} />{entry.time}</span>
      </div>
      <p className="mt-1 text-xs font-bold text-foreground">{t("Add symptoms")}</p>
      {entry.parts?.length ? <DetailLine label={t("Body")}>{entry.parts.map(t).join(", ")}</DetailLine> : null}
      <PainDetails entry={entry} />
    </div>
  );
}

function PainCard({ entry, language, updates }: { entry: PainWithDate; language: string; updates: PainWithDate[] }) {
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
          <PainDetails entry={entry} />
        </div>
      </div>

      {updates.length ? (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {updates.map((update) => <SymptomUpdateCard key={`${update.dateKey}-${update.id}`} entry={update} language={language} nested />)}
        </div>
      ) : null}
    </article>
  );
}

function PainEntryList({ entries, language }: { entries: PainWithDate[]; language: string }) {
  const baseEntries = entries.filter((entry) => entry.entryKind !== "symptom-update");
  const baseIds = new Set(baseEntries.map((entry) => entry.id));
  const standaloneUpdates = entries.filter((entry) => entry.entryKind === "symptom-update" && (!entry.sourcePainId || !baseIds.has(entry.sourcePainId)));

  return (
    <div className="space-y-2.5">
      {baseEntries.map((entry) => (
        <PainCard
          key={`${entry.dateKey}-${entry.id}`}
          entry={entry}
          language={language}
          updates={entries.filter((candidate) => candidate.entryKind === "symptom-update" && candidate.sourcePainId === entry.id)}
        />
      ))}
      {standaloneUpdates.map((entry) => <SymptomUpdateCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}
    </div>
  );
}

function visiblePainCardCount(entries: PainWithDate[]) {
  const baseEntries = entries.filter((entry) => entry.entryKind !== "symptom-update");
  const baseIds = new Set(baseEntries.map((entry) => entry.id));
  const standaloneUpdates = entries.filter((entry) => entry.entryKind === "symptom-update" && (!entry.sourcePainId || !baseIds.has(entry.sourcePainId)));
  return baseEntries.length + standaloneUpdates.length;
}

function TetanyCard({ entry, language }: { entry: TetanyWithDate; language: string }) {
  const { t } = useI18n();
  return (
    <article className="rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600"><BoltIcon size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground"><span>{formatDate(entry.dateKey, language)}</span><span>{entry.time}</span></div>
          <p className="mt-1 text-sm font-bold text-foreground">{t("Tetany episode")} · {entry.intensity}/5 · {entry.minutes == null ? t("ongoing") : `${entry.minutes} min`}</p>
          {entry.types?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.types.map((item) => <Chip key={item}>{t(item)}</Chip>)}</div> : null}
          <div className="mt-2 space-y-1.5">
            {entry.triggers?.length ? <DetailLine label={t("Triggers")}>{entry.triggers.map(t).join(", ")}</DetailLine> : null}
            {entry.location?.length ? <DetailLine label={t("Location")}>{entry.location.map(t).join(", ")}</DetailLine> : null}
            {entry.helped?.length ? <DetailLine label={t("Helped")}>{entry.helped.map(t).join(", ")}</DetailLine> : null}
            {entry.rescueMed ? <DetailLine label={t("Rescue")}>{entry.rescueMed}</DetailLine> : null}
          </div>
          {entry.note ? <p className="mt-2 whitespace-pre-line rounded-xl bg-tint px-2.5 py-2 text-[11px] text-foreground/75"><span className="font-semibold text-foreground">{t("Note")}:</span> {entry.note}</p> : null}
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
          <p className="mt-1 text-sm font-bold text-foreground">{t("Panic attack")} · {entry.intensity}/10 · {entry.minutes == null ? t("ongoing") : `${entry.minutes} min`}</p>
          {entry.physical?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.physical.map((item) => <Chip key={item}>{t(item)}</Chip>)}</div> : null}
          {entry.cognitive?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{entry.cognitive.map((item) => <Chip key={item} tone="green">{t(item)}</Chip>)}</div> : null}
          <div className="mt-2 space-y-1.5">
            {entry.trigger ? <DetailLine label={t("Trigger")}>{entry.trigger}</DetailLine> : null}
            {entry.place ? <DetailLine label={t("Place")}>{entry.place}</DetailLine> : null}
            <DetailLine label={t("Hyperventilation")}>{t(entry.hyperventilation)}{entry.tetanyPresent ? ` · ${t("tetany present")}` : ""}</DetailLine>
            {entry.helped?.length ? <DetailLine label={t("Helped")}>{entry.helped.map(t).join(", ")}</DetailLine> : null}
            {entry.rescueMed ? <DetailLine label={t("Rescue")}>{entry.rescueMed}</DetailLine> : null}
          </div>
          {entry.note ? <p className="mt-2 whitespace-pre-line rounded-xl bg-tint px-2.5 py-2 text-[11px] text-foreground/75"><span className="font-semibold text-foreground">{t("Note")}:</span> {entry.note}</p> : null}
        </div>
      </div>
    </article>
  );
}

function medicationRows(day: MedDay) {
  const scheduled = day.meds.flatMap((med) => med.asNeeded ? [] : med.times.filter((time) => day.medLog[`${med.id}@${time}`]).map((time) => ({ id: `${med.id}@${time}`, time, name: med.name, dose: med.dose, note: undefined as string | undefined })));
  const extra = day.extra.map((item) => ({ id: item.id, time: item.time, name: item.name, dose: item.dose, note: item.note }));
  return [...scheduled, ...extra].sort((a, b) => b.time.localeCompare(a.time));
}

function MedicationDayCard({ day, language }: { day: MedDay; language: string }) {
  const { t } = useI18n();
  const rows = medicationRows(day);
  if (!rows.length) return null;
  return (
    <article className="rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><PillIcon size={21} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground">{formatDate(day.dateKey, language)}</p>
          <div className="mt-1.5 space-y-2">{rows.map((row) => (
            <div key={row.id}>
              <p className="text-[11px] text-foreground"><span className="font-semibold">{row.time}</span> · {row.name}{row.dose ? ` (${row.dose})` : ""}</p>
              {row.note ? <p className="mt-1 whitespace-pre-line text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {row.note}</p> : null}
            </div>
          ))}</div>
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
  const painEntryCount = pain.filter((entry) => entry.entryKind !== "symptom-update").length;

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">{t("Partner's health log")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{partnerName} · {t("pain entries and shared symptoms")}</p>
      </div>

      <CategorySection
        title={`${t("Pain")} (${painEntryCount})`}
        currentLabel={currentLabel}
        current={currentPain.length ? <PainEntryList entries={currentPain} language={language} /> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No pain entries today.")}</p>}
        historyCount={visiblePainCardCount(olderPain)}
        history={<PainEntryList entries={olderPain} language={language} />}
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
