import { Ico } from "@/components/icons/BixboIcons";
import { useRef, useState } from "react";
import { Check, Plus, X, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import {
  todayKey,
  nowHHMM,
  updateDayLog,
  type BixboData,
  type DayLog,
  type CustomQuickTag,
  type QuickTagCategory,
  type PeriodLevel,
} from "@/lib/storage";

type Cat = QuickTagCategory | "period";

type Tag = {
  key: string;
  emoji: string;
  label: string;
  cat: Cat;
  /** When set, tapping opens a mini popup instead of logging immediately. */
  popup?: "period";
  apply?: (l: DayLog) => DayLog;
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const PERIOD_LEVELS: { v: PeriodLevel; label: string; color: string }[] = [
  { v: "spotting", label: "Spotting", color: "var(--period-spotting)" },
  { v: "light", label: "Light", color: "var(--period-light)" },
  { v: "medium", label: "Medium", color: "var(--period-medium)" },
  { v: "heavy", label: "Heavy", color: "var(--period-heavy)" },
  { v: "veryheavy", label: "Very heavy", color: "var(--period-veryheavy)" },
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
        pain: mk(l.pain, { id: uid(), time: t(), score: 0, parts: [], quality: [], symptoms: [], note: "" }),
      }),
    },
    {
      key: "pain-1",
      emoji: "🟡",
      label: "Mild pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, { id: uid(), time: t(), score: 2, parts: [], quality: [], symptoms: [], note: "" }),
      }),
    },
    {
      key: "pain-2",
      emoji: "🟠",
      label: "Moderate pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, { id: uid(), time: t(), score: 5, parts: [], quality: [], symptoms: [], note: "" }),
      }),
    },
    {
      key: "pain-3",
      emoji: "🔴",
      label: "Severe pain",
      cat: "pain",
      apply: (l) => ({
        ...l,
        pain: mk(l.pain, { id: uid(), time: t(), score: 8, parts: [], quality: [], symptoms: [], note: "" }),
      }),
    },

    {
      key: "tet-episode",
      emoji: "⚡",
      label: "Tetany episode",
      cat: "tetany",
      apply: (l) => ({
        ...l,
        tetany: mk(l.tetany, { id: uid(), time: t(), types: [], location: [], intensity: 1, triggers: [], helped: [] }),
      }),
    },

    {
      key: "panic",
      emoji: "🫐",
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
      apply: (l) => ({ ...l, sex: mk(l.sex, { id: uid(), time: t(), kind: "sex" }) }),
    },

    {
      key: "hist-flare",
      emoji: "🔥",
      label: "Histamine flare",
      cat: "food",
      apply: (l) => ({
        ...l,
        food: mk(l.food, { id: uid(), time: t(), what: "", feelings: [], histamineFlare: true }),
      }),
    },

    { key: "period", emoji: "🫐", label: "Period", cat: "period", popup: "period" },
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
        return { ...l, sex: mk(l.sex, { id: uid(), time: t(), kind: "sex" }) };
      case "food":
        return { ...l, food: mk(l.food, { id: uid(), time: t(), what: p.what ?? "", feelings: [] }) };
      case "meds": {
        const med = data.meds.find((m) => m.id === p.medId);

        if (!med) return l;

        if (p.mode === "scheduled" && p.scheduleTime) {
          const currentTaken = l.medLog?.[med.id]?.[p.scheduleTime]?.taken ?? false;

          return {
            ...l,
            medLog: {
              ...(l.medLog ?? {}),
              [med.id]: {
                ...(l.medLog?.[med.id] ?? {}),
                [p.scheduleTime]: {
                  taken: !currentTaken,
                  time: t(),
                },
              },
            },
          };
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
          workout: mk(l.workout, { id: uid(), time: t(), kind: p.kind ?? "🚶🏼‍♀️ Walk", minutes: p.minutes ?? 30 }),
        };
      default:
        return l;
    }
  };
  return { key: `custom-${c.id}`, emoji: c.emoji, label: c.label, cat: c.cat, apply };
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
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  const pregnant = !!data.settings.pregnantSince;
  const isMale = data.settings.gender === "male";
  const allTags = [
    ...baseTags().filter((t) => !(t.cat === "period" && (pregnant || isMale))),
    ...(data.settings.customQuickTags ?? []).map((c) => customToTag(c, data)),
  ];

  const order = data.settings.quickTagOrder ?? [];
  const hidden = new Set(data.settings.hiddenQuickTags ?? []);
  const sortedTags = [...allTags].sort((a, b) => {
    const ia = order.indexOf(a.key),
      ib = order.indexOf(b.key);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const tags = sortedTags.filter((t) => !hidden.has(t.key));

  const hideTag = (key: string) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, hiddenQuickTags: [...new Set([...(d.settings.hiddenQuickTags ?? []), key])] },
    }));

  const moveTag = (key: string, dir: -1 | 1) => {
    const visibleKeys = tags.map((t) => t.key);
    const idx = visibleKeys.indexOf(key);
    const swap = idx + dir;
    if (swap < 0 || swap >= visibleKeys.length) return;
    [visibleKeys[idx], visibleKeys[swap]] = [visibleKeys[swap], visibleKeys[idx]];
    const hiddenKeysInOrder = sortedTags.filter((t) => hidden.has(t.key)).map((t) => t.key);
    update((d) => ({ ...d, settings: { ...d.settings, quickTagOrder: [...visibleKeys, ...hiddenKeysInOrder] } }));
  };

  const clear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const buzz = () => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        /* noop */
      }
    }
  };

  const flashKey = (key: string) => {
    setFlash(key);
    buzz();
    window.setTimeout(() => setFlash((f) => (f === key ? null : f)), 700);
  };

  const doTap = (tag: Tag) => {
    if (tag.popup === "period") {
      setPeriodOpen(true);
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
      periodInfo: { ...(l.periodInfo ?? { level }), level },
    }));
    setPeriodOpen(false);
    flashKey("period");
  };

  return (
    <div className="mt-3 px-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {editMode ? "Reorder or remove buttons" : "Quick log · tap to log now, long-press for details"}
        </p>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${editMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Pencil className="h-3 w-3" /> {editMode ? "Done" : "Edit"}
        </button>
      </div>
      <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {tags.map((tag, i) => {
            const isFlash = flash === tag.key;
            if (editMode) {
              return (
                <div
                  key={tag.key}
                  className="relative flex shrink-0 select-none flex-col items-center gap-0.5 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"
                >
                  <button
                    onClick={() => hideTag(tag.key)}
                    aria-label={`Remove ${tag.label}`}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </button>
                  <Ico e={tag.emoji} size={22} />
                  <span className="text-[10px] text-muted-foreground">{tag.label}</span>
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => moveTag(tag.key, -1)}
                      disabled={i === 0}
                      aria-label="Move left"
                      className="grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveTag(tag.key, 1)}
                      disabled={i === tags.length - 1}
                      aria-label="Move right"
                      className="grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground disabled:opacity-30"
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
                onPointerDown={() => {
                  longFiredRef.current = false;
                  clear();
                  timerRef.current = window.setTimeout(() => {
                    longFiredRef.current = true;
                    onLongPress(tag.cat);
                  }, 500);
                }}
                onPointerUp={() => {
                  clear();
                  if (!longFiredRef.current) doTap(tag);
                }}
                onPointerLeave={clear}
                onPointerCancel={clear}
                onContextMenu={(e) => e.preventDefault()}
                title={`${tag.label} — long-press for details`}
                aria-label={tag.label}
                className={`relative flex shrink-0 select-none flex-col items-center gap-0.5 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border transition-transform active:scale-95 ${isFlash ? "scale-110 ring-primary" : ""}`}
              >
                <Ico e={tag.emoji} size={24} />
                <span className="text-[10px] text-muted-foreground">{tag.label}</span>
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
            className="flex shrink-0 select-none flex-col items-center gap-0.5 rounded-2xl border border-dashed border-border bg-transparent px-3 py-2 text-muted-foreground transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px]">Add</span>
          </button>
        </div>
      </div>

      {editMode && hidden.size > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-muted-foreground">Hidden — tap to restore:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sortedTags
              .filter((t) => hidden.has(t.key))
              .map((t) => (
                <button
                  key={t.key}
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      settings: {
                        ...d.settings,
                        hiddenQuickTags: (d.settings.hiddenQuickTags ?? []).filter((x) => x !== t.key),
                      },
                    }))
                  }
                  className="flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  <Ico e={t.emoji} size={12} /> {t.label} <Plus className="h-3 w-3" />
                </button>
              ))}
          </div>
        </div>
      )}

      {periodOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6"
          onClick={() => setPeriodOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-background p-4 ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 flex items-center justify-center gap-2 text-center font-serif text-lg">
              <Ico e="🫐" size={20} /> Flow today
            </p>
            <div className="space-y-2">
              {PERIOD_LEVELS.map((L) => (
                <button
                  key={L.v}
                  onClick={() => logPeriod(L.v)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left text-sm font-medium ring-1 ring-border"
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: L.color }} />
                  {L.label}
                </button>
              ))}
            </div>
            <button onClick={() => setPeriodOpen(false)} className="mt-3 w-full rounded-2xl bg-tint py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {builderOpen && <QuickTagBuilder data={data} update={update} onClose={() => setBuilderOpen(false)} />}

      {(data.settings.customQuickTags?.length ?? 0) > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(data.settings.customQuickTags ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() =>
                update((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    customQuickTags: (d.settings.customQuickTags ?? []).filter((x) => x.id !== c.id),
                  },
                }))
              }
              className="flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <Ico e={c.emoji} size={14} /> {c.label} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CATS: { id: QuickTagCategory; label: string }[] = [
  { id: "pain", label: "Pain" },
  { id: "tetany", label: "Tetany" },
  { id: "panic", label: "Panic" },
  { id: "sex", label: "ŠukŠuk" },
  { id: "food", label: "Food" },
  { id: "meds", label: "Meds" },
  { id: "workout", label: "Workout" },
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
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState<QuickTagCategory>("pain");
  const [score, setScore] = useState(5);
  const [intensity, setIntensity] = useState(3);
  const [what, setWhat] = useState("");
  const [medId, setMedId] = useState<string>(data.meds[0]?.id ?? "");
  const [medMode, setMedMode] = useState<"scheduled" | "extra">("scheduled");
  const [scheduleTime, setScheduleTime] = useState("");
  const [kind, setKind] = useState("🚶🏼‍♀️ Walk");
  const [minutes, setMinutes] = useState(30);
  const [emoji, setEmoji] = useState("⭐");
  const [label, setLabel] = useState("");

  const save = () => {
    const tag: CustomQuickTag = {
      id: crypto.randomUUID(),
      emoji: emoji.trim() || "⭐",
      label: label.trim() || CATS.find((c) => c.id === cat)!.label,
      cat,
      preset: {
        score: cat === "pain" ? score : undefined,
        intensity: cat === "tetany" || cat === "panic" ? intensity : undefined,
        what: cat === "food" ? what.trim() || undefined : undefined,
        medId: cat === "meds" ? medId || undefined : undefined,
        mode: cat === "meds" ? medMode : undefined,
        scheduleTime: cat === "meds" && medMode === "scheduled" ? scheduleTime || undefined : undefined,
        kind: cat === "workout" ? kind : undefined,
        minutes: cat === "workout" ? minutes : undefined,
      },
    };
    update((d) => ({
      ...d,
      settings: { ...d.settings, customQuickTags: [...(d.settings.customQuickTags ?? []), tag] },
    }));
    onClose();
  };

  const inputCls = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-background p-4 ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center font-serif text-lg">New quick log button</p>

        {step === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">1. Category</p>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
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
                  onChange={(e) => setScore(Number(e.target.value))}
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
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            {cat === "food" && (
              <input
                className={inputCls}
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder="e.g. Matcha"
              />
            )}
            {cat === "meds" && (
              <div className="space-y-3">
                {data.meds.length ? (
                  <>
                    <select className={inputCls} value={medId} onChange={(e) => setMedId(e.target.value)}>
                      {data.meds.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.dose ? ` (${m.dose})` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="space-y-2">
                      <p className="text-xs">Logging mode</p>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={medMode === "scheduled"}
                          onChange={() => setMedMode("scheduled")}
                        />
                        Mark scheduled dose as taken
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" checked={medMode === "extra"} onChange={() => setMedMode("extra")} />
                        Log extra / PRN dose
                      </label>
                    </div>

                    {medMode === "scheduled" && (
                      <select
                        className={inputCls}
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      >
                        {(data.meds.find((m) => m.id === medId)?.times ?? []).map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
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
                  onChange={(e) => setKind(e.target.value)}
                  placeholder="Workout type"
                />
                <input
                  className={inputCls}
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  placeholder="Minutes"
                />
              </div>
            )}
            {cat === "sex" && (
              <p className="text-xs text-muted-foreground">Logs a sex entry — details can be added later.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">3. Emoji &amp; name</p>
            <input
              className={inputCls}
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="Emoji"
              maxLength={4}
            />
            <input
              className={inputCls}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Button name"
            />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={step === 0 ? onClose : () => setStep(step - 1)}
            className="flex-1 rounded-2xl bg-tint py-2 text-sm"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={step === 2 ? save : () => setStep(step + 1)}
            className="flex-1 rounded-2xl bg-primary py-2 text-sm text-primary-foreground"
          >
            {step === 2 ? "Create" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
