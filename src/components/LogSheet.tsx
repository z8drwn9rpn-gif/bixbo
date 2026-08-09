import { useState, useMemo, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Ico } from "@/components/icons/BixboIcons";
import { isCycleTrackingHidden, type BixboData } from "@/lib/storage";
import { X, Plus, ChevronLeft, GripVertical, Check, ChevronUp, ChevronDown } from "lucide-react";
import { computeRadialSlots } from "@/lib/radialSlots";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;
type Category =
  | "postpartum" | "meds" | "pain" | "panic" | "tetany" | "period"
  | "sex" | "heat" | "food" | "bowel" | "workout" | "temp" | "task" | "event" | "note";

const CATEGORIES: { id: Category; label: string; emoji: string; hint: string }[] = [
  { id: "postpartum", label: "Postpartum", emoji: "🤱", hint: "Recovery symptoms · notes" },
  { id: "pain", label: "Pain", emoji: "🔥", hint: "0–10, body, quality" },
  { id: "period", label: "Blueberry", emoji: "🫐", hint: "Flow · discharge · notes" },
  { id: "heat", label: "Heat", emoji: "♨️", hint: "Heating, ice or TENS session" },
  { id: "food", label: "Food", emoji: "🍽️", hint: "What & how you feel" },
  { id: "bowel", label: "Bowel", emoji: "💩", hint: "Bristol type" },
  { id: "sex", label: "ŠukŠuk!", emoji: "❤️", hint: "All kinds of activity" },
  { id: "workout", label: "Workout", emoji: "🧘‍♀️", hint: "Type · duration · weight" },
  { id: "temp", label: "Vitals", emoji: "🌡️", hint: "°C · kg · hours" },
  { id: "meds", label: "Meds", emoji: "💊", hint: "Taken · extra dose" },
  { id: "event", label: "Event", emoji: "📅", hint: "Multi-day · time · note" },
  { id: "task", label: "Task", emoji: "✅", hint: "To-do with date & time" },
  { id: "note", label: "Note", emoji: "📝", hint: "Any thought for today" },
];

export function LogSheet({
  open, onOpenChange, date, data, update, initial,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  date: string;
  data: BixboData;
  update: UpdateFn;
  initial?: Category;
  initialPain?: unknown;
  editEntry?: unknown;
}) {
  const [cat, setCat] = useState<Category | null>(initial ?? null);
  const [editingOrder, setEditingOrder] = useState(false);
  const close = () => { setCat(null); setEditingOrder(false); onOpenChange(false); };
  const back = () => setCat(null);
  const active = cat ?? initial;

  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const postpartumActive = Boolean(data.postpartum?.active);

  const orderedCats = useMemo(() => {
    const saved = data.settings.logOrder ?? [];
    const source = CATEGORIES.filter((category) => {
      if (category.id === "period" && cycleTrackingHidden) return false;
      if (category.id === "postpartum" && !postpartumActive) return false;
      return true;
    });
    const byId = new Map(source.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const out: typeof CATEGORIES = [];
    for (const id of saved) {
      const c = byId.get(id as Category);
      if (c && !seen.has(id)) { out.push(c); seen.add(id); }
    }
    for (const c of source) if (!seen.has(c.id)) out.push(c);
    return out;
  }, [cycleTrackingHidden, data.settings.logOrder, postpartumActive]);

  const radialSlots = useMemo(
    () => computeRadialSlots(orderedCats.length),
    [orderedCats.length],
  );

  const moveCat = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= orderedCats.length) return;
    const next = orderedCats.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    update((d) => ({ ...d, settings: { ...d.settings, logOrder: next.map((c) => c.id) } }));
  };

  return (
    <Sheet open={open} onOpenChange={(b) => { if (!b) close(); }}>
      <SheetContent
        side="bottom"
        className={
          (active
            ? "flex h-[100dvh] max-h-[100dvh] flex-col rounded-t-none bg-background p-0 pt-0"
            : "fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100dvh] !max-h-none !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0 !shadow-none") + " [&>button.absolute]:hidden"
        }
      >
        {!active ? (
          <>
            <SheetTitle className="sr-only">Log</SheetTitle>
            <button type="button" aria-label="Close log menu" onClick={close} className="absolute inset-0 z-0 cursor-default bg-transparent" />
            {editingOrder ? (
              <section
                className="absolute left-1/2 z-20 flex max-h-[70dvh] w-[min(88vw,340px)] -translate-x-1/2 flex-col overflow-hidden rounded-[1.6rem] border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
                style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 88px)" }}
              >
                <div className="relative flex h-12 shrink-0 items-center justify-center border-b border-border/60 px-3">
                  <SheetTitle className="font-serif text-lg">Reorder Log</SheetTitle>
                  <button type="button" onClick={() => setEditingOrder(false)} className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-[10px] font-semibold text-foreground">
                    <Check className="h-3.5 w-3.5" /> Done
                  </button>
                </div>
                <ul className="m-0 min-h-0 flex-1 list-none divide-y divide-border/60 overflow-y-auto bg-surface/65 p-2">
                  {orderedCats.map((c, i) => (
                    <li key={c.id} className="first:rounded-t-xl last:rounded-b-xl">
                      <div className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-surface/80 px-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint ring-1 ring-border/60">
                          <Ico e={c.emoji} size={21} />
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{c.label}</p>
                        <button type="button" onClick={() => moveCat(i, -1)} disabled={i === 0} className="rounded-full p-1.5 hover:bg-tint disabled:opacity-30" aria-label={`Move ${c.label} up`}>
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveCat(i, 1)} disabled={i === orderedCats.length - 1} className="rounded-full p-1.5 hover:bg-tint disabled:opacity-30" aria-label={`Move ${c.label} down`}>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                <div className="absolute left-1/2 h-[460px] w-[440px] max-w-[100vw] -translate-x-1/2" style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 36px)" }}>
                  <svg aria-hidden="true" viewBox="-220 -430 440 460" className="pointer-events-none absolute bottom-0 left-1/2 h-[460px] w-[440px] max-w-[100vw] -translate-x-1/2 overflow-visible">
                    {orderedCats.slice(0, 13).map((c, index) => {
                      const slot = radialSlots[index] ?? { x: 0, up: 210 };
                      return (
                        <line key={`line-${c.id}`} x1="0" y1="0" x2={slot.x} y2={-Math.max(34, slot.up - 26)} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 5" opacity="0.34" />
                      );
                    })}
                  </svg>
                  {orderedCats.slice(0, 13).map((c, index) => {
                    const slot = radialSlots[index] ?? { x: 0, up: 210 };
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setEditingOrder(false); setCat(c.id); }}
                        aria-label={`Log ${c.label}`}
                        className="pointer-events-auto absolute z-20 flex w-[76px] flex-col items-center gap-1.5 text-center outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ left: "50%", bottom: 0, transform: `translate(calc(-50% + ${slot.x}px), -${slot.up}px)` }}
                      >
                        <span className="grid h-[54px] w-[54px] place-items-center rounded-full border border-border/70 bg-surface/90 shadow-[0_7px_18px_rgba(0,0,0,0.24)] ring-[3px] ring-background/55 backdrop-blur-md">
                          <Ico e={c.emoji} size={30} />
                        </span>
                        <span className="max-w-[72px] text-[10px] font-semibold leading-[1.05] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setEditingOrder(true)} className="pointer-events-auto absolute bottom-[-4px] left-3 z-30 flex items-center gap-1 rounded-full border border-white/20 bg-black/20 px-2.5 py-1.5 text-[9px] font-semibold text-white/85 shadow-sm backdrop-blur-md" aria-label="Reorder log categories">
                    <GripVertical className="h-3 w-3" /> Reorder
                  </button>
                  <button type="button" onClick={close} aria-label="Close Log" className="pointer-events-auto absolute bottom-0 left-1/2 z-40 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_7px_rgba(235,240,210,0.42),0_8px_28px_rgba(0,0,0,0.32)] ring-2 ring-background/80 transition active:scale-95">
                    <Plus className="h-8 w-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-5 pb-2 h-[calc(40px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]">
              <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground">
                <ChevronLeft className="h-4 w-4" /> Back to Log
              </button>
              <SheetTitle className="font-serif text-lg">{CATEGORIES.find((c) => c.id === active)?.label}</SheetTitle>
              <button onClick={close} aria-label="Close" className="rounded-full p-1 hover:bg-tint">
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-6">
              <p className="text-center text-sm text-muted-foreground">
                Form for <strong>{CATEGORIES.find((c) => c.id === active)?.label}</strong> is being restored.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
