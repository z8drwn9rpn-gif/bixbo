import { Link } from "@tanstack/react-router";
import { Ico } from "@/components/icons/BixboExtraIcons";
import { useI18n } from "@/hooks/useI18n";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { fromKey, isPregnancyActive, isPostpartumActive, nextPredictedPeriod, todayKey, type BixboData } from "@/lib/storage";
import { layoutOrder } from "@/lib/layoutRegistry";

export function PregnancyHomeCard({ data }: { data: BixboData }) {
  const { t } = useI18n();
  if (!isPregnancyActive(data)) return null;
  const prog = pregnancyProgress(data.pregnancy);
  const today = data.dayLogs[todayKey()]?.pregnancy;
  const latestBP = today?.bloodPressure?.[Math.max(0, (today.bloodPressure?.length ?? 1) - 1)];
  const totalKicks = (today?.kicks ?? []).reduce((sum, session) => sum + (session.count ?? 0), 0);
  const summary = [
    today?.weightKg != null ? { icon: "⚖️", label: `${today.weightKg} kg` } : null,
    (today?.symptoms?.length ?? 0) > 0 ? { icon: "🤢", label: `${today!.symptoms!.length} symptoms` } : null,
    (today?.kicks?.length ?? 0) > 0 ? { icon: "👣", label: totalKicks > 0 ? `${totalKicks} kicks` : `${today!.kicks!.length} sessions` } : null,
    latestBP ? { icon: "❤️", label: `${latestBP.systolic}/${latestBP.diastolic}` } : null,
    (today?.waterMl ?? 0) > 0 ? { icon: "💧", label: `${today!.waterMl} ml` } : null,
  ].filter((item): item is { icon: string; label: string } => item != null);

  return <Link to={"/pregnancy" as never} className="focus-ring mx-5 mt-3 block rounded-3xl bg-tint px-4 py-4 text-left ring-1 ring-border transition hover:bg-surface lg:mx-0" style={{ order: layoutOrder(data, "home", "pregnancy", 30) }}>
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/60"><Ico name="pregnancy" size={24} /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pregnancy</p><p className="mt-0.5 font-serif text-lg font-semibold text-foreground">{prog ? `Week ${prog.week} + ${prog.dayOfWeek}` : "Pregnancy mode"}</p><p className="text-xs text-muted-foreground">{prog ? `Trimester ${prog.trimester}${prog.daysLeft != null ? ` · ${Math.max(0, prog.daysLeft)} days to go` : ""}` : "Tap to set your due date"}</p></div></div><span className="shrink-0 text-xs font-semibold text-primary">{t("Open")}</span></div>
    {summary.length > 0 ? <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-surface/75 px-3 py-2 ring-1 ring-border/40">{summary.slice(0, 4).map((item, index) => <span key={`${item.icon}-${item.label}`} className="flex min-w-0 items-center gap-1.5">{index > 0 && <span className="text-border">•</span>}<Ico e={item.icon} size={15} /><span className="truncate text-[11px] font-medium tabular-nums text-foreground">{item.label}</span></span>)}</div> : <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40"><Ico name="pregnancy" size={15} /><span>{t("Nothing logged today")}</span></div>}
  </Link>;
}

export function PostpartumHomeCard({ data }: { data: BixboData }) {
  const { t } = useI18n();
  if (!isPostpartumActive(data)) return null;
  const progress = postpartumProgress(data.postpartum);
  const today = data.dayLogs[todayKey()]?.postpartum;
  const feedingCount = (today?.breastfeeding?.length ?? 0) + (today?.pumping?.length ?? 0) + (today?.bottle?.length ?? 0);
  const summary = [
    (today?.symptoms?.length ?? 0) > 0 ? { icon: "warning", label: `${today!.symptoms!.length} symptoms` } : null,
    today?.bleeding && today.bleeding !== "none" ? { icon: "period", label: today.bleeding } : null,
    feedingCount > 0 ? { icon: "bottle", label: `${feedingCount} feeding${feedingCount === 1 ? "" : "s"}` } : null,
    today?.sleepHours != null ? { icon: "sleep", label: `${today.sleepHours} h sleep` } : null,
    (today?.mood?.length ?? 0) > 0 ? { icon: "mood", label: today!.mood![0] } : null,
  ].filter((item): item is { icon: string; label: string } => item != null);

  return <Link to={"/postpartum" as never} className="focus-ring mx-5 mt-3 block rounded-3xl bg-primary/10 px-4 py-4 text-left ring-1 ring-primary/20 lg:mx-0" style={{ order: layoutOrder(data, "home", "postpartum", 40) }}>
    <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/50"><Ico name="baby" size={30} /></span><div className="min-w-0"><p className="truncate text-base font-semibold text-foreground">{progress ? `Week ${progress.week} + ${progress.dayOfWeek} postpartum` : "Postpartum mode"}</p><p className="mt-0.5 text-xs text-muted-foreground">{progress ? `${progress.days} days since birth` : "Add the birth date to calculate progress"}</p></div></div><span className="shrink-0 text-xs font-semibold text-primary">{t("Open")}</span></div>
    {summary.length > 0 ? <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-surface/75 px-3 py-2 ring-1 ring-border/40">{summary.slice(0, 4).map((item, index) => <span key={`${item.icon}-${item.label}`} className="flex min-w-0 items-center gap-1.5">{index > 0 && <span className="text-border">•</span>}<Ico name={item.icon as never} size={15} /><span className="truncate text-[11px] font-medium capitalize tabular-nums text-foreground">{item.label}</span></span>)}</div> : <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40"><Ico name="baby" size={15} /><span>{t("Nothing logged today")}</span></div>}
  </Link>;
}

export function NextPeriodHomeCard({ data }: { data: BixboData }) {
  const { t, language } = useI18n();
  const predicted = nextPredictedPeriod(data.cycle);
  if (!predicted) return null;
  const fmt = (key: string) => fromKey(key).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" });
  return <div className="mx-5 mt-3 rounded-full px-4 py-2 text-center text-xs ring-1 lg:mx-1" style={{ order: layoutOrder(data, "home", "nextPeriod", 50), background: "color-mix(in srgb, #5F7033 14%, transparent)", color: "#5F7033", boxShadow: "inset 0 0 0 1px color-mix(in srgb, #5F7033 34%, transparent)" }}>
    {t("Next period predicted:")} <span className="font-semibold">{fmt(predicted.start)} – {fmt(predicted.end)}</span>
  </div>;
}
