import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BixboIcon } from "./BixboIcon";
import { bixboNativeGlyphForEmoji } from "./BixboTextGlyphs";

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
type CaretSnapshot =
  | { kind: "text"; start: number; end: number }
  | { kind: "range"; range: Range }
  | null;
type TriggerPosition = { top: number; left: number };

function isEditable(target: EventTarget | null): target is EditableTarget {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return ["text", "search", "email", "url", "tel", ""].includes(target.type);
  }
  return target.isContentEditable;
}

function ownsInlineBixboPicker(target: EditableTarget) {
  return target instanceof HTMLTextAreaElement && target.dataset.bixboRichText === "true";
}

function snapshotCaret(target: EditableTarget): CaretSnapshot {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    return { kind: "text", start, end };
  }

  const selection = document.getSelection();
  if (!selection?.rangeCount) return null;
  return { kind: "range", range: selection.getRangeAt(0).cloneRange() };
}

function insertInto(target: EditableTarget, value: string, caret: CaretSnapshot) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const saved = caret?.kind === "text" ? caret : null;
    const start = saved?.start ?? target.selectionStart ?? target.value.length;
    const end = saved?.end ?? target.selectionEnd ?? start;
    const insertion =
      target instanceof HTMLTextAreaElement && target.dataset.bixboRichText === "true"
        ? (bixboNativeGlyphForEmoji(value) ?? value)
        : value;

    target.setRangeText(insertion, start, end, "end");
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    return;
  }

  if (caret?.kind === "range") {
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(caret.range);
  }
  document.execCommand("insertText", false, value);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
}

export function BixboIconKeyboard() {
  const [target, setTarget] = useState<EditableTarget | null>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("faces");
  const [mounted, setMounted] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<TriggerPosition | null>(null);
  const caretRef = useRef<CaretSnapshot>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    setMounted(true);

    const onFocus = (event: FocusEvent) => {
      if (isEditable(event.target)) setTarget(event.target);
    };

    const onPointerDown = (event: PointerEvent) => {
      const node = event.target instanceof HTMLElement ? event.target : null;
      if (node?.closest("[data-bixbo-icon-keyboard]")) return;

      // Time/date/range controls must never inherit the previous BIXBO target.
      // Keep the last text target only while the picker itself is open.
      if (!isEditable(event.target) && !openRef.current) setTarget(null);
    };

    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  useEffect(() => {
    if (!target || open || typeof window === "undefined" || ownsInlineBixboPicker(target)) {
      setTriggerPosition(null);
      return;
    }

    let frame = 0;
    const measurePosition = () => {
      frame = 0;
      if (!target.isConnected) {
        setTarget(null);
        setTriggerPosition(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        setTriggerPosition(null);
        return;
      }

      const buttonSize = 44;
      const inset = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
        setTriggerPosition(null);
        return;
      }

      const next = {
        top: Math.min(Math.max(rect.top + inset, inset), Math.max(inset, viewportHeight - buttonSize - inset)),
        left: Math.min(
          Math.max(rect.right - buttonSize - inset, inset),
          Math.max(inset, viewportWidth - buttonSize - inset),
        ),
      };

      setTriggerPosition((current) =>
        current && Math.abs(current.top - next.top) < 1 && Math.abs(current.left - next.left) < 1
          ? current
          : next,
      );
    };

    const scheduleMeasure = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measurePosition);
    };

    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    // Capture inner log scrolling too, but collapse all scroll events into one
    // animation-frame measurement. Do not subscribe to VisualViewport: iOS fires
    // those events repeatedly while its keyboard/caret is animating.
    window.addEventListener("scroll", scheduleMeasure, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [target, open]);

  const active = useMemo(() => GROUPS.find((item) => item.id === group) ?? GROUPS[0], [group]);

  if (!mounted || !target || typeof document === "undefined") return null;

  const dialog = target.closest<HTMLElement>("[role=\"dialog\"]");

  const focusDialogInsteadOfEditor = () => {
    if (target.isConnected) target.blur();
    if (dialog?.isConnected) dialog.focus({ preventScroll: true });
  };

  const closePicker = () => {
    caretRef.current = null;
    openRef.current = false;
    setOpen(false);
    requestAnimationFrame(focusDialogInsteadOfEditor);
  };

  const togglePicker = () => {
    if (openRef.current) {
      closePicker();
      return;
    }

    caretRef.current = snapshotCaret(target);
    openRef.current = true;
    setOpen(true);

    // Keep focus inside the Radix dialog, but off every input. This dismisses the
    // iOS keyboard without allowing the dialog focus scope to restore the textarea.
    requestAnimationFrame(() => {
      focusDialogInsteadOfEditor();
      window.setTimeout(focusDialogInsteadOfEditor, 80);
    });
  };

  const chooseIcon = (emoji: string) => {
    insertInto(target, emoji, caretRef.current);
    caretRef.current = null;
    openRef.current = false;
    setOpen(false);
    requestAnimationFrame(focusDialogInsteadOfEditor);
  };

  const picker = (
    <div data-bixbo-icon-keyboard className="pointer-events-none fixed inset-0 z-[2147483000]">
      {!open && triggerPosition ? (
        <button
          type="button"
          data-bixbo-icon-trigger
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            event.stopPropagation();
            togglePicker();
          }}
          className="pointer-events-auto absolute z-[2147483001] grid h-11 w-11 touch-manipulation select-none place-items-center rounded-full border border-border/70 bg-background shadow-lg active:scale-95"
          style={{ top: triggerPosition.top, left: triggerPosition.left }}
          aria-label="BIXBO icons"
          title="BIXBO icons"
        >
          <BixboIcon emoji="✨" size={23} />
        </button>
      ) : null}

      {open ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[2147483002] flex items-end justify-center bg-black/25 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:items-center"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.target === event.currentTarget) closePicker();
          }}
        >
          <section
            tabIndex={-1}
            className="w-full max-w-[430px] touch-pan-y overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-2xl outline-none"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">BIXBO ICONS</p>
                <p className="text-sm font-bold text-foreground">Choose an icon</p>
              </div>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onPointerUp={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closePicker();
                }}
                className="grid h-9 w-9 touch-manipulation select-none place-items-center rounded-full bg-tint text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto px-3 py-2">
              {GROUPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setGroup(item.id);
                  }}
                  className={`shrink-0 touch-manipulation select-none rounded-full px-3 py-1.5 text-[11px] font-bold ${group === item.id ? "bg-primary text-primary-foreground" : "bg-tint text-foreground"}`}
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
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    chooseIcon(emoji);
                  }}
                  className="grid aspect-square touch-manipulation select-none place-items-center rounded-2xl bg-tint/55 ring-1 ring-border/45 transition active:scale-95"
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

  // The shared Sheet component explicitly ignores outside events originating
  // from this keyboard, so rendering at body level avoids transformed-dialog
  // positioning bugs on iOS while keeping the log open.
  return createPortal(picker, document.body);
}
