import { useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  todayKey, nowHHMM, updateDayLog,
  type BixboData, type DayLog,
} from "@/lib/storage";

type Cat = "pain" | "tetany" | "histamine" | "mood" | "energy" | "panic";

type Tag = {
  key: string;
  emoji: string;
  label: string;
  cat: Cat;
  apply: (l: DayLog) => DayLog;
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function tagList(): Tag[] {
  const t = () => nowHHMM();
  const mk = <T,>(arr: T[] | undefined, v: T): T[] => [...(arr ?? []), v];
  return [
    // Pain 0-3 quick levels (mapped onto 0-10 pain scale: 0/2/5/8)
    { key: "pain-0", emoji: "🟢", label: "No pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 0, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-1", emoji: "🟡", label: "Mild pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 2, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-2", emoji: "🟠", label: "Moderate pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 5, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-3", emoji: "🔴", label: "Severe pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 8, parts: [], quality: [], symptoms: [], note: "" }) }) },

    // Tetany
    { key: "tet-attack", emoji: "⚡", label: "Tetany attack", cat: "tetany",
      apply: (l) => ({ ...l, tetany: mk(l.tetany, { id: uid(), time: t(), types: ["Carpopedal spasm"], location: [], intensity: 3, triggers: [], helped: [] }) }) },
    { key: "tet-tremor", emoji: "🫨", label: "Tremor", cat: "tetany",
      apply: (l) => ({ ...l, tetany: mk(l.tetany, { id: uid(), time: t(), types: ["Fasciculations"], location: [], intensity: 2, triggers: [], helped: [] }) }) },

    // Histamine
    { key: "hist-flare", emoji: "🔥", label: "Histamine flare", cat: "histamine",
      apply: (l) => ({ ...l, histamine: mk(l.histamine, { id: uid(), time: t(), flare: true }) }) },

    // Mood
    { key: "mood-happy",   emoji: "😊", label: "Happy",   cat: "mood",
      apply: (l) => ({ ...l, mood: mk(l.mood, { id: uid(), time: t(), value: "happy" }) }) },
    { key: "mood-neutral", emoji: "😐", label: "Neutral", cat: "mood",
      apply: (l) => ({ ...l, mood: mk(l.mood, { id: uid(), time: t(), value: "neutral" }) }) },
    { key: "mood-sad",     emoji: "😢", label: "Sad",     cat: "mood",
      apply: (l) => ({ ...l, mood: mk(l.mood, { id: uid(), time: t(), value: "sad" }) }) },
    { key: "mood-angry",   emoji: "😡", label: "Angry",   cat: "mood",
      apply: (l) => ({ ...l, mood: mk(l.mood, { id: uid(), time: t(), value: "angry" }) }) },

    // Energy
    { key: "energy-good", emoji: "🔋", label: "Good energy", cat: "energy",
      apply: (l) => ({ ...l, energy: mk(l.energy, { id: uid(), time: t(), value: "good" }) }) },
    { key: "energy-low",  emoji: "🪫", label: "Exhausted",   cat: "energy",
      apply: (l) => ({ ...l, energy: mk(l.energy, { id: uid(), time: t(), value: "exhausted" }) }) },

    // Anxiety / Panic
    { key: "panic", emoji: "😰", label: "Panic / anxiety", cat: "panic",
      apply: (l) => ({ ...l, panic: mk(l.panic, { id: uid(), time: t(), intensity: 5, physical: [], cognitive: [], trigger: "", hyperventilation: "unknown", tetanyPresent: false, helped: [] }) }) },
  ];
}

export function QuickTags({
  update,
  onLongPress,
}: {
  update: (u: (d: BixboData) => BixboData) => void;
  onLongPress: (cat: Cat) => void;
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const tags = tagList();

  const clear = () => { if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; } };

  const doTap = (tag: Tag) => {
    updateDayLog(update, todayKey(), tag.apply);
    setFlash(tag.key);
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch { /* noop */ } }
    window.setTimeout(() => setFlash((f) => (f === tag.key ? null : f)), 700);
  };

  return (
    <div className="mt-4 px-5">
      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Quick log · tap to log now, long-press for details</p>
      <div className="-mx-5 overflow-x-auto px-5 pb-2">
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
        </div>
      </div>
    </div>
  );
}
