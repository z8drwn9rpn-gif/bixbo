import { Ico } from "@/components/icons/BixboIcons";
import { POSTPARTUM_SYMPTOMS } from "@/lib/health";
import { useRef, useState } from "react";
import { Check, Plus, X, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import {
  todayKey,
  nowHHMM,
  updateDayLog,
  isCycleTrackingHidden,
  HEADACHE_TYPES,
  SLEEP_QUALITY,
  type ThermoKind,
  type BixboData,
  type DayLog,
  type CustomQuickTag,
  type QuickTagCategory,
  type PeriodLevel,
} from "@/lib/storage";

type Cat = QuickTagCategory | "period" | "postpartum";

type Tag = {
  key: string;
  emoji: string;
  label: string;
  cat: Cat;
  popup?: "period" | "postpartum";
  apply?: (l: DayLog) => DayLog;
  scheduledMed?: {
    medId: string;
    scheduleTime: string;
  };
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const stripEmoji = (value: string): string =>
  value
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeDecimalInput = (value: string): string => {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole = "", ...fractionParts] = normalized.split(".");
  const fraction = fractionParts.join("");
  return fractionParts.length > 0 ? `${whole}.${fraction}` : whole;
};

const PERIOD_LEVELS: {
  v: PeriodLevel;
  label: string;
  color: string;
}[] = [
  { v: "spotting", label: "Spotting", color: "var(--period-spotting)" },
  { v: "light", label: "Light", color: "var(--period-light)" },
  { v: "medium", label: "Medium", color: "var(--period-medium)" },
  { v: "heavy", label: "Heavy", color: "var(--period-heavy)" },
  {
    v: "very-heavy",
    label: "Very heavy",
    color: "var(--period-veryheavy)",
  },
];

const mk = <T,>(arr: T[] | undefined, v: T): T[] => [...(arr ?? []), v];

function baseTags(): Tag[] {
  const t = () => nowHHMM();

  return [
    {
      key: "pain-0",
      emoji: "🟢",
      label: "No pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, {
          id: uid(),
          time: t(),
          score: 0,
          parts: [],
          quality: [],
          symptoms: [],
          note: "",
        }),
      }),
    },
    {
      key: "pain-1",
      emoji: "🟡",
      label: "Mild pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, {
          id: uid(),
          time: t(),
          score: 2,
          parts: [],
          quality: [],
          symptoms: [],
          note: "",
        }),
      }),
    },
    {
      key: "pain-2",
      emoji: "🟠",
      label: "Moderate pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, {
          id: uid(),
          time: t(),
          score: 5,
          parts: [],
          quality: [],
          symptoms: [],
          note: "",
        }),
      }),
    },
    {
      key: "pain-3",
      emoji: "🔴",
      label: "Severe pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, {
          id: uid(),
          time: t(),
          score: 8,
          parts: [],
          quality: [],
          symptoms: [],
          note: "",
        }),
      }),
    },
    {
      key: "tet-episode",
      emoji: "⚡",
      label: "Tetany episode",
      cat: "tetany",
      apply: (l) => ({
        ...l,
        tetany: mk(l.tetany, {
          id: uid(),
          time: t(),
          types: [],
          location: [],
          intensity: 1,
          triggers: [],
          helped: [],
        }),
      }),
    },
    {
      key: "panic",
      emoji: "✨",
      label: "Panic attack",
      cat: "panic",
      apply: (l) => ({
        ...l,
        panic: mk(l.panic, {
          id: uid(),
          time: t(),
          intensity: 1,
          physical: [],
          cognitive: [],
          trigger: "",
          hyperventilation: "unknown",
          tetanyPresent: false,
          helped: [],
        }),
      }),
    },
    {
      key: "sex",
      emoji: "❤️",
      label: "ŠukŠuk",
      cat: "sex",
      apply: (l) => ({
        ...l,
        sex: mk(l.sex, {
          id: uid(),
          time: t(),
          kind: "sex",
        }),
      }),
    },
    {
      key: "hist-flare",
      emoji: "🔥",
      label: "Histamine flare",
      cat: "food",
      apply: (l) => ({
        ...l,
        food: mk(l.food, {
          id: uid(),
          time: t(),
          what: "",
          feelings: [],
          histamineFlare: true,
        }),
      }),
    },
    {
      key: "period",
      emoji: "🫐",
      label: "Period",
      cat: "period",
      popup: "period",
    },
  ];
}

function customToTag(c: CustomQuickTag, data: BixboData): Tag {
  const t = () => nowHHMM();
  const p = c.preset ?? {};

  const apply = (l: DayLog): DayLog => {
    switch (c.cat) {
      case "pain":
        return {
          ...l,
          pain: mk(l.pain, {
            id: uid(),
            time: t(),
            score: p.score ?? 0,
            parts: [],
            quality: [],
            symptoms: [],
            note: "",
          }),
        };

      case "tetany":
        return {
          ...l,
          tetany: mk(l.tetany, {
            id: uid(),
            time: t(),
            types: [],
            location: [],
            intensity: p.intensity ?? 1,
            triggers: [],
            helped: [],
          }),
        };

      case "panic":
        return {
          ...l,
          panic: mk(l.panic, {
            id: uid(),
            time: t(),
            intensity: p.intensity ?? 1,
            physical: [],
            cognitive: [],
            trigger: "",
            hyperventilation: "unknown",
            tetanyPresent: false,
            helped: [],
          }),
        };

      case "sex":
        return {
          ...l,
          sex: mk(l.sex, {
            id: uid(),
            time: t(),
            kind: "sex",
          }),
        };

      case "food":
        return {
          ...l,
          food: mk(l.food, {
            id: uid(),
            time: t(),
            what: p.what ?? "",
            feelings: [],
          }),
        };

      case "meds": {
        const med = data.meds.find((m) => m.id === p.medId);
        if (!med) return l;

        if (p.mode === "scheduled") {
          return l;
        }

        return {
          ...l,
          extraMeds: mk(l.extraMeds, {
            id: uid(),
            time: t(),
            name: med.name,
            dose: med.dose,
          }),
        };
      }

      case "workout":
        return {
          ...l,
          workout: mk(l.workout, {
            id: uid(),
            time: t(),
            kind: p.kind ?? "Walk",
            minutes: p.minutes ?? 30,
          }),
        };

      case "bowel":
        return {
          ...l,
          bowel: mk(l.bowel, {
            id: uid(),
            time: t(),
            bristol: p.bristol ?? 4,
            feelings: [],
            symptoms: [],
            urinary: [],
          }),
        };

      case "thermo":
        return {
          ...l,
          heat: mk(l.heat, {
            id: uid(),
            kind: p.thermoKind ?? "heat",
            start: t(),
            minutes: p.thermoMinutes ?? 20,
          }),
        };

      case "headache":
        return {
          ...l,
          pain: mk(l.pain, {
            id: uid(),
            time: t(),
            score: p.headacheIntensity ?? 3,
            parts: ["Head"],
            quality: [],
            symptoms: [],
            note: "",
            headache: true,
            headacheTypes: p.headacheType ? [p.headacheType] : [],
            headacheIntensity: p.headacheIntensity ?? 3,
          }),
        };

      case "hotFlashes":
        return {
          ...l,
          pain: mk(l.pain, {
            id: uid(),
            time: t(),
            score: 0,
            parts: [],
            quality: [],
            symptoms: [],
            note: "",
            hotFlashesOn: true,
            hotFlashes: p.hotFlashesIntensity ?? 3,
          }),
        };

      case "sleep":
        return {
          ...l,
          sleepHours: p.sleepHours ?? 8,
          sleepQuality: p.sleepQuality ?? "🙂 Good",
        };

      default:
        return l;
    }
  };

  return {
    key: `custom-${c.id}`,
    emoji: c.emoji,
    label: c.label,
    cat: c.cat,
    apply,
    scheduledMed:
      c.cat === "meds" && p.mode === "scheduled" && p.medId && p.scheduleTime
        ? {
            medId: p.medId,
            scheduleTime: p.scheduleTime,
          }
        : undefined,
  };
}

export function QuickTags({
  data,
  update,
  onLongPress,
}: {
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onLongPress: (cat: string) => void;
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [postpartumOpen, setPostpartumOpen] = useState(false);
  const [postpartumSymptoms, setPostpartumSymptoms] = useState<string[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);

  const cycleTrackingHidden = isCycleTrackingHidden(data);

  const postpartumTag: Tag | null = data.postpartum?.active
    ? {
        key: "postpartum-symptoms",
        emoji: "🤱",
        label: "Postpartum",
        cat: "postpartum",
        popup: "postpartum",
      }
    : null;

  const allTags = [
    ...(postpartumTag ? [postpartumTag] : []),
    ...baseTags().filter((tag) => !(tag.cat === "period" && cycleTrackingHidden)),
    ...(data.settings.customQuickTags ?? [])
      .filter((tag) => !(tag.cat === "period" && cycleTrackingHidden))
      .map((tag) => customToTag(tag, data)),
  ];

  const order = data.settings.quickTagOrder ?? [];
  const hidden = new Set(data.settings.hiddenQuickTags ?? []);

  const sortedTags = [...allTags].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);

    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const tags = sortedTags.filter((tag) => !hidden.has(tag.key));

  const hideTag = (key: string) => {
    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        hiddenQuickTags: [...new Set([...(d.settings.hiddenQuickTags ?? []), key])],
      },
    }));
  };

  const moveTag = (key: string, dir: -1 | 1) => {
    const visibleKeys = tags.map((tag) => tag.key);
    const index = visibleKeys.indexOf(key);
    const swapIndex = index + dir;

    if (swapIndex < 0 || swapIndex >= visibleKeys.length) return;

    [visibleKeys[index], visibleKeys[swapIndex]] = [visibleKeys[swapIndex], visibleKeys[index]];

    const hiddenKeysInOrder = sortedTags.filter((tag) => hidden.has(tag.key)).map((tag) => tag.key);

    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        quickTagOrder: [...visibleKeys, ...hiddenKeysInOrder],
      },
    }));
  };

  const clear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const buzz = () => {
    if (!navigator.vibrate) return;

    try {
      navigator.vibrate(15);
    } catch {
      // No-op.
    }
  };

  const flashKey = (key: string) => {
    setFlash(key);
    buzz();

    window.setTimeout(() => {
      setFlash((current) => (current === key ? null : current));
    }, 700);
  };

  const doTap = (tag: Tag) => {
    if (tag.popup === "period") {
      setPeriodOpen(true);
      return;
    }

    if (tag.popup === "postpartum") {
      setPostpartumSymptoms(data.dayLogs[todayKey()]?.postpartum?.symptoms ?? []);
      setPostpartumOpen(true);
      return;
    }

    if (tag.scheduledMed) {
      const date = todayKey();
      const actualTime = nowHHMM();
      const { medId, scheduleTime } = tag.scheduledMed;
      const slotKey = `${medId}@${scheduleTime}`;

      update((d) => {
        const dayLog = { ...(d.medLog[date] ?? {}) };
        const dayTimes = { ...(d.medLogTimes[date] ?? {}) };
        const currentlyTaken = Boolean(dayLog[slotKey]);

        if (currentlyTaken) {
          delete dayLog[slotKey];
          delete dayTimes[slotKey];
        } else {
          dayLog[slotKey] = true;
          dayTimes[slotKey] = actualTime;
        }

        return {
          ...d,
          medLog: {
            ...d.medLog,
            [date]: dayLog,
          },
          medLogTimes: {
            ...d.medLogTimes,
            [date]: dayTimes,
          },
        };
      });

      flashKey(tag.key);
      return;
    }

    if (!tag.apply) return;

    updateDayLog(update, todayKey(), tag.apply);
    flashKey(tag.key);
  };

  const logPeriod = (level: PeriodLevel) => {
    updateDayLog(update, todayKey(), (l) => ({
      ...l,
      period: level,
      periodInfo: {
        ...(l.periodInfo ?? { level }),
        level,
      },
    }));

    setPeriodOpen(false);
    flashKey("period");
  };

  const togglePostpartumSymptom = (symptom: string) => {
    setPostpartumSymptoms((current) =>
      current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom],
    );
  };

  const savePostpartumSymptoms = () => {
    updateDayLog(update, todayKey(), (log) => ({
      ...log,
      postpartum: {
        ...(log.postpartum ?? {}),
        symptoms: postpartumSymptoms.length ? postpartumSymptoms : undefined,
      },
    }));

    setPostpartumOpen(false);
    flashKey("postpartum-symptoms");
  };

  return (
    <div className="mt-3 px-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {editMode ? "Reorder or remove buttons" : "Quick log · tap to log now, long-press for details"}
        </p>

        <button
          type="button"
          onClick={() => setEditMode((value) => !value)}
          className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            editMode
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-tint/70 text-muted-foreground hover:bg-tint hover:text-foreground"
          }`}
        >
          <Pencil className="h-3 w-3" />
          {editMode ? "Done" : "Edit"}
        </button>
      </div>

      <div
        className="-mx-5 quicklog-scroll overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x px-5 pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
      >
        <div className="flex gap-4">
          {tags.map((tag, index) => {
            const isFlash = flash === tag.key;

            if (editMode) {
              return (
                <div
                  key={tag.key}
                  className="relative flex h-[84px] w-[84px] shrink-0 select-none flex-col items-center justify-center gap-1 rounded-full bg-surface p-2 shadow-sm ring-1 ring-border/80"
                >
                  <button
                    type="button"
                    onClick={() => hideTag(tag.key)}
                    aria-label={`Remove ${tag.label}`}
                    className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </button>

                  <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 dark:bg-white/5">
  <Ico e={tag.emoji} size={30} />
</div>/>
                  <span className="text-[11px] font-medium leading-tight text-muted-foreground">{tag.label}</span>

                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveTag(tag.key, -1)}
                      disabled={index === 0}
                      aria-label="Move left"
                      className="grid h-8 w-8 place-items-center rounded-full bg-tint text-muted-foreground transition hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveTag(tag.key, 1)}
                      disabled={index === tags.length - 1}
                      aria-label="Move right"
                      className="grid h-8 w-8 place-items-center rounded-full bg-tint text-muted-foreground transition hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={tag.key}
                type="button"
                onPointerDown={(e) => {
                  draggingRef.current = false;
                  startXRef.current = e.clientX;
                  startYRef.current = e.clientY;
                  longFiredRef.current = false;
                  clear();

                  timerRef.current = window.setTimeout(() => {
                    if (!draggingRef.current) {
                      longFiredRef.current = true;
                      onLongPress(tag.cat);
                    }
                  }, 500);
                }}
                onPointerMove={(e) => {
                  if (Math.abs(e.clientX - startXRef.current) > 8 || Math.abs(e.clientY - startYRef.current) > 8) {
                    draggingRef.current = true;
                    clear();
                  }
                }}
                onPointerUp={(e) => {
                  clear();

                  if (draggingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }

                  if (!longFiredRef.current) {
                    doTap(tag);
                  }
                }}
                onPointerLeave={() => {
                  draggingRef.current = true;
                  clear();
                }}
                onPointerCancel={() => {
                  draggingRef.current = true;
                  clear();
                }}
                onClick={(e) => {
                  if (draggingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onContextMenu={(event) => event.preventDefault()}
                title={`${tag.label} — long-press for details`}
                aria-label={tag.label}
                className={`relative flex h-[84px] w-[84px] shrink-0 snap-start select-none touch-manipulation flex-col items-center justify-center gap-1 rounded-full bg-surface p-2 shadow-sm ring-1 ring-border/80 transition-[transform,box-shadow,background-color,ring-color] duration-150 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 ${
                  isFlash ? "scale-105 bg-primary/10 ring-2 ring-primary shadow-md" : ""
                }`}
              >
                <Ico e={tag.emoji} size={30} />

                <span className="text-[11px] font-medium leading-tight text-muted-foreground">{tag.label}</span>

                {isFlash && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            aria-label="Add custom quick log button"
            className="flex h-[84px] w-[84px] shrink-0 select-none flex-col items-center justify-center gap-1 rounded-full border border-dashed border-border bg-transparent px-3 py-2.5 text-muted-foreground transition-[transform,background-color,border-color] hover:border-primary/50 hover:bg-tint/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
          >
            <Plus className="h-5 w-5" />
           <span className="text-[11px] font-medium">
    Add
</span>
          </button>
        </div>
      </div>

      {editMode && hidden.size > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium leading-tight text-muted-foreground">Hidden — tap to restore:</p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {sortedTags
              .filter((tag) => hidden.has(tag.key))
              .map((tag) => (
                <button
                  key={tag.key}
                  type="button"
                  onClick={() => {
                    update((d) => ({
                      ...d,
                      settings: {
                        ...d.settings,
                        hiddenQuickTags: (d.settings.hiddenQuickTags ?? []).filter((key) => key !== tag.key),
                      },
                    }));
                  }}
                  className="flex min-h-8 items-center gap-1 rounded-full bg-tint px-2.5 text-[10px] font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Ico e={tag.emoji} size={12} />
                  {tag.label}
                  <Plus className="h-3 w-3" />
                </button>
              ))}
          </div>
        </div>
      )}

      {periodOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-6 backdrop-blur-sm"
          onClick={() => setPeriodOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-background p-5 shadow-2xl ring-1 ring-border/80"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-3 flex items-center justify-center gap-2 text-center font-serif text-lg">
              <Ico e="🫐" size={20} />
              Flow today
            </p>

            <div className="space-y-2">
              {PERIOD_LEVELS.map((level) => (
                <button
                  key={level.v}
                  type="button"
                  onClick={() => logPeriod(level.v)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left text-sm font-medium shadow-sm ring-1 ring-border/80 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: level.color }} />
                  {level.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPeriodOpen(false)}
              className="mt-3 w-full rounded-2xl bg-tint py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {postpartumOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-6 backdrop-blur-sm"
          onClick={() => setPostpartumOpen(false)}
        >
          <div
            className="max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-background p-5 shadow-2xl ring-1 ring-border/80"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-center gap-2">
              <Ico e="🤱" size={26} />
              <p className="font-serif text-lg">Postpartum symptoms</p>
            </div>

            <p className="mb-3 text-center text-xs leading-relaxed text-muted-foreground">
              Select every symptom you experienced today.
            </p>

            <div className="flex flex-wrap gap-2">
              {POSTPARTUM_SYMPTOMS.map((symptom) => {
                const active = postpartumSymptoms.includes(symptom);

                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => togglePostpartumSymptom(symptom)}
                    className={`min-h-9 rounded-full px-3 text-xs font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                        : "bg-tint text-foreground ring-border hover:bg-primary/10"
                    }`}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPostpartumOpen(false)}
                className="flex-1 rounded-2xl bg-tint py-2.5 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={savePostpartumSymptoms}
                className="flex-1 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {builderOpen && <QuickTagBuilder data={data} update={update} onClose={() => setBuilderOpen(false)} />}

      {(data.settings.customQuickTags?.length ?? 0) > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(data.settings.customQuickTags ?? []).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                update((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    customQuickTags: (d.settings.customQuickTags ?? []).filter((item) => item.id !== tag.id),
                  },
                }));
              }}
              className="flex min-h-8 items-center gap-1 rounded-full bg-tint px-2.5 text-[10px] font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Ico e={tag.emoji} size={14} />
              {tag.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CATS: {
  id: QuickTagCategory;
  label: string;
}[] = [
  { id: "pain", label: "Pain" },
  { id: "tetany", label: "Tetany" },
  { id: "panic", label: "Panic" },
  { id: "sex", label: "ŠukŠuk" },
  { id: "food", label: "Food" },
  { id: "meds", label: "Meds" },
  { id: "workout", label: "Workout" },
  { id: "bowel", label: "Bowel" },
  { id: "thermo", label: "Heat / Cold / TENS" },
  { id: "headache", label: "Headache" },
  { id: "hotFlashes", label: "Hot flashes" },
  { id: "sleep", label: "Sleep" },
];

function QuickTagBuilder({
  data,
  update,
  onClose,
}: {
  data: BixboData;
  update: (u: (d: BixboData) => BixboData) => void;
  onClose: () => void;
}) {
  const firstMed = data.meds[0];

  const [step, setStep] = useState(0);
  const [cat, setCat] = useState<QuickTagCategory>("pain");
  const [score, setScore] = useState(5);
  const [intensity, setIntensity] = useState(3);
  const [what, setWhat] = useState("");
  const [medId, setMedId] = useState(firstMed?.id ?? "");
  const [medMode, setMedMode] = useState<"scheduled" | "extra">("scheduled");
  const [scheduleTime, setScheduleTime] = useState(firstMed?.times?.[0] ?? "");
  const [kind, setKind] = useState("Walk");
  const [minutes, setMinutes] = useState(30);

  const [bristol, setBristol] = useState(4);
  const [thermoKind, setThermoKind] = useState<ThermoKind>("heat");
  const [thermoMinutes, setThermoMinutes] = useState(20);
  const [headacheType, setHeadacheType] = useState(HEADACHE_TYPES[0] ?? "Tension");
  const [headacheIntensity, setHeadacheIntensity] = useState(3);
  const [hotFlashesIntensity, setHotFlashesIntensity] = useState(3);
  const [sleepHours, setSleepHours] = useState("8");
  const [sleepQuality, setSleepQuality] = useState(SLEEP_QUALITY[0] ?? "🙂 Good");

  const [emoji, setEmoji] = useState("⭐");
  const [label, setLabel] = useState("");

  const selectedMed = data.meds.find((med) => med.id === medId);
  const selectedMedTimes = selectedMed?.times ?? [];

  const save = () => {
    const effectiveScheduleTime = scheduleTime || selectedMedTimes[0] || undefined;

    if (cat === "meds" && !medId) {
      return;
    }

    if (cat === "meds" && medMode === "scheduled" && !effectiveScheduleTime) {
      return;
    }

    const tag: CustomQuickTag = {
      id: crypto.randomUUID(),
      emoji: emoji.trim() || "⭐",
      label: label.trim() || CATS.find((item) => item.id === cat)?.label || "Quick log",
      cat,
      preset: {
        score: cat === "pain" ? score : undefined,
        intensity: cat === "tetany" || cat === "panic" ? intensity : undefined,
        what: cat === "food" ? what.trim() || undefined : undefined,
        medId: cat === "meds" ? medId || undefined : undefined,
        mode: cat === "meds" ? medMode : undefined,
        scheduleTime: cat === "meds" && medMode === "scheduled" ? effectiveScheduleTime : undefined,
        kind: cat === "workout" ? kind : undefined,
        minutes: cat === "workout" ? minutes : undefined,
        bristol: cat === "bowel" ? bristol : undefined,
        thermoKind: cat === "thermo" ? thermoKind : undefined,
        thermoMinutes: cat === "thermo" ? thermoMinutes : undefined,
        headacheType: cat === "headache" ? headacheType : undefined,
        headacheIntensity: cat === "headache" ? headacheIntensity : undefined,
        hotFlashesIntensity: cat === "hotFlashes" ? hotFlashesIntensity : undefined,
        sleepHours:
          cat === "sleep" ? Math.min(24, Math.max(0, Number.parseFloat(sleepHours.replace(",", ".")) || 0)) : undefined,
        sleepQuality: cat === "sleep" ? sleepQuality : undefined,
      },
    };

    update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        customQuickTags: [...(d.settings.customQuickTags ?? []), tag],
      },
    }));

    onClose();
  };

  const inputCls = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl ring-1 ring-border/80"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mb-3 text-center font-serif text-lg">New quick log button</p>

        {step === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">1. Category</p>

            <div className="flex flex-wrap gap-2">
              {CATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCat(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    cat === item.id ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">2. Preset values</p>

            {cat === "pain" && (
              <div>
                <p className="text-xs">
                  Pain score: <b>{score}</b>
                </p>

                <input
                  type="range"
                  min={0}
                  max={10}
                  value={score}
                  onChange={(event) => setScore(Number(event.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {(cat === "tetany" || cat === "panic") && (
              <div>
                <p className="text-xs">
                  Intensity: <b>{intensity}</b>
                </p>

                <input
                  type="range"
                  min={1}
                  max={cat === "tetany" ? 5 : 10}
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {cat === "food" && (
              <input
                className={inputCls}
                value={what}
                onChange={(event) => setWhat(event.target.value)}
                placeholder="e.g. Matcha"
              />
            )}

            {cat === "meds" && (
              <div className="space-y-3">
                {data.meds.length > 0 ? (
                  <>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Medication</p>

                      <select
                        className={inputCls}
                        value={medId}
                        onChange={(event) => {
                          const id = event.target.value;
                          const firstTime = data.meds.find((med) => med.id === id)?.times?.[0] ?? "";

                          setMedId(id);
                          setScheduleTime(firstTime);
                        }}
                      >
                        {data.meds.map((med) => (
                          <option key={med.id} value={med.id}>
                            {med.name}
                            {med.dose ? ` (${med.dose})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs">Logging mode</p>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="med-mode"
                          checked={medMode === "scheduled"}
                          onChange={() => {
                            setMedMode("scheduled");

                            if (!scheduleTime) {
                              setScheduleTime(selectedMedTimes[0] ?? "");
                            }
                          }}
                        />
                        Mark scheduled dose as taken
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="med-mode"
                          checked={medMode === "extra"}
                          onChange={() => setMedMode("extra")}
                        />
                        Log extra / PRN dose
                      </label>
                    </div>

                    {medMode === "scheduled" && (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Scheduled time</p>

                        {selectedMedTimes.length > 0 ? (
                          <select
                            className={inputCls}
                            value={scheduleTime || selectedMedTimes[0] || ""}
                            onChange={(event) => setScheduleTime(event.target.value)}
                          >
                            {selectedMedTimes.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs text-muted-foreground">No schedule time saved for this medication.</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No medications saved yet.</p>
                )}
              </div>
            )}

            {cat === "workout" && (
              <div className="space-y-2">
                <input
                  className={inputCls}
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  placeholder="Workout type"
                />

                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))}
                  placeholder="Minutes"
                />
              </div>
            )}

            {cat === "bowel" && (
              <div>
                <p className="text-xs">
                  Bristol type: <b>{bristol}</b>
                </p>

                <input
                  type="range"
                  min={0}
                  max={7}
                  value={bristol}
                  onChange={(event) => setBristol(Number(event.target.value))}
                  className="w-full"
                />

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Type 0 = unsure / mystery. “No bowel movement” should remain a separate status.
                </p>
              </div>
            )}

            {cat === "thermo" && (
              <div className="space-y-2">
                <select
                  className={inputCls}
                  value={thermoKind}
                  onChange={(event) => setThermoKind(event.target.value as ThermoKind)}
                >
                  <option value="heat">Heat</option>
                  <option value="cold">Cold</option>
                  <option value="tens">TENS</option>
                </select>

                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={thermoMinutes}
                  onChange={(event) => setThermoMinutes(Number(event.target.value))}
                  placeholder="Minutes"
                />
              </div>
            )}

            {cat === "headache" && (
              <div className="space-y-2">
                <select
                  className={inputCls}
                  value={headacheType}
                  onChange={(event) => setHeadacheType(event.target.value)}
                >
                  {HEADACHE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <div>
                  <p className="text-xs">
                    Intensity: <b>{headacheIntensity}</b>
                  </p>

                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={headacheIntensity}
                    onChange={(event) => setHeadacheIntensity(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {cat === "hotFlashes" && (
              <div>
                <p className="text-xs">
                  Intensity: <b>{hotFlashesIntensity}</b>
                </p>

                <input
                  type="range"
                  min={1}
                  max={5}
                  value={hotFlashesIntensity}
                  onChange={(event) => setHotFlashesIntensity(Number(event.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {cat === "sleep" && (
              <div className="space-y-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Hours</p>

                  <input
                    className={inputCls}
                    type="text"
                    inputMode="decimal"
                    value={sleepHours}
                    onChange={(event) => setSleepHours(normalizeDecimalInput(event.target.value))}
                    placeholder="8,5"
                    aria-label="Sleep hours"
                  />
                </div>

                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Quality</p>

                  <select
                    className={inputCls}
                    value={sleepQuality}
                    onChange={(event) => setSleepQuality(event.target.value)}
                  >
                    {SLEEP_QUALITY.map((quality) => (
                      <option key={stripEmoji(quality)} value={stripEmoji(quality)}>
                        {stripEmoji(quality)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {cat === "sex" && (
              <p className="text-xs text-muted-foreground">Logs a sex entry — details can be added later.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">3. Icon and name</p>

            <input
              className={inputCls}
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              placeholder="Icon key"
              maxLength={8}
            />

            <input
              className={inputCls}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Button name"
            />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep((value) => value - 1)}
            className="flex-1 rounded-2xl bg-tint py-2 text-sm"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <button
            type="button"
            disabled={
              step === 2 && cat === "meds" && (!medId || (medMode === "scheduled" && selectedMedTimes.length === 0))
            }
            onClick={step === 2 ? save : () => setStep((value) => value + 1)}
            className="flex-1 rounded-2xl bg-primary py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === 2 ? "Create" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
