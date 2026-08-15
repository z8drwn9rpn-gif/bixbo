import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BixboIcon } from "./BixboIcon";

const GROUPS = [
  { id: "faces", label: "Faces", items: ["😀", "😂", "🥰", "😈", "😢", "😡", "😴", "🤒", "🥵", "🥶"] },
  { id: "hearts", label: "Hearts", items: ["❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🤎", "🖤", "🤍", "💔", "💕", "💖"] },
  { id: "people", label: "People", items: ["👤", "👩", "👨", "🧑", "👶", "👵", "👴", "👥", "👫", "👭", "👬", "🫶", "🙏", "👍", "👎", "👏"] },
  { id: "health", label: "Health", items: ["💊", "💉", "🩹", "🩺", "🧬", "🌡️", "🩸", "💤", "🌙", "🛏️", "🧠", "⚡", "🔥", "💩"] },
  { id: "food", label: "Food", items: ["🍎", "🍌", "🫐", "🍓", "🍞", "🍝", "🍚", "🍕", "🥚", "🧀", "🐟", "🥩", "🍗", "🥗", "🍲", "🥛", "☕", "🍵", "🥪", "🍰", "🧁"] },
  { id: "nature", label: "Nature", items: ["🌸", "🌷", "🌹", "🌻", "🌳", "🌲", "🌴", "🌵", "🪴", "🌿", "🍃", "☀️", "☁️", "🌧️", "❄️", "🌈"] },
  { id: "animals", label: "Animals", items: ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐧", "🦋", "🐢", "🐠", "🐬", "🐘"] },
  { id: "activity", label: "Activity", items: ["👟", "🏃", "🚶", "🏋️", "🧘", "🏊", "🚴", "⚽", "🏀", "🎾", "🏆", "🥇"] },
  { id: "places", label: "Travel", items: ["🚗", "🚕", "🚌", "🚑", "🚲", "✈️", "🚀", "🚁", "🏠", "🏥", "🏨", "🏫"] },
  { id: "objects", label: "Objects", items: ["📱", "💻", "📷", "🎥", "🎵", "🎧", "📖", "📝", "📅", "✅", "🔒", "🔑", "💰", "🎁", "🎉", "⭐", "✨", "⚠️"] },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

export function BixboInlinePicker({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (emoji: string) => void;
}) {
  const [group, setGroup] = useState<GroupId>("faces");
  const active = useMemo(() => GROUPS.find((item) => item.id === group) ?? GROUPS[0], [group]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-bixbo-icon-keyboard
      className="fixed inset-0 z-[2147483002] flex items-end justify-center bg-black/25 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="BIXBO icons"
        className="w-full max-w-[430px] overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">BIXBO ICONS</p>
            <p className="text-sm font-bold text-foreground">Choose an icon</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 touch-manipulation select-none place-items-center rounded-full bg-tint text-lg font-bold"
            aria-label="Close BIXBO icons"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {GROUPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
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
              onClick={() => onChoose(emoji)}
              className="grid aspect-square touch-manipulation select-none place-items-center rounded-2xl bg-tint/55 ring-1 ring-border/45 transition active:scale-95"
              aria-label={`Insert ${emoji}`}
            >
              <BixboIcon emoji={emoji} size={28} />
            </button>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}
