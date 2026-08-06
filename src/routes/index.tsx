import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Settings as SettingsIcon, Share2, Trash2, UserRound } from "lucide-react";

import { Ico, IcoText, PillIcon } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import {
  useBixbo,
  EMPTY,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  type BixboData,
  type BowelEntry,
  type SexEntry,
} from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Calendar & daily overview" },
      {
        name: "description",
        content: "Track pain, panic attacks, cycle, meds, food and more — all on one calm calendar.",
      },
      { property: "og:title", content: "BIXBO — Calendar & daily overview" },
      { property: "og:description", content: "Track pain, panic attacks, cycle, meds, food and more." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;

  /*
   * Dátum vytvárame až v prehliadači.
   * Server aj prvý klientsky render preto dostanú rovnaký obsah
   * a nevznikne hydration mismatch.
   */
  const [monthAnchor, setMonthAnchor] = useState<Date | null>(null);
  const [selected, setSelected] = useState("");

  const [logOpen, setLogOpen] = useState(false);
  const [quickCat, setQuickCat] = useState<string | undefined>();
  const [editPain, setEditPain] = useState<import("@/lib/storage").PainEntry | undefined>();
  const [editEntry, setEditEntry] = useState<unknown>(undefined);

  const openEdit = (cat: string, entry: unknown) => {
    setQuickCat(cat);
    setEditEntry(entry);
    setEditPain(undefined);
    setLogOpen(true);
  };

  /*
   * Inicializácia dátumu musí byť v effecte, pretože new Date()
   * na serveri a v prehliadači môže vytvoriť odlišný render.
   */
  useEffect(() => {
    setMonthAnchor(new Date());
    setSelected(todayKey());
  }, []);

  // Listen for "open log" from bottom nav
  useEffect(() => {
    const h = () => {
      setQuickCat(undefined);
      setEditPain(undefined);
      setEditEntry(undefined);
      setLogOpen(true);
    };

    window.addEventListener("bixbo:open-log", h);

    return () => {
      window.removeEventListener("bixbo:open-log", h);
    };
  }, []);

  /*
   * Tento return musí byť až po všetkých useEffect/useState hookoch.
   * Hooky nesmú byť pod podmieneným returnom.
   */
  if (!monthAnchor || !selected) {
    return <div className="h-[360px]" />;
  }

  const goToPrevMonth = () => {
    setMonthAnchor((current) => new Date(current!.getFullYear(), current!.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setMonthAnchor((current) => new Date(current!.getFullYear(), current!.getMonth() + 1, 1));
  };

  const pregnancyActive = isPregnancyActive(view);
  const postpartumActive = isPostpartumActive(view);
  const cycleTrackingHidden = isCycleTrackingHidden(view);

  const pregnancyToday = view.dayLogs[todayKey()]?.pregnancy;
  const latestPregnancyBP =
    pregnancyToday?.bloodPressure?.[Math.max(0, (pregnancyToday.bloodPressure?.length ?? 1) - 1)];

  const totalPregnancyKicks = (pregnancyToday?.kicks ?? []).reduce((sum, session) => sum + (session.count ?? 0), 0);

  const pregnancySummaryItems = [
    pregnancyToday?.weightKg != null ? { icon: "⚖️", label: `${pregnancyToday.weightKg} kg` } : null,
    (pregnancyToday?.symptoms?.length ?? 0) > 0
      ? { icon: "🤢", label: `${pregnancyToday!.symptoms!.length} symptoms` }
      : null,
    (pregnancyToday?.kicks?.length ?? 0) > 0
      ? {
          icon: "👣",
          label: totalPregnancyKicks > 0 ? `${totalPregnancyKicks} kicks` : `${pregnancyToday!.kicks!.length} sessions`,
        }
      : null,
    latestPregnancyBP ? { icon: "❤️", label: `${latestPregnancyBP.systolic}/${latestPregnancyBP.diastolic}` } : null,
    (pregnancyToday?.waterMl ?? 0) > 0 ? { icon: "💧", label: `${pregnancyToday!.waterMl} ml` } : null,
  ].filter((item): item is { icon: string; label: string } => item != null);

  return (
    <AppShell
      big
      title={
        <div className="flex flex-col leading-tight">
          <span>BIXBO</span>

          <span className="text-xs font-normal text-muted-foreground">
            Hi, {view.settings.userName?.trim() || "there"} <Ico e="❤️" size={12} />
          </span>
        </div>
      }
      right={
        <div className="flex items-center gap-1">
          <Link
            to="/profile"
            className="rounded-full p-2 transition hover:bg-tint"
            aria-label="Health profile"
            title="Health profile"
          >
            <UserRound className="h-5 w-5" />
          </Link>

          <Link
            to="/settings"
            className="rounded-full p-2 transition hover:bg-tint"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>
      }
    >
      <div className="px-5 pt-0.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="rounded-full p-1.5 hover:bg-tint"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h2 className="font-serif text-xl font-bold" suppressHydrationWarning>
            {hydrated ? monthLabel(monthAnchor) : ""}
          </h2>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="rounded-full p-1.5 hover:bg-tint"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-0.5">
        {hydrated ? (
          <MonthCalendar
            month={monthAnchor}
            data={view}
            selected={selected}
            onSelect={setSelected}
            onSwipeMonth={(delta) => {
              setMonthAnchor((current) => new Date(current!.getFullYear(), current!.getMonth() + delta, 1));
            }}
          />
        ) : (
          <div className="h-[360px]" />
        )}
      </div>

      {(() => {
        if (!pregnancyActive) return null;

        const prog = pregnancyProgress(view.pregnancy);

        return (
          <Link
            to={"/pregnancy" as never}
            className="focus-ring mx-5 mt-3 block rounded-3xl bg-tint px-4 py-4 text-left ring-1 ring-border transition hover:bg-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/60">
                  <Ico name="pregnancy" size={24} />
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Pregnancy
                  </p>

                  <p className="mt-0.5 font-serif text-lg font-semibold text-foreground">
                    {prog ? `Week ${prog.week} + ${prog.dayOfWeek}` : "Pregnancy mode"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {prog
                      ? `Trimester ${prog.trimester}${prog.daysLeft != null ? ` · ${Math.max(0, prog.daysLeft)} days to go` : ""}`
                      : "Tap to set your due date"}
                  </p>
                </div>
              </div>

              <span className="shrink-0 text-xs font-semibold text-primary">Open</span>
            </div>

            {pregnancySummaryItems.length > 0 ? (
              <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-surface/75 px-3 py-2 ring-1 ring-border/40">
                {pregnancySummaryItems.slice(0, 4).map((item, index) => (
                  <span key={`${item.icon}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 && <span className="text-border">•</span>}
                    <Ico e={item.icon} size={15} />
                    <span className="truncate text-[11px] font-medium tabular-nums text-foreground">{item.label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40">
                <Ico name="pregnancy" size={15} />
                <span>Nothing logged today</span>
              </div>
            )}
          </Link>
        );
      })()}

      {postpartumActive &&
        (() => {
          const progress = postpartumProgress(view.postpartum);
          const todayPostpartum = view.dayLogs[todayKey()]?.postpartum;
          const feedingCount =
            (todayPostpartum?.breastfeeding?.length ?? 0) +
            (todayPostpartum?.pumping?.length ?? 0) +
            (todayPostpartum?.bottle?.length ?? 0);

          const postpartumSummaryItems = [
            (todayPostpartum?.symptoms?.length ?? 0) > 0
              ? { icon: "warning", label: `${todayPostpartum!.symptoms!.length} symptoms` }
              : null,
            todayPostpartum?.bleeding && todayPostpartum.bleeding !== "none"
              ? { icon: "period", label: todayPostpartum.bleeding }
              : null,
            feedingCount > 0
              ? { icon: "bottle", label: `${feedingCount} feeding${feedingCount === 1 ? "" : "s"}` }
              : null,
            todayPostpartum?.sleepHours != null
              ? { icon: "sleep", label: `${todayPostpartum.sleepHours} h sleep` }
              : null,
            (todayPostpartum?.mood?.length ?? 0) > 0 ? { icon: "mood", label: todayPostpartum!.mood![0] } : null,
          ].filter((item): item is { icon: string; label: string } => item != null);

          return (
            <Link
              to={"/postpartum" as never}
              className="focus-ring mx-5 mt-3 block rounded-3xl bg-primary/10 px-4 py-4 text-left ring-1 ring-primary/20"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/50">
                    <Ico name="baby" size={30} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {progress ? `Week ${progress.week} + ${progress.dayOfWeek} postpartum` : "Postpartum mode"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {progress ? `${progress.days} days since birth` : "Add the birth date to calculate progress"}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-xs font-semibold text-primary">Open</span>
              </div>

              {postpartumSummaryItems.length > 0 ? (
                <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-surface/75 px-3 py-2 ring-1 ring-border/40">
                  {postpartumSummaryItems.slice(0, 4).map((item, index) => (
                    <span key={`${item.icon}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
                      {index > 0 && <span className="text-border">•</span>}
                      <Ico name={item.icon as never} size={15} />
                      <span className="truncate text-[11px] font-medium capitalize tabular-nums text-foreground">
                        {item.label}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40">
                  <Ico name="baby" size={15} />
                  <span>Nothing logged today</span>
                </div>
              )}
            </Link>
          );
        })()}

      {!cycleTrackingHidden &&
        (() => {
          const p = nextPredictedPeriod(view.cycle);

          if (!p) return null;

          const fmt = (k: string) =>
            fromKey(k).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });

          return (
            <div className="mx-5 mt-3 rounded-full bg-tint px-4 py-2 text-center text-xs text-muted-foreground ring-1 ring-border">
              Next period predicted:{" "}
              <span className="font-semibold text-foreground">
                {fmt(p.start)} – {fmt(p.end)}
              </span>
            </div>
          );
        })()}

      {/* Top vitals row */}
      <div className="mt-4 grid grid-cols-5 gap-2 px-5">
        <div className="col-span-2">
          <MedsProgress data={view} />
        </div>

        <VitalTile
          emoji="😴"
          label="Sleep"
          value={view.dayLogs[selected]?.sleepHours != null ? String(view.dayLogs[selected]!.sleepHours) : "—"}
          onClick={() => {
            setQuickCat("temp");
            setEditEntry(undefined);
            setEditPain(undefined);
            setLogOpen(true);
          }}
        />

        <VitalTile
          emoji="🌡️"
          label="Temp"
          value={view.dayLogs[selected]?.temperature != null ? String(view.dayLogs[selected]!.temperature) : "—"}
          onClick={() => {
            setQuickCat("temp");
            setEditEntry(undefined);
            setEditPain(undefined);
            setLogOpen(true);
          }}
        />

        <VitalTile
          emoji="⚖️"
          label="Weight"
          value={view.dayLogs[selected]?.weight != null ? String(view.dayLogs[selected]!.weight) : "—"}
          onClick={() => {
            setQuickCat("temp");
            setEditEntry(undefined);
            setEditPain(undefined);
            setLogOpen(true);
          }}
        />
      </div>

      {/* Quick log */}
      <div className="px-5 [&_p.text-\[11px\].uppercase]:min-w-0 [&_p.text-\[11px\].uppercase]:flex-1 [&_p.text-\[11px\].uppercase]:truncate [&_p.text-\[11px\].uppercase]:text-[10px] [&_.mt-1.flex.flex-wrap.gap-1]:hidden">
        <QuickTags
          data={view}
          update={update}
          onLongPress={(cat: string) => {
            const map: Record<string, string | undefined> = {
              pain: "pain",
              tetany: "tetany",
              panic: "panic",
              sex: "sex",
              food: "food",
              period: "period",
              meds: "meds",
              workout: "workout",
              bowel: "bowel",
              thermo: "heat",
              headache: "pain",
              hotFlashes: "pain",
              sleep: "temp",
            };

            const target = map[cat];

            if (!target) return;

            setQuickCat(target);
            setEditPain(undefined);
            setEditEntry(undefined);
            setLogOpen(true);
          }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between px-5">
        <h2 className="font-serif text-xl font-bold">
          {selected === todayKey()
            ? "Today"
            : fromKey(selected).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
        </h2>

        <ShareDayButton date={selected} view={view} />
      </div>

      <DayPreview
        date={selected}
        data={view}
        update={update}
        onEditPain={(p) => {
          setEditPain(p);
          setEditEntry(undefined);
          setQuickCat("pain");
          setLogOpen(true);
        }}
        onEdit={openEdit}
      />

      <LogSheet
        open={logOpen}
        onOpenChange={(open) => {
          setLogOpen(open);

          if (!open) {
            setQuickCat(undefined);
            setEditPain(undefined);
            setEditEntry(undefined);
          }
        }}
        date={selected}
        data={view}
        update={update}
        initial={quickCat as never}
        initialPain={editPain}
        editEntry={editEntry}
      />
    </AppShell>
  );
}

function VitalTile({
  emoji,
  label,
  value,
  onClick,
}: {
  emoji: string;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-surface p-2 ring-1 ring-border hover:bg-tint"
    >
      <Ico e={emoji} size={16} />
      <span className="font-serif text-base font-bold leading-tight">{value}</span>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

function MedsProgress({ data }: { data: BixboData }) {
  const k = todayKey();
  const scheduled = data.meds.filter((m) => !m.asNeeded);
  const total = scheduled.reduce((s, m) => s + m.times.length, 0);
  const taken = scheduled.reduce((s, m) => s + m.times.filter((t) => data.medLog[k]?.[`${m.id}@${t}`]).length, 0);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface p-3 ring-1 ring-border">
      <div>
        <p className="text-xs text-muted-foreground">Meds today</p>
        <p className="font-serif text-lg font-bold">
          {taken}/{total || 0}
        </p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
        <PillIcon size={20} />
      </div>
    </div>
  );
}

/* ------------------- Day preview ------------------- */
function DayPreview({
  date,
  data,
  update,
  onEditPain,
  onEdit,
}: {
  date: string;
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onEditPain?: (p: import("@/lib/storage").PainEntry) => void;
  onEdit?: (cat: string, entry: unknown) => void;
}) {
  const log = data.dayLogs[date];
  const rawNotes = data.dayNotes[date] ?? [];
  const notes: { text: string; time?: string }[] = (rawNotes as (string | { text: string; time?: string })[]).map(
    (note) => (typeof note === "string" ? { text: note } : note),
  );

  type TimelineItem = {
    id: string;
    time: string;
    sortTime: string;
    icon: string;
    title: string;
    detail?: string;
    onClick?: () => void;
    tone?: "muted" | "danger" | "success";
  };

  const items: TimelineItem[] = [];
  const safeTime = (value?: string) => (/^\d{2}:\d{2}$/.test(value ?? "") ? value! : "23:59");

  (log?.pain ?? []).forEach((entry) => {
    items.push({
      id: `pain-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "🔥",
      title: `Pain ${Number.isInteger(entry.score) ? entry.score : entry.score.toFixed(1)}/10`,
      detail: [entry.parts?.join(", "), entry.quality?.join(", "), entry.symptoms?.join(", "), entry.note]
        .filter(Boolean)
        .join(" · "),
      onClick: () => onEditPain?.(entry),
    });
  });

  (log?.tetany ?? []).forEach((entry) =>
    items.push({
      id: `tetany-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "⚡",
      title: `Tetany ${entry.intensity}/5`,
      detail: [entry.types?.join(", "), entry.location?.join(", "), entry.note].filter(Boolean).join(" · "),
      onClick: () => onEdit?.("tetany", entry),
    }),
  );

  (log?.panic ?? []).forEach((entry) =>
    items.push({
      id: `panic-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "✨",
      title: `Panic attack ${entry.intensity}/10`,
      detail: [entry.trigger, entry.place, entry.note].filter(Boolean).join(" · "),
      onClick: () => onEdit?.("panic", entry),
    }),
  );

  (log?.bowel ?? []).forEach((entry) =>
    items.push({
      id: `bowel-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "💩",
      title: `Bowel type ${entry.bristol}`,
      detail: [entry.feelings?.join(", "), entry.symptoms?.join(", "), entry.note].filter(Boolean).join(" · "),
      onClick: () => onEdit?.("bowel", entry),
    }),
  );

  (log?.food ?? []).forEach((entry) =>
    items.push({
      id: `food-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "🍽️",
      title: entry.what || "Food",
      detail: [entry.feelings?.join(", "), entry.after].filter(Boolean).join(" · "),
      onClick: () => onEdit?.("food", entry),
    }),
  );

  (log?.sex ?? []).forEach((entry) =>
    items.push({
      id: `sex-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "❤️",
      title: "ŠukŠuk!",
      detail: entry.note,
      onClick: () => onEdit?.("sex", entry),
    }),
  );

  (log?.heat ?? []).forEach((entry) =>
    items.push({
      id: `heat-${entry.id}`,
      time: entry.start || "—",
      sortTime: safeTime(entry.start),
      icon: entry.kind === "tens" ? "⭐" : entry.kind === "cold" ? "🧊" : "♨️",
      title: entry.kind === "tens" ? "TENS" : entry.kind === "cold" ? "Cold therapy" : "Heat therapy",
      detail: `${entry.minutes} min${entry.note ? ` · ${entry.note}` : ""}`,
      onClick: () => onEdit?.("heat", entry),
    }),
  );

  (log?.workout ?? []).forEach((entry) =>
    items.push({
      id: `workout-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "🧘🏼‍♀️",
      title: entry.kind || "Workout",
      detail: `${entry.minutes} min${entry.distanceKm != null ? ` · ${entry.distanceKm} km` : ""}`,
      onClick: () => onEdit?.("workout", entry),
    }),
  );

  (log?.extraMeds ?? []).forEach((entry) =>
    items.push({
      id: `extra-med-${entry.id}`,
      time: entry.time || "—",
      sortTime: safeTime(entry.time),
      icon: "💊",
      title: entry.name,
      detail: [entry.dose, entry.note].filter(Boolean).join(" · "),
      onClick: () => onEdit?.("meds", entry),
    }),
  );

  data.meds
    .filter((med) => !med.asNeeded)
    .forEach((med) =>
      med.times.forEach((time) => {
        const key = `${med.id}@${time}`;
        const taken = Boolean(data.medLog[date]?.[key]);
        const actual = data.medLogTimes?.[date]?.[key];

        if (taken) {
          items.push({
            id: `scheduled-${key}`,
            time: actual ?? time,
            sortTime: safeTime(actual ?? time),
            icon: "💊",
            title: med.name,
            detail: `${med.dose ? `${med.dose} · ` : ""}Taken${actual && actual !== time ? ` · scheduled ${time}` : ""}`,
            tone: "success",
          });
        }
      }),
    );

  notes.forEach((note, index) =>
    items.push({
      id: `note-${index}`,
      time: note.time || "—",
      sortTime: safeTime(note.time),
      icon: "📝",
      title: "Note",
      detail: note.text,
    }),
  );

  if (log?.sleepHours != null) {
    items.push({
      id: "sleep",
      time: "—",
      sortTime: "23:58",
      icon: "😴",
      title: `Sleep ${log.sleepHours} h`,
      detail: Array.isArray(log.sleepQuality) ? log.sleepQuality.join(", ") : log.sleepQuality,
      onClick: () => onEdit?.("temp", log),
    });
  }

  if (log?.temperature != null) {
    items.push({
      id: "temperature",
      time: "—",
      sortTime: "23:57",
      icon: "🌡️",
      title: `${log.temperature} °C`,
      detail: "Body temperature",
      onClick: () => onEdit?.("temp", log),
    });
  }

  if (log?.weight != null) {
    items.push({
      id: "weight",
      time: "—",
      sortTime: "23:56",
      icon: "⚖️",
      title: `${log.weight} kg`,
      detail: "Weight",
      onClick: () => onEdit?.("temp", log),
    });
  }

  const periodLevel = log?.periodInfo?.level ?? log?.period;
  if (!isCycleTrackingHidden(data) && periodLevel) {
    items.push({
      id: "period",
      time: "—",
      sortTime: "00:00",
      icon: "🫐",
      title: `Period · ${periodLevel}`,
      detail: log?.periodInfo?.note,
      onClick: () => onEdit?.("period", log?.periodInfo),
    });
  }

  items.sort((a, b) => a.sortTime.localeCompare(b.sortTime) || a.title.localeCompare(b.title));

  if (!items.length) {
    return (
      <div className="mx-5 mt-4 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Nothing logged on this day yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Use Quick Log or the + Log button.</p>
      </div>
    );
  }

  return (
    <section className="mx-5 mt-3 pb-32">
      <div className="relative">
        <span className="absolute bottom-4 left-[4.65rem] top-4 w-px bg-border" aria-hidden />

        <div className="space-y-1">
          {items.map((item) => {
            const content = (
              <>
                <span className="w-14 shrink-0 pt-3 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                  {item.time}
                </span>

                <span className="relative z-10 mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-border">
                  <Ico e={item.icon} size={18} />
                </span>

                <span className="min-w-0 flex-1 rounded-2xl bg-surface px-3 py-2.5 text-left ring-1 ring-border">
                  <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                  {item.detail ? (
                    <span className="mt-0.5 block break-words text-xs leading-relaxed text-muted-foreground">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
              </>
            );

            return item.onClick ? (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-start gap-3 rounded-2xl py-1 transition active:scale-[0.995]"
              >
                {content}
              </button>
            ) : (
              <div key={item.id} className="flex items-start gap-3 py-1">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-4 ring-1 ring-border">
      <div className="mb-2 flex items-center gap-2">
        <Ico e={icon} size={22} />
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const stripEmoji = (value: string) =>
  value.replace(/^[\p{Extended_Pictographic}\u200d\ufe0f\p{Emoji_Modifier}]+\s*/u, "").trim();

function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const flowLabel = (level?: string | null): string => {
    switch (level) {
      case "spotting":
        return "Spotting";
      case "light":
        return "Light";
      case "medium":
        return "Medium";
      case "heavy":
        return "Heavy";
      case "very-heavy":
        return "Very heavy";
      default:
        return "";
    }
  };

  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const dateLabel = fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines: string[] = [`BIXBO — ${dateLabel}`, ""];

    if (log.pain?.length) {
      const avg = log.pain.reduce((s, p) => s + p.score, 0) / log.pain.length;
      lines.push(`Pain — avg ${avg.toFixed(1)}/10 · ${log.pain.length} entr${log.pain.length === 1 ? "y" : "ies"}`);
      for (const p of log.pain) {
        const bits = [`${p.time}`, `${p.score}/10 (${PAIN_DESCRIPTIONS[Math.round(p.score)]})`];
        if (p.parts.length) bits.push(p.parts.join(", "));
        if (p.quality.length) bits.push(`[${p.quality.join(", ")}]`);
        lines.push(`  • ${bits.join(" · ")}`);
        if (p.note) lines.push(`    "${p.note}"`);
      }
      lines.push("");
    }
    if (log.panic?.length) {
      lines.push(`Panic attacks — ${log.panic.length}`);
      for (const p of log.panic)
        lines.push(
          `  • ${p.time} · ${p.intensity}/10 · ${p.minutes == null ? "ongoing" : `${p.minutes}min`}${p.trigger ? ` — ${p.trigger}` : ""}`,
        );
      lines.push("");
    }
    if (log.tetany?.length) {
      lines.push(`Tetany — ${log.tetany.length}`);
      for (const t of log.tetany)
        lines.push(
          `  • ${t.time} · ${t.types.join(", ")} · ${t.intensity}/5 · ${t.minutes == null ? "ongoing" : `${t.minutes}min`}`,
        );
      lines.push("");
    }
    if (log.periodInfo?.level || log.period) lines.push(`Period: ${flowLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null)
      lines.push(`Sleep: ${log.sleepHours}h ${asArr(log.sleepQuality).map(stripEmoji).join(", ")}`);
    if (log.temperature != null) lines.push(`Temperature: ${log.temperature}°C`);
    if (log.weight != null) lines.push(`Weight: ${log.weight}kg`);
    if (log.food?.length) lines.push(`Food: ${log.food.length} entries`);
    if (log.workout?.length)
      lines.push(`Workout: ${log.workout.map((w) => `${stripEmoji(w.kind)} ${w.minutes}min`).join(", ")}`);

    lines.push("", "— sent from BIXBO");
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: `How I feel · ${dateLabel}`, text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch {
      alert(text);
    }
  };
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={share}>
      <Share2 className="h-3.5 w-3.5" /> Share day
    </Button>
  );
}
