import { useMemo, useState } from "react";
import {
  BoltIcon,
  CalendarIcon,
  ChevronDown,
  ClockIcon,
  HeartIcon,
  PanicIcon,
  PillIcon,
} from "@/components/icons/BixboExtraIcons";
import { BixboIcon } from "@/components/icons/BixboIcon";
import { useI18n } from "@/hooks/useI18n";
import {
  PAIN_DESCRIPTIONS,
  painColor,
  todayKey,
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
type HealthFilter = "all" | "pain" | "headache" | "nausea" | "tetany" | "panic" | "meds";

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
  const match = trimmed.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)*)\s*(.*)$/u);
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

function matchesQuery(value: unknown, query: string) {
  if (!query) return true;
  try {
    return JSON.stringify(value).toLowerCase().includes(query);
  } catch {
    return true;
  }
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
  return <p className="text-[11px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{label}:</span> {children}</p>;
}

function CalendarJumpButton({ dateKey }: { dateKey: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.location.assign(`/#date=${dateKey}`)}
      aria-label={t("Open day in calendar")}
      title={t("Open day in calendar")}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tint text-primary ring-1 ring-border/45 transition active:scale-95"
    >
      <CalendarIcon size={15} />
    </button>
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
            <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-tint py-1 pl-1 pr-2.5 text-[10px] font-medium leading-none text-muted-foreground ring-1 ring-border/35">
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
        {entry.headacheMed ? <DetailLine label={t("Headache med")}><span className="inline-flex items-center gap-1"><PillIcon size={14} />{entry.headacheMed}{entry.headacheMedTime ? ` ${t("at")} ${entry.headacheMedTime}` : ""}</span></DetailLine> : null}
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          {!nested ? <span className="inline-flex items-center gap-1"><CalendarIcon size={15} />{formatDate(entry.dateKey, language)}</span> : null}
          <span className="inline-flex items-center gap-1"><ClockIcon size={15} />{entry.time}</span>
        </div>
        {!nested ? <CalendarJumpButton dateKey={entry.dateKey} /> : null}
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
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full text-base font-bold text-white" style={{ background: painColor(entry.score) }}>{score}</div>
          <p className="mt-1.5 text-[9px] font-medium leading-tight text-muted-foreground">{t(description)}</p>
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><CalendarIcon size={15} />{formatDate(entry.dateKey, language)}</span>
              <span className="inline-flex items-center gap-1"><ClockIcon size={15} />{entry.time}</span>
            </div>
            <CalendarJumpButton dateKey={entry.dateKey} />
          </div>
          {entry.parts?.length ? <p className="mt-2 text-sm font-bold text-foreground">{entry.parts.map(t).join(", ")}</p> : entry.score === 0 ? <p className="mt-2 text-sm font-semibold text-foreground">{t("Pain free")}</p> : null}
          <PainDetails entry={entry} />
        </div>
      </div>
      {updates.length ? <div className="mt-3 space-y-2 border-t border-border/60 pt-3">{updates.map((update) => <SymptomUpdateCard key={`${update.dateKey}-${update.id}`} entry={update} language={language} nested />)}</div> : null}
    </article>
  );
}

function PainEntryList({ entries, language }: { entries: PainWithDate[]; language: string }) {
  const baseEntries = entries.filter((entry) => entry.entryKind !== "symptom-update");
  const baseIds = new Set(baseEntries.map((entry) => entry.id));
  const standaloneUpdates = entries.filter((entry) => entry.entryKind === "symptom-update" && (!entry.sourcePainId || !baseIds.has(entry.sourcePainId)));
  return (
    <div className="space-y-2.5">
      {baseEntries.map((entry) => <PainCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} updates={entries.filter((candidate) => candidate.entryKind === "symptom-update" && candidate.sourcePainId === entry.id)} />)}
      {standaloneUpdates.map((entry) => <SymptomUpdateCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}
    </div>
  );
}

function visiblePainCardCount(entries: PainWithDate[]) {
  const baseEntries = entries.filter((entry) => entry.entryKind !== "symptom-update");
  const baseIds = new Set(baseEntries.map((entry) => entry.id));
  return baseEntries.length + entries.filter((entry) => entry.entryKind === "symptom-update" && (!entry.sourcePainId || !baseIds.has(entry.sourcePainId))).length;
}

function TetanyCard({ entry, language }: { entry: TetanyWithDate; language: string }) {
  const { t } = useI18n();
  return (
    <article className="rounded-[1.4rem] bg-surface p-3.5 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600"><BoltIcon size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground"><span>{formatDate(entry.dateKey, language)}</span><span>{entry.time}</span></div><CalendarJumpButton dateKey={entry.dateKey} /></div>
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
          <div className="flex items-start justify-between gap-2"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground"><span>{formatDate(entry.dateKey, language)}</span><span>{entry.time}</span></div><CalendarJumpButton dateKey={entry.dateKey} /></div>
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
          <div className="flex items-start justify-between gap-2"><p className="text-[10px] text-muted-foreground">{formatDate(day.dateKey, language)}</p><CalendarJumpButton dateKey={day.dateKey} /></div>
          <div className="mt-1.5 space-y-2">{rows.map((row) => <div key={row.id}><p className="text-[11px] text-foreground"><span className="font-semibold">{row.time}</span> · {row.name}{row.dose ? ` (${row.dose})` : ""}</p>{row.note ? <p className="mt-1 whitespace-pre-line text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{t("Note")}:</span> {row.note}</p> : null}</div>)}</div>
        </div>
      </div>
    </article>
  );
}

function CategorySection({ title, currentLabel, current, historyCount, history, expanded, onToggle }: { title: string; currentLabel: string; current: React.ReactNode; historyCount: number; history: React.ReactNode; expanded: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <section className="rounded-[1.75rem] bg-surface p-4 shadow-sm ring-1 ring-border/80">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-foreground">{title}</h3><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{currentLabel}</span></div>
      <div className="mt-3">{current}</div>
      {historyCount > 0 ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <button type="button" onClick={onToggle} className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-xs font-semibold text-foreground" aria-expanded={expanded}>
            <span>{expanded ? t("Hide earlier entries") : t("Show earlier entries")} ({historyCount})</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded ? <div className="mt-3 space-y-2.5">{history}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

export function PartnerHealthDashboard({ partnerName, visibleDay, pain, tetany, panic, medDays }: PartnerHealthDashboardProps) {
  const { t, language } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HealthFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ pain: false, tetany: false, panic: false, meds: false });
  const normalizedQuery = query.trim().toLowerCase();
  const currentLabel = visibleDay === todayKey() ? t("Today") : formatDate(visibleDay, language);

  const filteredPain = useMemo(() => pain.filter((entry) => {
    if (!matchesQuery(entry, normalizedQuery)) return false;
    if (filter === "headache") return Boolean(entry.headache || entry.headacheIntensity != null || entry.headacheTypes?.length || entry.headacheNote || entry.headacheMed);
    if (filter === "nausea") return Boolean(entry.nausea || entry.nauseaSeverity != null || entry.nauseaTypes?.length || entry.nauseaNote || entry.nauseaSymptoms?.length || entry.nauseaTriggers?.length);
    return filter === "all" || filter === "pain";
  }), [filter, normalizedQuery, pain]);
  const filteredTetany = useMemo(() => (filter === "all" || filter === "tetany") ? tetany.filter((entry) => matchesQuery(entry, normalizedQuery)) : [], [filter, normalizedQuery, tetany]);
  const filteredPanic = useMemo(() => (filter === "all" || filter === "panic") ? panic.filter((entry) => matchesQuery(entry, normalizedQuery)) : [], [filter, normalizedQuery, panic]);
  const filteredMeds = useMemo(() => (filter === "all" || filter === "meds") ? medDays.filter((day) => medicationRows(day).length > 0 && matchesQuery(day, normalizedQuery)) : [], [filter, medDays, normalizedQuery]);

  const currentPain = filteredPain.filter((entry) => entry.dateKey === visibleDay);
  const olderPain = filteredPain.filter((entry) => entry.dateKey !== visibleDay);
  const currentTetany = filteredTetany.filter((entry) => entry.dateKey === visibleDay);
  const olderTetany = filteredTetany.filter((entry) => entry.dateKey !== visibleDay);
  const currentPanic = filteredPanic.filter((entry) => entry.dateKey === visibleDay);
  const olderPanic = filteredPanic.filter((entry) => entry.dateKey !== visibleDay);
  const currentMeds = filteredMeds.filter((day) => day.dateKey === visibleDay);
  const olderMeds = filteredMeds.filter((day) => day.dateKey !== visibleDay);
  const painEntryCount = filteredPain.filter((entry) => entry.entryKind !== "symptom-update").length;
  const allExpanded = Object.values(expanded).every(Boolean);
  const hasResults = filteredPain.length + filteredTetany.length + filteredPanic.length + filteredMeds.length > 0;

  const FILTERS: Array<{ id: HealthFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "pain", label: "Pain" },
    { id: "headache", label: "Headache" },
    { id: "nausea", label: "Nausea" },
    { id: "tetany", label: "Tetany" },
    { id: "panic", label: "Panic" },
    { id: "meds", label: "Meds" },
  ];

  const setAllExpanded = (value: boolean) => setExpanded({ pain: value, tetany: value, panic: value, meds: value });
  const toggleSection = (key: string) => setExpanded((current) => ({ ...current, [key]: !current[key] }));

  return (
    <section className="space-y-3">
      <div className="px-1" {...(visibleDay === todayKey() ? { "data-bixbo-today-target": true } : {})}>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">{t("Partner's health log")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{partnerName} · {t("pain entries and shared symptoms")}</p>
      </div>

      <div className="rounded-[1.5rem] bg-surface p-3 shadow-sm ring-1 ring-border/80">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search health log")}
            aria-label={t("Search health log")}
            className="h-9 min-w-0 flex-1 rounded-full border border-border/70 bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
          <button type="button" onClick={() => window.location.assign("/")} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-[10px] font-semibold text-primary ring-1 ring-primary/15" title={t("My calendar")}>
            <CalendarIcon size={14} /> {t("Me")}
          </button>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ring-1 transition ${filter === item.id ? "bg-primary text-primary-foreground ring-primary" : "bg-tint text-muted-foreground ring-border/50"}`}>{t(item.label)}</button>)}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => window.location.assign("/")} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/50"><CalendarIcon size={13} />{t("Today")}</button>
          <button type="button" onClick={() => setAllExpanded(!allExpanded)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-primary ring-1 ring-border/50"><ChevronDown className={`h-3 w-3 ${allExpanded ? "rotate-180" : ""}`} />{allExpanded ? t("Collapse all") : t("Expand all")}</button>
        </div>
      </div>

      {hasResults ? <div data-bixbo-latest-entry className="scroll-mt-24" aria-hidden="true" /> : null}

      {(filter === "all" || filter === "pain" || filter === "headache" || filter === "nausea") ? (
        <CategorySection
          title={`${filter === "headache" ? t("Headache") : filter === "nausea" ? t("Nausea") : t("Pain")} (${painEntryCount})`}
          currentLabel={currentLabel}
          current={currentPain.length ? <PainEntryList entries={currentPain} language={language} /> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No matching entries today.")}</p>}
          historyCount={visiblePainCardCount(olderPain)}
          history={<PainEntryList entries={olderPain} language={language} />}
          expanded={expanded.pain}
          onToggle={() => toggleSection("pain")}
        />
      ) : null}

      {(filter === "all" || filter === "tetany") ? (
        <CategorySection title={`${t("Tetany")} (${filteredTetany.length})`} currentLabel={currentLabel} current={currentTetany.length ? <div className="space-y-2.5">{currentTetany.map((entry) => <TetanyCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No matching entries today.")}</p>} historyCount={olderTetany.length} history={olderTetany.map((entry) => <TetanyCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)} expanded={expanded.tetany} onToggle={() => toggleSection("tetany")} />
      ) : null}

      {(filter === "all" || filter === "panic") ? (
        <CategorySection title={`${t("Panic attacks")} (${filteredPanic.length})`} currentLabel={currentLabel} current={currentPanic.length ? <div className="space-y-2.5">{currentPanic.map((entry) => <PanicCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No matching entries today.")}</p>} historyCount={olderPanic.length} history={olderPanic.map((entry) => <PanicCard key={`${entry.dateKey}-${entry.id}`} entry={entry} language={language} />)} expanded={expanded.panic} onToggle={() => toggleSection("panic")} />
      ) : null}

      {(filter === "all" || filter === "meds") ? (
        <CategorySection title={t("Medication")} currentLabel={currentLabel} current={currentMeds.length ? <div className="space-y-2.5">{currentMeds.map((day) => <MedicationDayCard key={day.dateKey} day={day} language={language} />)}</div> : <p className="rounded-2xl bg-tint px-3 py-3 text-xs text-muted-foreground">{t("No matching entries today.")}</p>} historyCount={olderMeds.length} history={olderMeds.map((day) => <MedicationDayCard key={day.dateKey} day={day} language={language} />)} expanded={expanded.meds} onToggle={() => toggleSection("meds")} />
      ) : null}

      {!hasResults ? <div className="rounded-3xl bg-surface p-5 text-center text-xs text-muted-foreground ring-1 ring-border/70"><HeartIcon size={22} className="mx-auto mb-2" />{t("No health entries match this filter.")}</div> : null}
    </section>
  );
}
