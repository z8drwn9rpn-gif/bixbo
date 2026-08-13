import { createFileRoute, Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Share2, Trash2 } from "@/components/icons/BixboIcons";

import { layoutOrder } from "@/lib/layoutRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { customLogDefinitions, type RegistryFieldDefinition } from "@/lib/appRegistry";
import {
  BlueberryIcon,
  ClockIcon,
  FlameIcon,
  HeartIcon,
  Ico,
  IcoText,
  NoteIcon,
  PanicIcon,
  PillIcon,
  PoopIcon,
  StarIcon,
} from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import { pregnancyProgress, postpartumProgress } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { MonthCalendar, monthLabel } from "@/components/MonthCalendar";
import { LogSheet } from "@/components/LogSheet";
import { QuickTags } from "@/components/QuickTags";
import { useI18n } from "@/hooks/useI18n";
import {
  useBixbo,
  EMPTY,
  addDays,
  toKey,
  fromKey,
  todayKey,
  PAIN_DESCRIPTIONS,
  painColor,
  medScheduleItems,
  avgDayPain,
  latestDayWeight,
  averageDayTemperature,
  BRISTOL,
  nextPredictedPeriod,
  asArr,
  isCycleTrackingHidden,
  isPregnancyActive,
  isPostpartumActive,
  isIntercourseKind,
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


import { VitalTrendPopup, averageNumbers, daysBetweenInclusive, type VitalTrendMetric } from "@/components/home/vitalTrends";
import { VitalTile, MedsProgress } from "@/components/home/HomeTiles";
import { BirthControlSummaryCard, BirthControlOverlay } from "@/components/home/BirthControlCard";
import { DayPreview, ShareDayButton } from "@/components/home/DayOverview";
import { TodayHeaderSummary } from "@/components/home/TodayHeaderSummary";

function HomePage() {
  const { t, language } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const maleMode = String(view.settings.gender ?? "").trim().toLowerCase() === "male";

  /*
   * Dátum vytvárame až v prehliadači.
   * Server aj prvý klientsky render preto dostanú rovnaký obsah
   * a nevznikne hydration mismatch.
   */
  const [monthAnchor, setMonthAnchor] = useState<Date | null>(null);
  const [selected, setSelected] = useState("");

  const [hakOpen, setHakOpen] = useState(false);
  const [hakAnchor, setHakAnchor] = useState<Date | null>(null);

  const [logOpen, setLogOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"today" | "month">("today");
  const [summaryMonthAnchor, setSummaryMonthAnchor] = useState<Date | null>(null);
  const [vitalTrendOpen, setVitalTrendOpen] = useState<VitalTrendMetric | null>(null);
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

  // Male mode must never expose the HAK tracker. If gender is changed while
  // the HAK detail is open, close it immediately as well.
  useEffect(() => {
    if (maleMode) {
      setHakOpen(false);
      setHakAnchor(null);
    }
  }, [maleMode]);

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

  const moveCalendarMonth = (delta: number) => {
    const currentSelected = fromKey(selected);
    const selectedDayOfMonth = currentSelected.getDate();

    const targetMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + delta, 1);
    const lastDayOfTargetMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
    ).getDate();
    const targetDay = Math.min(selectedDayOfMonth, lastDayOfTargetMonth);
    const nextSelected = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), targetDay);

    setMonthAnchor(targetMonth);
    setSelected(toKey(nextSelected));
  };

  const goToPrevMonth = () => moveCalendarMonth(-1);
  const goToNextMonth = () => moveCalendarMonth(1);

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

  const todayDateKey = todayKey();
  const todayLog = view.dayLogs[todayDateKey];
  const todayPain = avgDayPain(todayLog);
  const todayScheduled = view.meds
    .filter((med) => !med.asNeeded)
    .flatMap((med) => med.times.map((time) => `${med.id}@${time}`));
  const todayMedsTaken = todayScheduled.filter((key) => view.medLog[todayDateKey]?.[key]).length;

  return (
    <AppShell
      big
      title={
        <div className="flex flex-col leading-tight">
          <span>BIXBO</span>

          <span className="text-xs font-normal text-muted-foreground">
            {t("Hi")}, {view.settings.userName?.trim() || t("there")} <Ico e="❤️" size={12} />
          </span>
        </div>
      }
      right={
        <div className="flex items-center gap-1">
          <TodayHeaderSummary
            data={view}
            onOpen={() => {
              setSummaryMode("today");
              setSummaryMonthAnchor(new Date());
              setTodayOpen(true);
            }}
          />

          <Link
            to="/profile"
            className="flex min-w-[52px] flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-primary transition hover:bg-tint"
            aria-label={t("Health")}
            title={t("Health")}
          >
            <HeartIcon size={24} />
            <span className="mt-0.5 text-[10px] font-semibold leading-none">{t("Health")}</span>
          </Link>
        </div>
      }
    >
      <div className="lg:mx-auto lg:grid lg:w-full lg:max-w-[1480px] lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.95fr)] lg:items-start lg:gap-4 lg:px-0 xl:grid-cols-[minmax(0,1.72fr)_minmax(380px,1fr)] xl:gap-5">
        <div className="flex min-w-0 flex-col">
      <div style={{ order: layoutOrder(view, "home", "calendar", 10) }}>
      <div className="px-5 pt-0.5 lg:px-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevMonth}
            aria-label={t("Previous month")}
            className="rounded-full p-1.5 hover:bg-tint"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h2 className="font-serif text-xl font-bold lg:text-[22px]" suppressHydrationWarning>
            {hydrated ? monthLabel(monthAnchor) : ""}
          </h2>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label={t("Next month")}
            className="rounded-full p-1.5 hover:bg-tint"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-1 lg:order-1 lg:overflow-hidden lg:rounded-[1.75rem] lg:bg-surface/28 lg:px-1 lg:pb-1 lg:ring-1 lg:ring-border/35" style={{ "--period-medium": "#7467D8" } as any}>
        {hydrated ? (
          <MonthCalendar
            month={monthAnchor}
            data={view}
            selected={selected}
            onSelect={setSelected}
            onSwipeMonth={(delta) => {
              moveCalendarMonth(delta);
            }}
          />
        ) : (
          <div className="h-[360px]" />
        )}
      </div>
      </div>

      {!maleMode && isAdminOwnerAccount() && (
        <div style={{ order: layoutOrder(view, "home", "birthControl", 20) }}>
        <BirthControlSummaryCard
          data={view}
          dateKey={selected}
          onOpen={() => {
            setHakAnchor(fromKey(selected));
            setHakOpen(true);
          }}
        />
        </div>
      )}

      {(() => {
        if (!pregnancyActive) return null;

        const prog = pregnancyProgress(view.pregnancy);

        return (
          <Link
            to={"/pregnancy" as never}
            className="focus-ring mx-5 mt-3 block rounded-3xl bg-tint px-4 py-4 text-left ring-1 ring-border transition hover:bg-surface lg:mx-0"
            style={{ order: layoutOrder(view, "home", "pregnancy", 30) }}
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

              <span className="shrink-0 text-xs font-semibold text-primary">{t("Open")}</span>
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
                <span>{t("Nothing logged today")}</span>
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
              className="focus-ring mx-5 mt-3 block rounded-3xl bg-primary/10 px-4 py-4 text-left ring-1 ring-primary/20 lg:mx-0"
              style={{ order: layoutOrder(view, "home", "postpartum", 40) }}
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

                <span className="shrink-0 text-xs font-semibold text-primary">{t("Open")}</span>
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
                  <span>{t("Nothing logged today")}</span>
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
            fromKey(k).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
              day: "numeric",
              month: "short",
            });

          return (
            <div
              className="mx-5 mt-3 rounded-full px-4 py-2 text-center text-xs ring-1 lg:mx-1"
              style={{ order: layoutOrder(view, "home", "nextPeriod", 50),
                background: "color-mix(in srgb, #5F7033 14%, transparent)",
                color: "#5F7033",
                boxShadow: "inset 0 0 0 1px color-mix(in srgb, #5F7033 34%, transparent)",
              }}
            >
              {t("Next period predicted:")}{" "}
              <span className="font-semibold">
                {fmt(p.start)} – {fmt(p.end)}
              </span>
            </div>
          );
        })()}

      {/* Top vitals row */}
      <div className="mt-3 grid grid-cols-5 gap-2 px-5 lg:grid-cols-4 lg:px-1" style={{ order: layoutOrder(view, "home", "vitals", 60) }}>
        <div className="col-span-2 lg:col-span-1">
          <MedsProgress
            data={view}
            onClick={() => {
              setQuickCat("meds");
              setEditPain(undefined);
              setEditEntry(undefined);
              setLogOpen(true);
            }}
          />
        </div>

        <VitalTile
          emoji="😴"
          label="Sleep"
          value={view.dayLogs[selected]?.sleepHours != null ? String(view.dayLogs[selected]!.sleepHours) : "—"}
          onClick={() => setVitalTrendOpen("sleep")}
        />

        <VitalTile
          emoji="🌡️"
          label="Temp"
          value={view.dayLogs[selected]?.temperature != null ? String(view.dayLogs[selected]!.temperature) : "—"}
          onClick={() => setVitalTrendOpen("temperature")}
        />

        <VitalTile
          emoji="⚖️"
          label="Weight"
          value={view.dayLogs[selected]?.weight != null ? String(view.dayLogs[selected]!.weight) : "—"}
          onClick={() => setVitalTrendOpen("weight")}
        />
      </div>

      {/* Quick log */}
      <div style={{ order: layoutOrder(view, "home", "quickLog", 70) }} className="px-5 lg:mt-2 lg:px-1 [&_p.text-\[11px\].uppercase]:min-w-0 [&_p.text-\[11px\].uppercase]:flex-1 [&_p.text-\[11px\].uppercase]:truncate [&_p.text-\[11px\].uppercase]:text-[10px] [&_.mt-1.flex.flex-wrap.gap-1]:hidden">
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

        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-[1.75rem] lg:bg-surface/45 lg:p-4 lg:ring-1 lg:ring-border/55 xl:p-5">
      <div className="mt-4 flex items-center justify-between px-5 lg:mt-0 lg:px-0">
        <h2 className="font-serif text-xl font-bold">
          {selected === todayKey()
            ? t("Today")
            : fromKey(selected).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
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
        </aside>
      </div>


      {vitalTrendOpen && (
        <VitalTrendPopup
          metric={vitalTrendOpen}
          data={view}
          anchorKey={selected}
          onClose={() => setVitalTrendOpen(null)}
        />
      )}

      {todayOpen &&
        (() => {
          const todayTetany = todayLog?.tetany?.length ?? 0;
          const todayPanic = todayLog?.panic?.length ?? 0;
          const todayBowelEntries = todayLog?.bowel ?? [];
          const noteValue = view.dayNotes[todayDateKey]?.[0];
          const noteText =
            typeof noteValue === "string"
              ? noteValue
              : noteValue && typeof noteValue === "object" && "text" in noteValue
                ? String(noteValue.text)
                : "";

          const todayRows = [
            {
              key: "pain",
              icon: <FlameIcon size={22} />,
              label: "Pain",
              value: todayPain != null ? `${todayPain.toFixed(1)} / 10` : t("No pain logged"),
            },
            {
              key: "meds",
              icon: <PillIcon size={22} />,
              label: "Medication",
              value: `${todayMedsTaken} ${t("of")} ${todayScheduled.length} ${t("taken")}`,
            },
            {
              key: "sleep",
              icon: <ClockIcon size={22} />,
              label: "Sleep",
              value: todayLog?.sleepHours != null ? `${todayLog.sleepHours} h` : t("Not logged"),
            },
            {
              key: "tetany",
              icon: <Ico e="⭐️" size={22} />,
              label: "Tetany episode",
              value: todayTetany ? `${todayTetany} ${todayTetany === 1 ? t("episode") : t("episodes")}` : t("None"),
            },
            {
              key: "panic",
              icon: <Ico e="✨" size={22} />,
              label: "Panic episode",
              value: todayPanic ? `${todayPanic}` : t("None"),
            },
            {
              key: "bowel",
              icon: <PoopIcon size={22} />,
              label: "Bowel",
              value: todayBowelEntries.length
                ? `${todayBowelEntries.length} ${todayBowelEntries.length === 1 ? t("entry") : t("entries")}`
                : t("None"),
            },
            {
              key: "hotFlashes",
              icon: <Ico e="🥵" size={22} />,
              label: "Hot flashes",
              value: (() => {
                const entries = todayLog?.pain?.filter((entry) => (entry.hotFlashes ?? 0) > 0) ?? [];
                return entries.length ? `${entries.length} ${entries.length === 1 ? t("entry") : t("entries")}` : t("None");
              })(),
            },
            {
              key: "headache",
              icon: <Ico e="🤕" size={22} />,
              label: "Headache",
              value: (() => {
                const entries =
                  todayLog?.pain?.filter(
                    (entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0,
                  ) ?? [];
                return entries.length ? `${entries.length} ${entries.length === 1 ? t("entry") : t("entries")}` : t("None");
              })(),
            },
          ];

          const activeMonth = summaryMonthAnchor ?? fromKey(todayDateKey);
          const monthStart = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
          const monthEnd = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0);
          const monthKeys = daysBetweenInclusive(monthStart, monthEnd);
          const monthLogs = monthKeys.map((key) => ({ key, log: view.dayLogs[key] })).filter((item) => !!item.log);
          const loggedDays = monthLogs.length;

          const monthPainValues = monthLogs
            .map(({ log }) => avgDayPain(log))
            .filter((value): value is number => value != null && Number.isFinite(value));
          const monthPainAvg = averageNumbers(monthPainValues);

          const monthTetany = monthLogs.reduce((sum, { log }) => sum + (log?.tetany?.length ?? 0), 0);
          const monthPanic = monthLogs.reduce((sum, { log }) => sum + (log?.panic?.length ?? 0), 0);

          const monthBowelCount = monthLogs.reduce((sum, { log }) => sum + (log?.bowel?.length ?? 0), 0);

          const monthHotFlashDays = monthLogs.filter(({ log }) =>
            (log?.pain ?? []).some((entry) => (entry.hotFlashes ?? 0) > 0),
          ).length;

          const monthHeadacheDays = monthLogs.filter(({ log }) =>
            (log?.pain ?? []).some(
              (entry) => entry.headacheIntensity != null || (entry.headacheTypes?.length ?? 0) > 0,
            ),
          ).length;

          const periodDays = monthLogs
            .filter(({ log }) => !!(log?.periodInfo?.level ?? log?.period))
            .map(({ key, log }) => ({ key, level: log?.periodInfo?.level ?? log?.period }));

          const periodStart = periodDays[0]?.key;
          const periodEnd = periodDays[periodDays.length - 1]?.key;
          const monthPeriodLabel =
            periodStart && periodEnd
              ? `${fromKey(periodStart).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}${
                  periodEnd !== periodStart
                    ? ` – ${fromKey(periodEnd).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { day: "numeric", month: "short" })}`
                    : ""
                } · ${periodDays.length} day${periodDays.length === 1 ? "" : "s"}`
              : t("Not logged");

          const monthSex = monthLogs.reduce(
            (sum, { log }) => sum + (log?.sex?.filter((entry) => isIntercourseKind(entry.kind)).length ?? 0),
            0,
          );

          const monthSleepValues = monthLogs
            .map(({ log }) => log?.sleepHours ?? log?.pregnancy?.sleepHours ?? log?.postpartum?.sleepHours)
            .filter((value): value is number => value != null && Number.isFinite(value));
          const monthSleepAvg = averageNumbers(monthSleepValues);

          const summaryNow = new Date();
          const summaryTodayKey = toKey(summaryNow);
          const summaryNowMinutes = summaryNow.getHours() * 60 + summaryNow.getMinutes();

          let monthScheduledTotal = 0;
          let monthMedsTaken = 0;

          monthKeys.forEach((dateKey) => {
            todayScheduled.forEach((medKey) => {
              const atIndex = medKey.lastIndexOf("@");
              const time = atIndex >= 0 ? medKey.slice(atIndex + 1) : "";
              const isTaken = !!view.medLog[dateKey]?.[medKey];

              // Never count future dates.
              if (dateKey > summaryTodayKey) return;

              // Today counts only doses whose scheduled time already passed,
              // unless the dose was already marked taken.
              if (dateKey === summaryTodayKey && !isTaken) {
                const match = /^(\d{1,2}):(\d{2})/.exec(time);
                if (!match) return;

                const scheduledMinutes = Number(match[1]) * 60 + Number(match[2]);
                if (scheduledMinutes > summaryNowMinutes) return;
              }

              monthScheduledTotal += 1;
              if (isTaken) monthMedsTaken += 1;
            });
          });

          const monthMedsPct =
            monthScheduledTotal > 0 ? Math.round((monthMedsTaken / monthScheduledTotal) * 100) : undefined;

          const monthRows = [
            {
              key: "pain",
              icon: <FlameIcon size={22} />,
              label: "Pain",
              value: monthPainAvg != null ? `${monthPainAvg.toFixed(1)} / 10 ${t("avg")}` : t("No pain logged"),
            },
            {
              key: "meds",
              icon: <PillIcon size={22} />,
              label: "Medication",
              value: monthMedsPct != null ? `${monthMedsPct}% ${t("taken")}` : t("No schedule"),
            },
            {
              key: "sleep",
              icon: <ClockIcon size={22} />,
              label: "Sleep",
              value: monthSleepAvg != null ? `${monthSleepAvg.toFixed(1)} h ${t("avg")}` : t("Not logged"),
            },
            {
              key: "tetany",
              icon: <Ico e="⭐️" size={22} />,
              label: "Tetany",
              value: `${monthTetany} ${monthTetany === 1 ? t("episode") : t("episodes")}`,
            },
            {
              key: "panic",
              icon: <Ico e="✨" size={22} />,
              label: "Panic",
              value: `${monthPanic} ${monthPanic === 1 ? t("episode") : t("episodes")}`,
            },
            {
              key: "bowel",
              icon: <PoopIcon size={22} />,
              label: "Bowel",
              value: monthBowelCount
                ? `${monthBowelCount} ${monthBowelCount === 1 ? t("entry") : t("entries")}`
                : t("None"),
            },
            {
              key: "sex",
              icon: <HeartIcon size={22} />,
              label: "ŠukŠuk",
              value: `${monthSex}× ${t("this month")}`,
            },
            {
              key: "hotFlashes",
              icon: <Ico e="🥵" size={22} />,
              label: "Hot flashes",
              value: monthHotFlashDays
                ? `${monthHotFlashDays} ${monthHotFlashDays === 1 ? t("day") : t("days")}`
                : t("None"),
            },
            {
              key: "headache",
              icon: <Ico e="🤕" size={22} />,
              label: "Headache",
              value: monthHeadacheDays
                ? `${monthHeadacheDays} ${monthHeadacheDays === 1 ? t("day") : t("days")}`
                : t("None"),
            },
            {
              key: "period",
              icon: <Ico e="🩸" size={22} />,
              label: "Period",
              value: monthPeriodLabel,
            },
          ];

          const rows = summaryMode === "today" ? todayRows : monthRows;

          const shiftSummaryMonth = (delta: -1 | 1) => {
            setSummaryMonthAnchor((current) => {
              const base = current ?? fromKey(todayDateKey);
              return new Date(base.getFullYear(), base.getMonth() + delta, 1);
            });
          };

          return (
            <div className="fixed inset-0 z-[90] flex items-center justify-center px-7">
              <button
                type="button"
                aria-label={t("Close summary")}
                className="absolute inset-0 bg-black/35"
                onClick={() => setTodayOpen(false)}
              />

              <section className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-[1.65rem] bg-background shadow-2xl ring-1 ring-border">
                <div className="border-b border-border/70 px-4 pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex rounded-xl bg-tint p-0.5 ring-1 ring-border/50">
                        <button
                          type="button"
                          onClick={() => setSummaryMode("today")}
                          className={`rounded-[10px] px-3 py-1 text-[10px] font-semibold transition ${
                            summaryMode === "today"
                              ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t("Today")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSummaryMode("month");
                            setSummaryMonthAnchor((current) => current ?? fromKey(todayDateKey));
                          }}
                          className={`rounded-[10px] px-3 py-1 text-[10px] font-semibold transition ${
                            summaryMode === "month"
                              ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t("Month")}
                        </button>
                      </div>

                      {summaryMode === "today" ? (
                        <h2 className="mt-2 font-serif text-lg font-bold text-foreground">
                          {fromKey(todayDateKey).toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </h2>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => shiftSummaryMonth(-1)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border"
                            aria-label={t("Previous month")}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>

                          <div className="min-w-0 flex-1 text-center">
                            <h2 className="font-serif text-lg font-bold text-foreground">
                              {activeMonth.toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", { month: "long", year: "numeric" })}
                            </h2>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {loggedDays} / {monthKeys.length} {t("days logged")}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => shiftSummaryMonth(1)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border"
                            aria-label={t("Next month")}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setTodayOpen(false)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-xs font-bold text-foreground ring-1 ring-border"
                      aria-label={t("Close")}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="max-h-[48dvh] overflow-y-auto overscroll-contain touch-pan-y p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {rows.map((row) => (
                      <div key={row.key} className="min-w-0 rounded-2xl bg-tint px-2.5 py-2.5 ring-1 ring-border/50">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center">{row.icon}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-medium text-muted-foreground">
                              {t(row.label)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-foreground">
                              {row.value}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {summaryMode === "today" && noteText && (
                    <div className="mt-2 flex items-start gap-2 rounded-2xl bg-tint px-3 py-2.5 ring-1 ring-border/50">
                      <span className="grid h-8 w-8 shrink-0 place-items-center">
                        <NoteIcon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-medium text-muted-foreground">{t("Note")}</span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-foreground">{noteText}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/70 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (summaryMode === "today") {
                        setSelected(todayDateKey);
                        setMonthAnchor(fromKey(todayDateKey));
                      } else {
                        const key = toKey(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1));
                        setSelected(key);
                        setMonthAnchor(new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1));
                      }
                      setTodayOpen(false);
                    }}
                    className="min-h-10 w-full rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    {summaryMode === "today" ? t("Open today on calendar") : t("Open month on calendar")}
                  </button>
                </div>
              </section>
            </div>
          );
        })()}

      {!maleMode && isAdminOwnerAccount() && hakOpen && hakAnchor && (
        <BirthControlOverlay
          data={view}
          anchor={hakAnchor}
          onAnchorChange={setHakAnchor}
          onClose={() => setHakOpen(false)}
        />
      )}

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


