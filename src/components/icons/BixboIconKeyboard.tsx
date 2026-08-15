import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BixboIcon } from "./BixboIcon";

const GROUPS = [
  { id: "faces", label: "Faces", items: ["😀","😂","🥰","😈","😢","😡","😴","🤒","🥵","🥶"] },
  { id: "hearts", label: "Hearts", items: ["❤️","🩷","🧡","💛","💚","💙","🩵","💜","🤎","🖤","🤍","💔","💕","💖"] },
  { id: "people", label: "People", items: ["👤","👩","👨","🧑","👶","👵","👴","👥","👫","👭","👬","🫶","🙏","👍","👎","👏"] },
  { id: "health", label: "Health", items: ["💊","💉","🩹","🩺","🧬","🌡️","🩸","💤","🌙","🛏️","🧠","⚡","🔥","💩"] },
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
    return;
  }

  document.execCommand("insertText", false, value);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
}

export function BixboIconKeyboard() {
  const [target, setTarget] = useState<EditableTarget | null>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("faces");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const onFocus = (event: FocusEvent) => {
      if (isEditable(event.target)) {
        setTarget(event.target);
        return;
      }
      const node = event.target instanceof HTMLElement ? event.target : null;
      if (!node?.closest("[data-bixbo-icon-keyboard]")) setTarget(null);
    };

    const onPointerDown = (event: PointerEvent) => {
      const node = event.target instanceof HTMLElement ? event.target : null;
      if (node?.closest("[data-bixbo-icon-keyboard]")) return;
      if (!isEditable(event.target) && !open) setTarget(null);
    };

    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const active = useMemo(() => GROUPS.find((item) => item.id === group) ?? GROUPS[0], [group]);

  if (!mounted || !target || typeof document === "undefined") return null;

  const portalHost = target.closest<HTMLElement>("[role=\"dialog\"]") ?? document.body;

  const togglePicker = () => {
    // Closing the native iOS keyboard first makes the floating BIXBO control a
    // reliable touch target in PWA/Safari. We retain `target` in React state, so
    // the selected icon can still be inserted at the saved caret position.
    target.blur();
    setOpen((value) => !value);
  };

  const picker = (
    <div data-bixbo-icon-keyboard className="pointer-events-none fixed inset-0 z-[2147483000]">
      <button
        type="button"
        data-bixbo-icon-trigger
        onTouchStart={(event) => {
          event.preventDefault();
          event.stopPropagation();
          togglePicker();
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") return;
          event.preventDefault();
          event.stopPropagation();
          togglePicker();
        }}
        className="pointer-events-auto fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] right-4 z-[2147483001] grid h-11 w-11 touch-none select-none place-items-center rounded-full border border-border/70 bg-background shadow-lg active:scale-95 lg:bottom-5 lg:right-5"
        aria-label="BIXBO icons"
        title="BIXBO icons"
      >
        <BixboIcon emoji="✨" size={23} />
      </button>

      {open ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[2147483002] flex touch-none items-end justify-center bg-black/25 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:items-center"
          onTouchStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.target === event.currentTarget) setOpen(false);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "touch") return;
            event.preventDefault();
            event.stopPropagation();
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="w-full max-w-[430px] touch-pan-y overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-2xl"
            onTouchStart={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">BIXBO ICONS</p>
                <p className="text-sm font-bold text-foreground">Choose an icon</p>
              </div>
              <button
                type="button"
                onTouchStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                }}
                onPointerDown={(event) => {
                  if (event.pointerType === "touch") return;
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                }}
                className="grid h-9 w-9 touch-none select-none place-items-center rounded-full bg-tint text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {GROUPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onTouchStart={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setGroup(item.id);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "touch") return;
                    event.preventDefault();
                    event.stopPropagation();
                    setGroup(item.id);
                  }}
                  className={`shrink-0 touch-none select-none rounded-full px-3 py-1.5 text-[11px] font-bold ${group === item.id ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid max-h-[42dvh] grid-cols-7 gap-1 overflow-y-auto p-3 sm:grid-cols-8">
              {active.items.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onTouchStart={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    insertInto(target, emoji);
                    setOpen(false);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "touch") return;
                    event.preventDefault();
                    event.stopPropagation();
                    insertInto(target, emoji);
                    setOpen(false);
                  }}
                  className="grid aspect-square touch-none select-none place-items-center rounded-2xl bg-tint/55 ring-1 ring-border/45 transition active:scale-95"
                  aria-label={`Insert ${emoji}`}
                >
                  <BixboIcon emoji={emoji} size={28} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );

  return createPortal(picker, portalHost);
}
