import { useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import {
  todayKey, nowHHMM, updateDayLog,
  type BixboData, type DayLog, type CustomQuickTag, type QuickTagCategory, type PeriodLevel,
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
  { v: "spotting",  label: "Spotting",   color: "var(--period-spotting)" },
  { v: "light",     label: "Light",      color: "var(--period-light)" },
  { v: "medium",    label: "Medium",     color: "var(--period-medium)" },
  { v: "heavy",     label: "Heavy",      color: "var(--period-heavy)" },
  { v: "veryheavy", label: "Very heavy", color: "var(--period-veryheavy)" },
];

const mk = <T,>(arr: T[] | undefined, v: T): T[] => [...(arr ?? []), v];

function baseTags(): Tag[] {
  const t = () => nowHHMM();
  return [
    { key: "pain-0", emoji: "🟢", label: "No pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 0, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-1", emoji: "🟡", label: "Mild pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 2, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-2", emoji: "🟠", label: "Moderate pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 5, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-3", emoji: "🔴", label: "Severe pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 8, parts: [], quality: [], symptoms: [], note: "" }) }) },

    { key: "tet-episode", emoji: "⚡", label: "Tetany episode", cat: "tetany",
      apply: (l) => ({ ...l, tetany: mk(l.tetany, { id: uid(), time: t(), types: [], location: [], intensity: 1, triggers: [], helped: [] }) }) },

    { key: "panic", emoji: "🫯", label: "Panic attack", cat: "panic",
      apply: (l) => ({ ...l, panic: mk(l.panic, { id: uid(), time: t(), intensity: 1, physical: [], cognitive: [], trigger: "", hyperventilation: "unknown", tetanyPresent: false, helped: [] }) }) },

    { key: "sex", emoji: "❤️", label: "ŠukŠuk", cat: "sex",
      apply: (l) => ({ ...l, sex: mk(l.sex, { id: uid(), time: t(), kind: "sex" }) }) },

    { key: "hist-flare", emoji: "🔥", label: "Histamine flare", cat: "food",
      apply: (l) => ({ ...l, food: mk(l.food, { id: uid(), time: t(), what: "", feelings: [], histamineFlare: true }) }) },

    { key: "period", emoji: "🫐", label: "Period", cat: "period", popup: "period" },
  ];
}

function customToTag(c: CustomQuickTag, data: BixboData): Tag {
  const t = () => nowHHMM();
  const p = c.preset ?? {};
  const apply = (l: DayLog): DayLog => {
    switch (c.cat) {
      case "pain":
        return { ...l, pain: mk(l.pain, { id: uid(), time: t(), score: p.score ?? 0, parts: [], quality: [], symptoms: [], note: "" }) };
      case "tetany":
        return { ...l, tetany: mk(l.tetany, { id: uid(), time: t(), types: [], location: [], intensity: p.intensity ?? 1, triggers: [], helped: [] }) };
      case "panic":
        return { ...l, panic: mk(l.panic, { id: uid(), time: t(), intensity: p.intensity ?? 1, physical: [], cognitive: [], trigger: "", hyperventilation: "unknown", tetanyPresent: false, helped: [] }) };
      case "sex":
        return { ...l, sex: mk(l.sex, { id: uid(), time: t(), kind: "sex" }) };
      case "food":
        return { ...l, food: mk(l.food, { id: uid(), time: t(), what: p.what ?? "", feelings: [] }) };
      case "meds": {
        const med = data.meds.find((m) => m.id === p.medId);
        return { ...l, extraMeds: mk(l.extraMeds, { id: uid(), time: t(), name: med?.name ?? c.label, dose: med?.dose }) };
      }
      case "workout":
        return { ...l, workout: mk(l.workout, { id: uid(), time: t(), kind: p.kind ?? "🚶🏼‍♀️ Walk", minutes: p.minutes ?? 30 }) };
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
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);

  const pregnant = !!data.settings.pregnantSince;
  const isMale = data.settings.gender === "male";
  const tags = [
    ...baseTags().filter((t) => !(t.cat === "period" && (pregnant || isMale))),
    ...(data.settings.customQuickTags ?? []).map((c) => customToTag(c, data)),
  ];

  const clear = () => { if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; } };

  const buzz = () => { if (navigator.vibrate) { try { navigator.vibrate(15); } catch { /* noop */ } } };

  const flashKey = (key: string) => {
    setFlash(key);
    buzz();
    window.setTimeout(() => setFlash((f) => (f === key ? null : f)), 700);
  };

  const doTap = (tag: Tag) => {
    if (tag.popup === "period") { setPeriodOpen(true); return; }
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
      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Quick log · tap to log now, long-press for details</p>
      <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {tags.map((tag) => {
            const isFlash = flash === tag.key;
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
                <span className="text-xl leading-none">{tag.emoji}</span>
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

      {periodOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={() => setPeriodOpen(false)}>
          <div className="w-full max-w-xs rounded-3xl bg-background p-4 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-center font-serif text-lg">🫐 Flow today</p>
            <div className="space-y-2">
              {PERIOD_LEVELS.map((L) => (
                <button key={L.v} onClick={() => logPeriod(L.v)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-left text-sm font-medium ring-1 ring-border">
                  <span className="h-4 w-4 rounded-full" style={{ background: L.color }} />
                  {L.label}
                </button>
              ))}
            </div>
            <button onClick={() => setPeriodOpen(false)} className="mt-3 w-full rounded-2xl bg-tint py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {builderOpen && (
        <QuickTagBuilder data={data} update={update} onClose={() => setBuilderOpen(false)} />
      )}

      {(data.settings.customQuickTags?.length ?? 0) > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {(data.settings.customQuickTags ?? []).map((c) => (
            <button key={c.id}
              onClick={() => update((d) => ({ ...d, settings: { ...d.settings, customQuickTags: (d.settings.customQuickTags ?? []).filter((x) => x.id !== c.id) } }))}
              className="flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-[10px] text-muted-foreground">
              {c.emoji} {c.label} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CATS: { id: QuickTagCategory; label: string }[] = [
  { id: "pain", label: "🔥 Pain" },
  { id: "tetany", label: "⚡ Tetany" },
  { id: "panic", label: "🫯 Panic" },
  { id: "sex", label: "❤️ ŠukŠuk" },
  { id: "food", label: "🍽️ Food" },
  { id: "meds", label: "💊 Meds" },
  { id: "workout", label: "🧘🏼‍♀️ Workout" },
];

function QuickTagBuilder({ data, update, onClose }: {
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
        kind: cat === "workout" ? kind : undefined,
        minutes: cat === "workout" ? minutes : undefined,
      },
    };
    update((d) => ({ ...d, settings: { ...d.settings, customQuickTags: [...(d.settings.customQuickTags ?? []), tag] } }));
    onClose();
  };

  const inputCls = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-background p-4 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-center font-serif text-lg">New quick log button</p>

        {step === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">1. Category</p>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}>
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
                <p className="text-xs">Pain score: <b>{score}</b></p>
                <input type="range" min={0} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full" />
              </div>
            )}
            {(cat === "tetany" || cat === "panic") && (
              <div>
                <p className="text-xs">Intensity: <b>{intensity}</b></p>
                <input type="range" min={1} max={cat === "tetany" ? 5 : 10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full" />
              </div>
            )}
            {cat === "food" && (
              <input className={inputCls} value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. Matcha" />
            )}
            {cat === "meds" && (
              data.meds.length ? (
                <select className={inputCls} value={medId} onChange={(e) => setMedId(e.target.value)}>
                  {data.meds.map((m) => <option key={m.id} value={m.id}>{m.name}{m.dose ? ` (${m.dose})` : ""}</option>)}
                </select>
              ) : <p className="text-xs text-muted-foreground">No medications saved yet.</p>
            )}
            {cat === "workout" && (
              <div className="space-y-2">
                <input className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Workout type" />
                <input className={inputCls} type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} placeholder="Minutes" />
              </div>
            )}
            {cat === "sex" && <p className="text-xs text-muted-foreground">Logs a sex entry — details can be added later.</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">3. Emoji &amp; name</p>
            <input className={inputCls} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="Emoji" maxLength={4} />
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Button name" />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={step === 0 ? onClose : () => setStep(step - 1)}
            className="flex-1 rounded-2xl bg-tint py-2 text-sm">{step === 0 ? "Cancel" : "Back"}</button>
          <button onClick={step === 2 ? save : () => setStep(step + 1)}
            className="flex-1 rounded-2xl bg-primary py-2 text-sm text-primary-foreground">{step === 2 ? "Create" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
