import { type ReactNode } from "react";
import { BoltIcon, HeartIcon, PanicIcon, ProfileIcon, SparkleIcon, TaskIcon } from "@/components/icons/BixboExtraIcons";
import { CHART_COLORS, CHART_TINTS } from "@/components/ui/chart";
import { useI18n } from "@/hooks/useI18n";
import { PAIN_DESCRIPTIONS, painColor, type ExtraMed, type Med, type PainEntry, type PanicAttack, type TetanyEpisode } from "@/lib/storage";
import { clampPercent, formatValue, TONES, type ComparisonTone } from "./coupleUtils";

export function SectionCard({ title, description: _description, children }: { title: string; description?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(title)}</h2>
      {children}
    </section>
  );
}

export function StatCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: ComparisonTone }) {
  const { t } = useI18n();
  const palette = TONES[tone];
  return (
    <article className="rounded-2xl bg-tint p-4 ring-1 ring-border/50">
      <div className="grid h-9 w-9 place-items-center rounded-2xl" style={{ color: palette.text, backgroundColor: "var(--surface)" }}>{icon}</div>
      <p className="mt-3 text-[11px] font-medium text-muted-foreground">{t(label)}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{t(detail)}</p>
    </article>
  );
}

function ComparisonRow({ label, value, percentage, color, decimals, unit, striped = false }: { label: string; value: number | null; percentage: number; color: string; decimals: number; unit: string; striped?: boolean }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[11px] font-medium text-muted-foreground">{t(label)}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{formatValue(value, decimals, unit)}</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface/70 ring-1 ring-border/40">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: value == null ? "0%" : `${Math.max(value === 0 ? 0 : 4, percentage)}%`, background: striped ? `repeating-linear-gradient(135deg, ${color}, ${color} 5px, rgba(255,255,255,.35) 5px, rgba(255,255,255,.35) 9px)` : color, opacity: striped ? 0.82 : 1 }} />
      </div>
    </div>
  );
}

export function ComparisonBarCard({ title, subtitle: _subtitle, mine, theirs, max, mineLabel, partnerLabel, tone, decimals = 0, unit = "", icon }: { title: string; subtitle: string; mine: number | null; theirs: number | null; max?: number; mineLabel: string; partnerLabel: string; tone: ComparisonTone; decimals?: number; unit?: string; icon: ReactNode }) {
  const { t } = useI18n();
  const palette = TONES[tone];
  const calculatedMax = max ?? Math.max(1, ...[mine, theirs].filter((value): value is number => value != null).map((value) => Math.abs(value)));
  const minePercent = mine == null ? 0 : clampPercent((Math.max(0, mine) / calculatedMax) * 100);
  const theirsPercent = theirs == null ? 0 : clampPercent((Math.max(0, theirs) / calculatedMax) * 100);
  return (
    <article className="rounded-2xl bg-tint p-4 ring-1 ring-border/50">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: palette.text, backgroundColor: "var(--surface)" }}>{icon}</span>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-foreground">{t(title)}</h3></div>
      </div>
      <div className="mt-3 space-y-2.5">
        <ComparisonRow label={mineLabel} value={mine} percentage={minePercent} color={palette.solid} decimals={decimals} unit={unit} />
        <ComparisonRow label={partnerLabel} value={theirs} percentage={theirsPercent} color={palette.solid} decimals={decimals} unit={unit} striped />
      </div>
    </article>
  );
}

export function SimilarityCard({ score, partnerName }: { score: number | null; partnerName: string }) {
  const { t } = useI18n();
  const safeScore = score == null ? 0 : clampPercent(score);
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border/80">
      <div className="flex items-center gap-4 rounded-2xl bg-tint p-4 ring-1 ring-border/50">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-2" style={{ background: `conic-gradient(${CHART_COLORS.panic} ${safeScore}%, ${CHART_TINTS.panic} ${safeScore}% 100%)` }}>
          <div className="grid h-full w-full place-items-center rounded-full bg-surface"><div className="text-center"><p className="text-2xl font-bold tabular-nums">{score == null ? "—" : `${safeScore.toFixed(0)}%`}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("similarity")}</p></div></div>
        </div>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Health similarity")}</p><h2 className="mt-1 font-serif text-xl font-semibold">{t("You")} + {t(partnerName)}</h2>{score == null ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("No partner comparison data in this month.")}</p> : null}</div>
      </div>
    </section>
  );
}

export function PainList({ title, entries }: { title: string; entries: (PainEntry & { dateKey: string })[] }) {
  const { t } = useI18n();
  if (!entries.length) return <p className="text-xs text-muted-foreground">{t("No pain entries yet.")}</p>;
  return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(title)}</p><ul className="space-y-2">{entries.map((pain) => <li key={`${pain.dateKey}-${pain.id}`} className="flex items-start gap-3 rounded-2xl bg-surface-sunken/32 p-3 ring-1 ring-border/25"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: painColor(pain.score) }}>{Number.isInteger(pain.score) ? pain.score : pain.score.toFixed(1)}</div><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{pain.dateKey} · {pain.time} · {t(PAIN_DESCRIPTIONS[Math.round(pain.score)])}</p>{pain.parts?.length ? <p className="text-sm">{pain.parts.map(t).join(", ")}</p> : null}{pain.quality?.length ? <p className="text-xs text-muted-foreground">{pain.quality.map(t).join(", ")}</p> : null}{pain.symptoms?.length ? <p className="text-xs text-muted-foreground">+ {pain.symptoms.map(t).join(", ")}</p> : null}{pain.hotFlashes != null ? <p className="text-xs text-muted-foreground">{t("Hot flashes")} {pain.hotFlashes}/5</p> : null}{pain.headache ? <p className="text-xs text-muted-foreground">{t("Headache")}{pain.headacheIntensity != null ? ` ${pain.headacheIntensity}/10` : ""}</p> : null}{pain.nausea ? <p className="text-xs text-muted-foreground">{t("Nausea")}{pain.nauseaSeverity != null ? ` ${pain.nauseaSeverity}/10` : ""}</p> : null}</div></li>)}</ul></div>;
}

export function TetanyList({ title, entries }: { title: string; entries: (TetanyEpisode & { dateKey: string })[] }) {
  const { t } = useI18n();
  if (!entries.length) return <p className="text-xs text-muted-foreground">{t("No tetany episodes yet.")}</p>;
  return <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(title)}</p><ul className="space-y-2">{entries.map((episode) => <li key={`${episode.dateKey}-${episode.id}`} className="rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25"><p className="text-xs text-muted-foreground">{episode.dateKey} · {episode.time} · {t("intensity")} {episode.intensity}/5 · {episode.minutes == null ? t("ongoing") : `${episode.minutes} min`}</p>{episode.types?.length ? <p>{episode.types.join(", ")}</p> : null}{episode.location?.length ? <p className="text-xs text-muted-foreground">{t("Location")}: {episode.location.map(t).join(", ")}</p> : null}{episode.triggers?.length ? <p className="text-xs text-muted-foreground">{t("Triggers")}: {episode.triggers.map(t).join(", ")}</p> : null}{episode.helped?.length ? <p className="text-xs text-muted-foreground">{t("Helped by")}: {episode.helped.map(t).join(", ")}</p> : null}</li>)}</ul></div>;
}

export function PanicList({ title, entries }: { title: string; entries: (PanicAttack & { dateKey: string })[] }) {
  const { t } = useI18n();
  if (!entries.length) return <p className="text-xs text-muted-foreground">{t("No panic attacks yet.")}</p>;
  return <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(title)}</p><ul className="space-y-2">{entries.map((attack) => <li key={`${attack.dateKey}-${attack.id}`} className="rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25"><p className="text-xs text-muted-foreground">{attack.dateKey} · {attack.time} · {t("intensity")} {attack.intensity}/10 · {attack.minutes == null ? t("ongoing") : `${attack.minutes} min`}</p>{attack.physical?.length ? <p className="text-xs text-muted-foreground">{t("Physical")}: {attack.physical.map(t).join(", ")}</p> : null}{attack.cognitive?.length ? <p className="text-xs text-muted-foreground">{t("Cognitive")}: {attack.cognitive.map(t).join(", ")}</p> : null}{attack.trigger ? <p className="text-xs text-muted-foreground">{t("Trigger")}: {attack.trigger}</p> : null}{attack.helped?.length ? <p className="text-xs text-muted-foreground">{t("Helped by")}: {attack.helped.map(t).join(", ")}</p> : null}</li>)}</ul></div>;
}

export function MedsList({ title, days }: { title: string; days: { dateKey: string; meds: Med[]; medLog: Record<string, boolean>; extra: ExtraMed[] }[] }) {
  const { t } = useI18n();
  const nonEmpty = days.filter((day) => day.extra.length || day.meds.some((med) => !med.asNeeded && med.times.some((time) => day.medLog[`${med.id}@${time}`])));
  if (!nonEmpty.length) return <p className="text-xs text-muted-foreground">{t("No medication logged yet.")}</p>;
  return <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(title)}</p><ul className="space-y-2">{nonEmpty.slice(0, 14).map((day) => <li key={day.dateKey} className="rounded-2xl bg-surface-sunken/32 p-3 text-sm ring-1 ring-border/25"><p className="mb-1 text-xs text-muted-foreground">{day.dateKey}</p>{day.meds.map((med) => med.asNeeded ? null : med.times.filter((time) => day.medLog[`${med.id}@${time}`]).map((time) => <p key={`${med.id}@${time}`}><span className="inline-flex items-center gap-1"><TaskIcon size={14} />{time} — {med.name}</span>{med.dose ? ` (${med.dose})` : ""}</p>))}{day.extra.map((extra) => <p key={extra.id}>• {extra.time} — {extra.name}{extra.dose ? ` (${extra.dose})` : ""}</p>)}</li>)}</ul></div>;
}

export function CurrentAndHistory({ title, currentLabel, currentContent, historyCount, historyContent }: { title: string; currentLabel: string; currentContent: ReactNode; historyCount: number; historyContent: ReactNode }) {
  const { t } = useI18n();
  return <section className="rounded-2xl bg-surface-sunken/34 p-3 ring-1 ring-border/32"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-foreground">{t(title)}</h3><span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/40">{currentLabel}</span></div><div className="mt-3">{currentContent}</div>{historyCount > 0 ? <details className="mt-3 rounded-2xl bg-surface/75 p-3 ring-1 ring-border/40"><summary className="cursor-pointer text-xs font-semibold text-foreground">{t("Show earlier entries")} ({historyCount})</summary><div className="mt-3">{historyContent}</div></details> : null}</section>;
}

export const CoupleOverviewIcons = { ProfileIcon, HeartIcon, PanicIcon, BoltIcon, SparkleIcon };
