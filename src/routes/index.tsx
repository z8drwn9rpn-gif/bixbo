import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Settings as SettingsIcon, Share2, Trash2 } from "lucide-react";

import { Ico, IcoText, PillIcon } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
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
  pregnancyInfo,
  daysBetween,
  asArr,
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

  // Meds reminders + period notification
  useEffect(() => {
    if (!hydrated || !view.settings.notifications) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const isMale = view.settings.gender === "male";

    const int = window.setInterval(() => {
      const now = new Date();

      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      view.meds.forEach((m) => {
        if (m.asNeeded) return;

        if (m.times.includes(hhmm)) {
          const taken = view.medLog[todayKey()]?.[`${m.id}@${hhmm}`];

          if (!taken) {
            new Notification(`💊 ${m.name}`, {
              body: `Time for your ${hhmm} dose${m.dose ? ` (${m.dose})` : ""}`,
            });
          }
        }
      });

      // Period predict: 1 day before at 09:00
      if (!isMale && !view.settings.pregnantSince && hhmm === "09:00") {
        const p = nextPredictedPeriod(view.cycle);

        if (p && daysBetween(todayKey(), p.start) === 1) {
          new Notification("🫐 Period starts tomorrow", {
            body: "Get your supplies ready 💚",
          });
        }
      }
    }, 60000);

    return () => {
      window.clearInterval(int);
    };
  }, [
    hydrated,
    view.meds,
    view.medLog,
    view.cycle,
    view.settings.notifications,
    view.settings.gender,
    view.settings.pregnantSince,
  ]);

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
        <Link to="/settings" className="rounded-full p-2 hover:bg-tint" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Link>
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
        const preg = pregnancyInfo(view.settings.pregnantSince);

        if (!preg) return null;

        return (
          <div className="mx-5 mt-3 rounded-full bg-tint px-4 py-2 text-center text-xs text-muted-foreground ring-1 ring-border">
            🤰 Pregnancy · <span className="font-semibold text-foreground">Week {preg.week}</span> · Trimester{" "}
            {preg.trimester}
          </div>
        );
      })()}

      {view.settings.gender !== "male" &&
        !view.settings.pregnantSince &&
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
      <div className="[&_p.text-\[11px\].uppercase]:min-w-0 [&_p.text-\[11px\].uppercase]:flex-1 [&_p.text-\[11px\].uppercase]:truncate [&_p.text-\[11px\].uppercase]:text-[10px] [&_.mt-1.flex.flex-wrap.gap-1]:hidden">
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
    (n) => (typeof n === "string" ? { text: n } : n),
  );
  const todos = data.todos[date] ?? [];
  const events = data.events.filter((e) => date >= e.startDate && date <= e.endDate);
  const tasks = data.tasks.filter((t) => date >= t.startDate && date <= t.endDate);

  const k = todayKey();
  const isToday = date === k;
  const nowHHMM = new Date().toTimeString().slice(0, 5);
  const meds = data.meds;
  const scheduled = data.meds
    .filter((m) => !m.asNeeded)
    .flatMap((m) =>
      m.times.map((t) => ({ key: `${m.id}@${t}`, med: m, time: t, taken: !!data.medLog[date]?.[`${m.id}@${t}`] })),
    );
  const takenList = scheduled.filter((x) => x.taken);
  const missedList = scheduled.filter((x) => !x.taken && (date < k || (date === k && x.time < nowHHMM)));
  const extraMeds = log?.extraMeds ?? [];
  const isMale = data.settings.gender === "male";
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

  const anything =
    !!(
      log &&
      (log.pain?.length ||
        log.tetany?.length ||
        log.panic?.length ||
        log.period ||
        log.periodInfo?.level ||
        log.food?.length ||
        log.bowel?.length ||
        log.sex?.length ||
        log.heat?.length ||
        log.workout?.length ||
        log.temperature != null ||
        log.weight != null ||
        log.sleepHours != null ||
        extraMeds.length)
    ) ||
    notes.length ||
    todos.length ||
    events.length ||
    tasks.length ||
    takenList.length ||
    missedList.length;

  if (!anything)
    return (
      <div className="mx-5 mt-4 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
        <p className="text-sm text-muted-foreground">Nothing logged {isToday ? "today" : "this day"} yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap the <span className="font-bold">+ Log</span> button below.
        </p>
      </div>
    );

  const markMissedTaken = (medKey: string) =>
    update((d) => ({
      ...d,
      medLog: { ...d.medLog, [date]: { ...(d.medLog[date] ?? {}), [medKey]: true } },
      medLogTimes: {
        ...(d.medLogTimes ?? {}),
        [date]: {
          ...(d.medLogTimes?.[date] ?? {}),
          [medKey]: (() => {
            const n = new Date();
            return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
          })(),
        },
      },
    }));

  return (
    <div className="space-y-3 px-5 pt-3 pb-32">
      {(takenList.length > 0 || extraMeds.length > 0 || missedList.length > 0) && (
        <Card title="Meds" icon="💊">
          <ul className="space-y-1 text-sm">
            {takenList.map((x) => {
              const actual = data.medLogTimes?.[date]?.[x.key];
              const shifted = actual && actual !== x.time;
              return (
                <li key={x.key}>
                  <button
                    onClick={() =>
                      update((d) => {
                        const day = { ...(d.medLog[date] ?? {}) };
                        delete day[x.key];
                        const times = { ...(d.medLogTimes?.[date] ?? {}) };
                        delete times[x.key];
                        return {
                          ...d,
                          medLog: { ...d.medLog, [date]: day },
                          medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times },
                        };
                      })
                    }
                    className="text-left text-green-700 hover:underline"
                    title="Tap to uncheck"
                  >
                    ✓ {actual ?? x.time} — {x.med.name}
                    {x.med.dose ? ` (${x.med.dose})` : ""}
                    {shifted && <span className="text-[10px] text-muted-foreground"> · scheduled {x.time}</span>}
                    <span className="text-[10px] text-muted-foreground"> · tap to uncheck</span>
                  </button>
                </li>
              );
            })}
            {missedList.map((x) => (
              <li key={x.key} className="flex items-start gap-2">
                <button
                  onClick={() => markMissedTaken(x.key)}
                  className="flex-1 text-left text-destructive/90"
                  title="Tap to mark taken"
                >
                  ✗ {x.time} — {x.med.name}
                  {x.med.dose ? ` (${x.med.dose})` : ""}{" "}
                  <span className="text-[10px] text-muted-foreground">· missed (tap if taken)</span>
                </button>
              </li>
            ))}
            {extraMeds.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("meds", e)} className="flex-1 text-left">
                  • {e.time} — {e.name}
                  {e.dose ? ` (${e.dose})` : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </button>
                <button
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          extraMeds: (d.dayLogs[date]?.extraMeds ?? []).filter((x) => x.id !== e.id),
                        },
                      },
                    }))
                  }
                  aria-label="Delete"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(log?.pain?.length && (
        <Card title="Pain" icon="🔥">
          <ul className="space-y-2">
            {log.pain.map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <button
                  onClick={() => onEditPain?.(p)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: painColor(p.score) }}
                  aria-label="Edit pain entry"
                >
                  {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
                </button>
                <button onClick={() => onEditPain?.(p)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs text-muted-foreground">
                    {p.time} · {PAIN_DESCRIPTIONS[Math.round(p.score)]}
                  </p>
                  {p.parts.length > 0 && <p className="text-sm">{p.parts.join(", ")}</p>}
                  {p.quality.length > 0 && <p className="text-xs text-muted-foreground">{p.quality.join(", ")}</p>}
                  {p.symptoms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + {p.symptoms.join(", ")}
                      {p.symptoms.includes("Flu") && p.fluNote ? ` (Flu: ${p.fluNote})` : ""}
                    </p>
                  )}
                  {p.pressureTypes?.length || p.pressureIntensity != null ? (
                    <p className="text-xs text-muted-foreground">
                      Pressure: {p.pressureTypes?.join(", ")}
                      {p.pressureIntensity != null
                        ? `${p.pressureTypes?.length ? " " : ""}${p.pressureIntensity}/10`
                        : ""}
                    </p>
                  ) : null}
                  {p.nausea || p.nauseaTypes?.length || p.nauseaSeverity != null ? (
                    <p className="text-xs text-muted-foreground">
                      Nausea: {p.nauseaTypes?.join(", ")}
                      {p.nauseaSeverity != null ? `${p.nauseaTypes?.length ? " " : ""}${p.nauseaSeverity}/10` : ""}
                      {p.nauseaOngoing ? " · ongoing" : p.nauseaMinutes != null ? ` · ${p.nauseaMinutes} min` : ""}
                      {p.nauseaTriggers?.length ? ` · triggers: ${p.nauseaTriggers.join(", ")}` : ""}
                      {p.nauseaSymptoms?.length ? ` · symptoms: ${p.nauseaSymptoms.join(", ")}` : ""}
                      {p.nauseaHelped?.length ? ` · relieved by: ${p.nauseaHelped.join(", ")}` : ""}
                    </p>
                  ) : null}
                  {p.hotFlashes != null && (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="🥵" size={13} /> Hot flashes intensity {p.hotFlashes}/5
                    </p>
                  )}
                  {p.headacheTypes?.length ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="🤕" size={13} /> Headache: {p.headacheTypes.join(", ")}
                      {p.headacheIntensity != null ? ` · ${p.headacheIntensity}/10` : ""}
                    </p>
                  ) : p.headacheIntensity != null ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="🤕" size={13} /> Headache intensity {p.headacheIntensity}/10
                    </p>
                  ) : null}
                  {p.headacheMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> Headache med: {p.headacheMed}
                      {p.headacheMedTime ? ` at ${p.headacheMedTime}` : ""}
                    </p>
                  ) : null}
                  {p.pcosSymptoms?.length ? (
                    <p className="text-xs text-muted-foreground">PCOS: {p.pcosSymptoms.join(", ")}</p>
                  ) : null}
                  {p.mood?.length ? (
                    <p className="text-xs text-muted-foreground">
                      Mood: <IcoText text={p.mood.join(", ")} size={13} />
                    </p>
                  ) : null}
                  {p.stress != null && <p className="text-xs text-muted-foreground">Stress {p.stress}/10</p>}
                  {p.bodyBattery != null && <p className="text-xs text-muted-foreground">Battery {p.bodyBattery}/5</p>}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          pain: (d.dayLogs[date]?.pain ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      )) ||
        null}

      {log?.panic?.length ? (
        <Card title="Panic attacks" icon="🫯">
          <ul className="space-y-2">
            {log.panic.map((p) => (
              <li key={p.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("panic", p)} className="flex-1 text-left">
                  <p className="text-sm font-medium">
                    {p.time} · intensity {p.intensity}/10 · {p.minutes == null ? "ongoing" : `${p.minutes} min`}
                  </p>
                  {p.trigger && <p className="text-xs text-muted-foreground">Trigger: {p.trigger}</p>}
                  {p.physical.length > 0 && <p className="text-xs">Physical: {p.physical.join(", ")}</p>}
                  {p.cognitive.length > 0 && <p className="text-xs">Cognitive: {p.cognitive.join(", ")}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    Hyperventilation: {p.hyperventilation}
                    {p.tetanyPresent ? " · tetany present" : ""}
                  </p>
                  {p.helped.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">Helped: {p.helped.join(", ")}</p>
                  )}
                  {p.rescueMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> Rescue: {p.rescueMed}
                    </p>
                  ) : null}
                  {p.note && <p className="mt-1 text-sm whitespace-pre-line">"{p.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          panic: (d.dayLogs[date]?.panic ?? []).filter((x) => x.id !== p.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.tetany?.length ? (
        <Card title="Tetany" icon="⚡">
          <ul className="space-y-2 text-sm">
            {log.tetany.map((t) => (
              <li key={t.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("tetany", t)} className="flex-1 text-left">
                  <p>
                    {t.time} · {t.types.join(", ") || "Tetany"} · {t.intensity}/5 ·{" "}
                    {t.minutes == null ? "ongoing" : `${t.minutes}min`}
                    {t.triggers.length ? ` — ${t.triggers.join(", ")}` : ""}
                  </p>
                  {t.location?.length ? (
                    <p className="text-xs text-muted-foreground">Location: {t.location.join(", ")}</p>
                  ) : null}
                  {t.helped?.length ? (
                    <p className="text-xs text-muted-foreground">Helped: {t.helped.join(", ")}</p>
                  ) : null}
                  {t.rescueMed ? (
                    <p className="text-xs text-muted-foreground">
                      <Ico e="💊" size={13} /> Rescue: {t.rescueMed}
                    </p>
                  ) : null}
                  {t.note && <p className="mt-1 text-sm whitespace-pre-line">"{t.note}"</p>}
                  <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          tetany: (d.dayLogs[date]?.tetany ?? []).filter((x) => x.id !== t.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!isMale &&
        !!(
          log?.period ||
          log?.periodInfo?.level ||
          log?.periodInfo?.discharge ||
          log?.periodInfo?.dischargeNote ||
          log?.periodInfo?.cramps != null ||
          log?.periodInfo?.note
        ) && (
          <Card title="Blueberry" icon="🫐">
            <button onClick={() => onEdit?.("period", undefined)} className="w-full text-left">
              {(log?.periodInfo?.level || log?.period) && (
                <p className="text-sm">Flow: {flowLabel(log?.periodInfo?.level ?? log?.period)}</p>
              )}
              {log?.periodInfo?.cramps != null && (
                <p className="text-xs" style={{ color: painColor(log.periodInfo.cramps) }}>
                  Cramp pain:{" "}
                  <span className="font-semibold">
                    {Number.isInteger(log.periodInfo.cramps) ? log.periodInfo.cramps : log.periodInfo.cramps.toFixed(1)}
                    /10
                  </span>{" "}
                  — {PAIN_DESCRIPTIONS[Math.round(log.periodInfo.cramps)]}
                </p>
              )}
              {log?.periodInfo?.discharge && (
                <p className="text-xs text-muted-foreground">
                  Discharge: {log.periodInfo.discharge}
                  {log.periodInfo.dischargeNote ? ` — ${log.periodInfo.dischargeNote}` : ""}
                </p>
              )}
              {log?.periodInfo?.note && <p className="mt-1 text-sm whitespace-pre-line">"{log.periodInfo.note}"</p>}
              <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
            </button>
          </Card>
        )}

      {log?.sex?.length ? (
        <Card title="ŠukŠuk!" icon="❤️">
          <ul className="space-y-1 text-sm">
            {log.sex.map((s: SexEntry) => (
              <li key={s.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("sex", s)} className="flex-1 text-left">
                  {s.time} · {String(s.kind).replace(/_/g, " ")}
                  {asArr(s.feelingAfter).length ? (
                    <>
                      {" "}
                      · <IcoText text={asArr(s.feelingAfter).join(", ")} size={13} />
                    </>
                  ) : (
                    ""
                  )}
                  {s.painful && s.painful !== "no" ? ` · painful ${s.painful}` : ""}
                  {s.note ? ` — ${s.note}` : ""}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: { ...d.dayLogs[date], sex: (d.dayLogs[date]?.sex ?? []).filter((x) => x.id !== s.id) },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.heat?.length ? (
        <Card title="Heat / Cold / TENS" icon="♨️">
          <ul className="space-y-1 text-sm">
            {log.heat.map((h) => (
              <li key={h.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("heat", h)} className="flex-1 text-left">
                  <Ico e={h.kind === "heat" ? "♨️" : h.kind === "cold" ? "🧊" : "⭐"} size={14} /> {h.start} ·{" "}
                  {h.ongoing ? "ongoing" : `${h.minutes ?? 0} min`}
                  {h.note ? ` — ${h.note}` : ""}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          heat: (d.dayLogs[date]?.heat ?? []).filter((x) => x.id !== h.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.food?.length ? (
        <Card title="Food" icon="🍽️">
          <ul className="space-y-1 text-sm">
            {log.food.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("food", f)} className="flex-1 text-left">
                  <div>
                    {f.time} · <IcoText text={f.what || (f.histamineFlare ? "(histamine flare)" : "—")} size={14} />
                    {f.highHistamine ? " · high histamine" : ""}
                    {f.hydrationMl != null ? ` · ${f.hydrationMl}ml` : ""}
                    {f.caffeineMg != null ? ` · ${f.caffeineMg}mg` : ""}
                    {f.alcoholDrinks != null ? ` · ${f.alcoholDrinks}` : ""}
                  </div>
                  {f.feelings.length ? (
                    <div className="text-xs text-muted-foreground">
                      Feel: <IcoText text={f.feelings.join(", ")} size={13} />
                    </div>
                  ) : null}
                  {f.symptomsAfter?.length ? (
                    <div className="text-xs text-muted-foreground">
                      After: <IcoText text={f.symptomsAfter.join(", ")} size={13} />
                    </div>
                  ) : null}
                  {f.histamineFlare ? (
                    <div className="text-xs text-destructive">
                      <Ico e="🔥" size={13} /> Histamine flare
                      {f.histamineSymptoms?.length ? `: ${f.histamineSymptoms.join(", ")}` : ""}
                    </div>
                  ) : null}
                  {f.after ? <div className="mt-1 text-sm whitespace-pre-line">"{f.after}"</div> : null}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          food: (d.dayLogs[date]?.food ?? []).filter((x) => x.id !== f.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {log?.bowel?.length ? (
        <Card title="Bowel" icon="💩">
          <ul className="space-y-1 text-sm">
            {log.bowel.map((b: BowelEntry) => {
              const bristol = b.bristol >= 0 ? BRISTOL.find((x) => x.n === b.bristol) : null;
              const label = bristol
                ? `Type ${bristol.n} — ${bristol.sub}`
                : b.bristol === 0
                  ? "Type 0 — Mystery 🌈"
                  : "No bowel movement";
              return (
                <li key={b.id} className="flex items-start gap-2">
                  <button onClick={() => onEdit?.("bowel", b)} className="flex-1 text-left">
                    {b.time} · <IcoText text={label} size={14} />
                    {b.feelings?.length ? (
                      <>
                        {" "}
                        · <IcoText text={b.feelings.join(", ")} size={13} />
                      </>
                    ) : (
                      ""
                    )}
                    {b.symptoms?.length ? (
                      <>
                        {" "}
                        · <IcoText text={b.symptoms.join(", ")} size={13} />
                      </>
                    ) : (
                      ""
                    )}
                    {b.note ? ` — ${b.note}` : ""}
                  </button>
                  <DeleteBtn
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        dayLogs: {
                          ...d.dayLogs,
                          [date]: {
                            ...d.dayLogs[date],
                            bowel: (d.dayLogs[date]?.bowel ?? []).filter((x) => x.id !== b.id),
                          },
                        },
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {log?.workout?.length ? (
        <Card title="Workout" icon="👟">
          <ul className="space-y-1 text-sm">
            {log.workout.map((w) => (
              <li key={w.id} className="flex items-start gap-2">
                <button onClick={() => onEdit?.("workout", w)} className="flex-1 text-left">
                  <span className="font-medium">
                    {w.time} · <IcoText text={w.kind} size={14} /> · {w.minutes} min
                  </span>
                  {(w.distanceKm != null || w.elevationM != null || w.rpe != null || w.magnesiumBefore) && (
                    <span className="block text-xs text-muted-foreground">
                      {[
                        w.distanceKm != null ? `${w.distanceKm} km` : null,
                        w.elevationM != null ? `↑ ${w.elevationM} m` : null,
                        w.rpe != null ? `RPE ${w.rpe}/10` : null,
                        w.magnesiumBefore ? "Mg before" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                  {w.exercises?.length ? (
                    <span className="block text-xs text-muted-foreground">
                      {w.exercises
                        .map(
                          (ex) =>
                            `${ex.name || "Exercise"}${ex.sets ? ` ${ex.sets}×${ex.reps ?? "?"}` : ""}${ex.weightKg ? ` @ ${ex.weightKg} kg` : ""}`,
                        )
                        .join(" · ")}
                    </span>
                  ) : null}
                  {w.weightKg != null && (
                    <span className="block text-xs text-muted-foreground">Weight after: {w.weightKg} kg</span>
                  )}
                  {w.triggeredSymptom && (
                    <span className="block text-xs text-muted-foreground">
                      <Ico e="⚠️" size={13} /> Triggered: {w.triggeredSymptom.label ?? w.triggeredSymptom.type}
                    </span>
                  )}
                  {asArr(w.feeling).length ? (
                    <span className="block text-xs text-muted-foreground">
                      <IcoText text={asArr(w.feeling).join(", ")} size={13} />
                    </span>
                  ) : null}
                  {w.note ? (
                    <span className="block whitespace-pre-line text-xs text-muted-foreground">{w.note}</span>
                  ) : null}
                </button>
                <DeleteBtn
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      dayLogs: {
                        ...d.dayLogs,
                        [date]: {
                          ...d.dayLogs[date],
                          workout: (d.dayLogs[date]?.workout ?? []).filter((x) => x.id !== w.id),
                        },
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(log?.temperature != null || log?.weight != null || log?.sleepHours != null || log?.sleepQuality) && (
        <Card title="Temp / Sleep / Weight" icon="🌡️">
          <button onClick={() => onEdit?.("temp", undefined)} className="w-full text-left">
            {log?.temperature != null && <p className="text-sm">Temperature: {log.temperature}°C</p>}
            {log?.weight != null && <p className="text-sm">Weight: {log.weight} kg</p>}
            {log?.sleepHours != null && (
              <p className="text-sm">
                Sleep: {log.sleepHours} h <IcoText text={asArr(log.sleepQuality).join(", ")} size={14} />
              </p>
            )}
            {asArr(log?.sleepQuality).length > 0 && log?.sleepHours == null && (
              <p className="text-sm">
                Sleep quality: <IcoText text={asArr(log.sleepQuality).join(", ")} size={14} />
              </p>
            )}
            <p className="mt-1 text-[10px] text-primary">Tap to edit</p>
          </button>
        </Card>
      )}

      {tasks.length > 0 && (
        <Card title="Tasks" icon="✅">
          <ul className="space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))
                  }
                />
                <button
                  onClick={() => onEdit?.("task", t)}
                  className={`flex-1 text-left ${t.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {t.title}
                  {t.time ? ` · ${t.time}${t.timeEnd ? `–${t.timeEnd}` : ""}` : ""}
                  {t.note ? ` — ${t.note}` : ""}
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {events.length > 0 && (
        <Card title="Events" icon="📅">
          <ul className="space-y-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                <button onClick={() => onEdit?.("event", e)} className="flex-1 text-left">
                  {e.title}
                  {e.time ? ` · ${e.time}${e.timeEnd ? `–${e.timeEnd}` : ""}` : ""}
                  {e.startDate !== e.endDate ? ` (${e.startDate}→${e.endDate})` : ""}
                  {e.note ? ` — ${e.note}` : ""}
                </button>
                <DeleteBtn onClick={() => update((d) => ({ ...d, events: d.events.filter((x) => x.id !== e.id) }))} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {notes.length > 0 && (
        <Card title="Notes" icon="📝">
          <ul className="space-y-1 text-sm">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-1">
                  {n.time ? `${n.time} · ` : ""}
                  {n.text}
                </span>
                <button
                  onClick={() =>
                    update((d) => {
                      const list = (d.dayNotes[date] ?? []) as (string | { text: string; time?: string })[];
                      const next = list.filter((_, j) => j !== i);
                      return { ...d, dayNotes: { ...d.dayNotes, [date]: next as { text: string; time?: string }[] } };
                    })
                  }
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
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

function ShareDayButton({ date, view }: { date: string; view: BixboData }) {
  const share = async () => {
    const log = view.dayLogs[date] ?? {};
    const dateLabel = fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const lines: string[] = [`🥑 BIXBO — ${dateLabel}`, ""];

    if (log.pain?.length) {
      const avg = log.pain.reduce((s, p) => s + p.score, 0) / log.pain.length;
      lines.push(`🔥 Pain — avg ${avg.toFixed(1)}/10 · ${log.pain.length} entr${log.pain.length === 1 ? "y" : "ies"}`);
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
      lines.push(`⚡ Panic attacks — ${log.panic.length}`);
      for (const p of log.panic)
        lines.push(
          `  • ${p.time} · ${p.intensity}/10 · ${p.minutes == null ? "ongoing" : `${p.minutes}min`}${p.trigger ? ` — ${p.trigger}` : ""}`,
        );
      lines.push("");
    }
    if (log.tetany?.length) {
      lines.push(`💥 Tetany — ${log.tetany.length}`);
      for (const t of log.tetany)
        lines.push(
          `  • ${t.time} · ${t.types.join(", ")} · ${t.intensity}/5 · ${t.minutes == null ? "ongoing" : `${t.minutes}min`}`,
        );
      lines.push("");
    }
    if (log.periodInfo?.level || log.period)
      lines.push(`🫐 Period: ${flowLabel(log.periodInfo?.level ?? log.period!)}`);
    if (log.sleepHours != null) lines.push(`😴 Sleep: ${log.sleepHours}h ${asArr(log.sleepQuality).join(", ")}`);
    if (log.temperature != null) lines.push(`🌡️ Temp: ${log.temperature}°C`);
    if (log.weight != null) lines.push(`⚖️ Weight: ${log.weight}kg`);
    if (log.food?.length) lines.push(`🍽️ Food: ${log.food.length} entries`);
    if (log.workout?.length)
      lines.push(`🧘 Workout: ${log.workout.map((w) => `${w.kind} ${w.minutes}min`).join(", ")}`);

    lines.push("", "— sent from BIXBO 🥑");
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
