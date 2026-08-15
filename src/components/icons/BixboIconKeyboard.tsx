import { useEffect, useMemo, useState } from "react";
import { BixboIcon } from "./BixboIcon";

const GROUPS = [
  { id: "faces", label: "Faces", items: ["😀","😂","🥰","😢","😡","😴","🤒","🥵","🥶"] },
  { id: "hearts", label: "Hearts", items: ["❤️","🩷","🧡","💛","💚","💙","🩵","💜","🤎","🖤","🤍","💔","💕","💖"] },
  { id: "people", label: "People", items: ["👤","👩","👨","🧑","👶","👵","👴","👥","👫","👭","👬","🫶","🙏","👍","👎","👏"] },
  { id: "health", label: "Health", items: ["💊","💉","🩹","🩺","🧬","🌡️","🩸","💤","🛏️","🧠","⚡","🔥"] },
  { id: "food", label: "Food", items: ["🍎","🍌","🫐","🍓","🍞","🍝","🍚","🍕","🥚","🧀","🐟","🥩","🍗","🥗","🍲","🥛","☕","🍵","🥪","🍰","🧁"] },
  { id: "nature", label: "Nature", items: ["🌸","🌷","🌹","🌻","🌳","🌲","🌴","🌵","🪴","🌿","🍃","☀️","☁️","🌧️","❄️","🌈"] },
  { id: "animals", label: "Animals", items: ["🐶","🐱","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸","🐧","🦋","🐢","🐠","🐬","🐘"] },
  { id: "activity", label: "Activity", items: ["👟","🏃","🚶","🏋️","🧘","🏊","🚴","⚽","🏀","🎾","🏆","🥇"] },
  { id: "places", label: "Travel", items: ["🚗","🚕","🚌","🚑","🚲","✈️","🚀","🚁","🏠","🏥","🏨","🏫"] },
  { id: "objects", label: "Objects", items: ["📱","💻","📷","🎥","🎵","🎧","📖","📝","📅","✅","🔒","🔑","💰","🎁","🎉","⭐","✨","⚠️"] },
] as const;

type EditableTarget = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

function isEditable(target: EventTarget | null): target is EditableTarget {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return ["text", "search", "email", "url", "tel", ""].includes(target.type);
  }
  return target.isContentEditable;
}

function insertInto(target: EditableTarget, value: string) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    target.setRangeText(value, start, end, "end");
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    target.focus();
    return;
  }

  target.focus();
  document.execCommand("insertText", false, value);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
}

export function BixboIconKeyboard() {
  const [target, setTarget] = useState<EditableTarget | null>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("faces");

  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      if (isEditable(event.target)) setTarget(event.target);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  const active = useMemo(() => GROUPS.find((item) => item.id === group) ?? GROUPS[0], [group]);
  if (!target) return null;

  return (
    <>
      <button
        type="button"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] right-4 z-[880] grid h-11 w-11 place-items-center rounded-full border border-border/70 bg-background shadow-lg lg:bottom-5 lg:right-5"
        aria-label="BIXBO icons"
        title="BIXBO icons"
      >
        <BixboIcon emoji="✨" size={23} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[890] flex items-end justify-center bg-black/25 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:items-center" onPointerDown={() => setOpen(false)}>
          <section className="w-full max-w-[430px] overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">BIXBO ICONS</p>
                <p className="text-sm font-bold text-foreground">Choose an icon</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-tint text-lg font-bold">×</button>
            </div>

            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {GROUPS.map((item) => (
                <button key={item.id} type="button" onClick={() => setGroup(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${group === item.id ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid max-h-[42dvh] grid-cols-7 gap-1 overflow-y-auto p-3 sm:grid-cols-8">
              {active.items.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => { insertInto(target, emoji); setOpen(false); }}
                  className="grid aspect-square place-items-center rounded-2xl bg-tint/55 ring-1 ring-border/45 transition active:scale-95"
                  aria-label={`Insert ${emoji}`}
                >
                  <BixboIcon emoji={emoji} size={28} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
