import { useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  todayKey, nowHHMM, updateDayLog,
  type BixboData, type DayLog,
} from "@/lib/storage";

type Cat = "pain" | "tetany" | "panic" | "sex" | "food";

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
    // First 5 - kept
    { key: "pain-0", emoji: "🟢", label: "No pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 0, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-1", emoji: "🟡", label: "Mild pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 2, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-2", emoji: "🟠", label: "Moderate pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 5, parts: [], quality: [], symptoms: [], note: "" }) }) },
    { key: "pain-3", emoji: "🔴", label: "Severe pain", cat: "pain",
      apply: (l) => ({ ...l, pain: mk(l.pain, { id: uid(), time: t(), score: 8, parts: [], quality: [], symptoms: [], note: "" }) }) },

    // Tetany episode — no preset type, user fills details later via tap-to-edit
    { key: "tet-episode", emoji: "⚡", label: "Tetany episode", cat: "tetany",
      apply: (l) => ({ ...l, tetany: mk(l.tetany, { id: uid(), time: t(), types: [], location: [], intensity: 1, triggers: [], helped: [] }) }) },

    // Panic attack — no preset
    { key: "panic", emoji: "😰", label: "Panic attack", cat: "panic",
      apply: (l) => ({ ...l, panic: mk(l.panic, { id: uid(), time: t(), intensity: 1, physical: [], cognitive: [], trigger: "", hyperventilation: "unknown", tetanyPresent: false, helped: [] }) }) },

    // ŠukŠuk — always logs sex, user can complete later
    { key: "sex", emoji: "❤️", label: "ŠukŠuk", cat: "sex",
      apply: (l) => ({ ...l, sex: mk(l.sex, { id: uid(), time: t(), kind: "sex" }) }) },

    // Histamine flare → Food entry named "Histamine flare"
    { key: "hist-flare", emoji: "🔥", label: "Histamine flare", cat: "food",
      apply: (l) => ({ ...l, food: mk(l.food, { id: uid(), time: t(), what: "Histamine flare", feelings: [] }) }) },
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
    <div className="mt-3 px-5">
      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Quick log · tap to log now, long-press for details</p>
      <div
        className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
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
