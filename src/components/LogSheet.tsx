import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Ico, IcoText } from "@/components/icons/BixboIcons";
import { POSTPARTUM_SYMPTOMS } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Plus, ChevronLeft, ChevronUp, ChevronDown, GripVertical, Check, Pencil } from "lucide-react";
import {
  PAIN_DESCRIPTIONS,
  painColor,
  BODY_PARTS_DEFAULT,
  PAIN_QUALITY_DEFAULT,
  OTHER_SYMPTOMS_DEFAULT,
  FOOD_FEELINGS_DEFAULT,
  WORKOUT_KINDS_DEFAULT,
  BRISTOL,
  DISCHARGE_OPTS,
  MOODS_DEFAULT,
  TETANY_TYPES,
  TETANY_TYPE_DESC,
  TETANY_LOCATIONS_DEFAULT,
  TETANY_TRIGGERS,
  TETANY_HELPED_DEFAULT,
  HEADACHE_TYPES,
  HEADACHE_TYPE_DESC,
  PRESSURE_TYPES,
  NAUSEA_TYPES,
  NAUSEA_TYPE_DESC,
  NAUSEA_SEVERITY_DESC,
  NAUSEA_TRIGGERS,
  NAUSEA_SYMPTOMS,
  NAUSEA_HELPED,
  PANIC_PHYSICAL,
  PANIC_COGNITIVE,
  PANIC_HELPED_DEFAULT,
  SEX_TYPES_DEFAULT,
  BODY_BATTERY,
  SLEEP_QUALITY,
  SEX_FEELINGS_DEFAULT,
  EVENT_COLORS,
  BOWEL_FEELINGS_DEFAULT,
  BOWEL_SYMPTOMS_DEFAULT,
  PCOS_SYMPTOMS,
  HISTAMINE_SYMPTOMS,
  FOOD_SYMPTOMS_AFTER,
  todayKey,
  nowHHMM,
  updateDayLog,
  asArr,
  workoutHasDistance,
  workoutIsHike,
  workoutIsStrength,
  pregnancyInfo,
  isCycleTrackingHidden,
  URINARY_DEFAULT,
  ALLERGENS_DEFAULT,
  type BixboData,
  type DayLog,
  type PainEntry,
  type PeriodLevel,
  type FoodEntry,
  type BowelEntry,
  type ThermoSession,
  type ThermoKind,
  type SexEntry,
  type SexKind,
  type ExtraMed,
  type WorkoutEntry,
  type WorkoutExercise,
  type EventEntry,
  type TaskEntry,
  type TetanyEpisode,
  type PanicAttack,
  type PainfulWhen,
  type PostpartumDayLog,
  withCustomTombstones,
  withoutCustomTombstones,
} from "@/lib/storage";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;
type Category =
  | "postpartum"
  | "meds"
  | "pain"
  | "panic"
  | "tetany"
  | "period"
  | "sex"
  | "heat"
  | "food"
  | "bowel"
  | "workout"
  | "temp"
  | "task"
  | "event"
  | "note";

const CATEGORIES: { id: Category; label: string; emoji: string; hint: string }[] = [
  { id: "postpartum", label: "Postpartum symptoms", emoji: "🤱", hint: "Recovery symptoms · notes" },
  { id: "pain", label: "Pain", emoji: "🔥", hint: "0–10, body, quality" },
  { id: "period", label: "Blueberry", emoji: "🫐", hint: "Flow · discharge · notes" },
  { id: "heat", label: "Heat / Cold / TENS session", emoji: "♨️", hint: "Heating, ice or TENS session" },
  { id: "food", label: "Food", emoji: "🍽️", hint: "What & how you feel" },
  { id: "bowel", label: "Bowel", emoji: "💩", hint: "Bristol type" },
  { id: "sex", label: "ŠukŠuk!", emoji: "❤️", hint: "All kinds of activity" },
  { id: "workout", label: "Workout", emoji: "🧘🏼‍♀️", hint: "Type · duration · weight" },
  { id: "temp", label: "Temp / Sleep / Weight", emoji: "🌡️", hint: "°C · kg · hours" },
  { id: "meds", label: "Meds", emoji: "💊", hint: "Taken · extra dose" },
  { id: "event", label: "Event", emoji: "📅", hint: "Multi-day · time · note" },
  { id: "task", label: "Task", emoji: "✅", hint: "To-do with date & time" },
  { id: "note", label: "Note", emoji: "📝", hint: "Any thought for today" },
];

export function LogSheet({
  open,
  onOpenChange,
  date,
  data,
  update,
  initial,
  initialPain,
  editEntry,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  date: string;
  data: BixboData;
  update: UpdateFn;
  initial?: Category;
  initialPain?: PainEntry;
  editEntry?: unknown;
}) {
  const [cat, setCat] = useState<Category | null>(initial ?? null);
  const [openToken, setOpenToken] = useState(0);
  useEffect(() => {
    if (open) setOpenToken((t) => t + 1);
  }, [open]);
  const [editingOrder, setEditingOrder] = useState(false);
  const close = () => {
    setCat(null);
    setEditingOrder(false);
    onOpenChange(false);
  };
  const back = () => setCat(null);
  const active = cat ?? initial;
  const edit = editEntry;

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
      if (c && !seen.has(id)) {
        out.push(c);
        seen.add(id);
      }
    }
    for (const c of source) if (!seen.has(c.id)) out.push(c);
    return out;
  }, [cycleTrackingHidden, data.settings.logOrder, postpartumActive]);

  const moveCat = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= orderedCats.length) return;
    const next = orderedCats.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    update((d) => ({ ...d, settings: { ...d.settings, logOrder: next.map((c) => c.id) } }));
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(b) => {
        if (!b) close();
      }}
    >
      <SheetContent
        side="bottom"
        className={
          (active
            ? `flex h-[100dvh] max-h-[100dvh] flex-col rounded-t-none bg-background p-0 ${
                active === "pain" ? "pt-[env(safe-area-inset-top)]" : "pt-0"
              }`
            : "fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100dvh] !max-h-none !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0 !shadow-none") + " [&>button.absolute]:hidden"
        }
      >
        {!active ? (
          <>
            <SheetTitle className="sr-only">Log</SheetTitle>

            <button
              type="button"
              aria-label="Close log menu"
              onClick={close}
              className="absolute inset-0 z-0 cursor-default bg-transparent"
            />

            {editingOrder ? (
              <section
                className="absolute left-1/2 z-20 flex max-h-[70dvh] w-[min(88vw,340px)] -translate-x-1/2 flex-col overflow-hidden rounded-[1.6rem] border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
                style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 88px)" }}
              >
                <div className="relative flex h-12 shrink-0 items-center justify-center border-b border-border/60 px-3">
                  <SheetTitle className="font-serif text-lg">Reorder Log</SheetTitle>
                  <button
                    type="button"
                    onClick={() => setEditingOrder(false)}
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-[10px] font-semibold text-foreground"
                  >
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
                        <button
                          type="button"
                          onClick={() => moveCat(i, -1)}
                          disabled={i === 0}
                          className="rounded-full p-1.5 hover:bg-tint disabled:opacity-30"
                          aria-label={`Move ${c.label} up`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCat(i, 1)}
                          disabled={i === orderedCats.length - 1}
                          className="rounded-full p-1.5 hover:bg-tint disabled:opacity-30"
                          aria-label={`Move ${c.label} down`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                <div
                  className="absolute left-1/2 h-[455px] w-[390px] max-w-[100vw] -translate-x-1/2"
                  style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 36px)" }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="-195 -435 390 455"
                    className="pointer-events-none absolute bottom-0 left-1/2 h-[455px] w-[390px] max-w-[100vw] -translate-x-1/2 overflow-visible"
                  >
                    {orderedCats.slice(0, 13).map((c, index) => {
                      const slots = [
                      // Compact radial fan, matching the reference image:
                      // highest in the middle, lower toward the sides, all converging to Log.
                      { x: 0, up: 385 },
                      { x: -82, up: 355 },
                      { x: 82, up: 355 },
                      { x: -132, up: 305 },
                      { x: 132, up: 305 },
                      { x: -158, up: 245 },
                      { x: 158, up: 245 },
                      { x: -166, up: 182 },
                      { x: 166, up: 182 },
                      { x: -138, up: 118 },
                      { x: 138, up: 118 },
                      { x: -78, up: 68 },
                      { x: 0, up: 118 },
                    ];
                      const slot = slots[index] ?? { x: 0, up: 210 };
                      return (
                        <line
                          key={`line-${c.id}`}
                          x1="0"
                          y1="0"
                          x2={slot.x}
                          y2={-Math.max(34, slot.up - 26)}
                          stroke="var(--muted-foreground)"
                          strokeWidth="1"
                          strokeDasharray="3 5"
                          opacity="0.34"
                        />
                      );
                    })}
                  </svg>

                  {orderedCats.slice(0, 13).map((c, index) => {
                    const slots = [
                      // Compact radial fan, matching the reference image:
                      // highest in the middle, lower toward the sides, all converging to Log.
                      { x: 0, up: 385 },
                      { x: -82, up: 355 },
                      { x: 82, up: 355 },
                      { x: -132, up: 305 },
                      { x: 132, up: 305 },
                      { x: -158, up: 245 },
                      { x: 158, up: 245 },
                      { x: -166, up: 182 },
                      { x: 166, up: 182 },
                      { x: -138, up: 118 },
                      { x: 138, up: 118 },
                      { x: -78, up: 68 },
                      { x: 0, up: 118 },
                    ];
                    const slot = slots[index] ?? { x: 0, up: 210 };
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setEditingOrder(false);
                          setCat(c.id);
                        }}
                        aria-label={`Log ${c.label}`}
                        className="pointer-events-auto absolute z-20 flex w-[72px] flex-col items-center gap-1 text-center outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          left: "50%",
                          bottom: 0,
                          transform: `translate(calc(-50% + ${slot.x}px), -${slot.up}px)`,
                        }}
                      >
                        <span className="grid h-[50px] w-[50px] place-items-center rounded-full border border-border/70 bg-surface/90 shadow-[0_6px_16px_rgba(0,0,0,0.22)] ring-[3px] ring-background/55 backdrop-blur-md">
                          <Ico e={c.emoji} size={27} />
                        </span>
                        <span className="max-w-[74px] text-[10px] font-semibold leading-[1.04] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.78)]">
                          {c.label}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setEditingOrder(true)}
                    className="pointer-events-auto absolute bottom-[-4px] left-3 z-30 flex items-center gap-1 rounded-full border border-white/20 bg-black/20 px-2.5 py-1.5 text-[9px] font-semibold text-white/85 shadow-sm backdrop-blur-md"
                    aria-label="Reorder log categories"
                  >
                    <GripVertical className="h-3 w-3" /> Reorder
                  </button>

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 z-30 h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-0 border-t-[8px] border-x-transparent border-t-background/80"
                    style={{ bottom: "38px" }}
                  />

                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close Log"
                    className="pointer-events-auto absolute bottom-0 left-1/2 z-40 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_7px_rgba(235,240,210,0.42),0_8px_28px_rgba(0,0,0,0.32)] ring-2 ring-background/80 transition active:scale-95"
                  >
                    <Plus className="h-8 w-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader
              className={`shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-5 pb-2 ${
                active === "pain"
                  ? "h-14 pt-0"
                  : "h-[calc(40px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]"
              }`}
            >
              <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground">
                <ChevronLeft className="h-4 w-4" /> Back to Log
              </button>
              <SheetTitle className="font-serif text-lg">{CATEGORIES.find((c) => c.id === active)?.label}</SheetTitle>
              <button onClick={close} aria-label="Close" className="rounded-full p-1 hover:bg-tint">
                <X className="h-5 w-5" />
              </button>
            </SheetHeader>
            <div
              key={`${active}-${openToken}-${(edit as { id?: string } | undefined)?.id ?? initialPain?.id ?? "new"}`}
              className={`min-h-0 flex-1 overflow-y-auto ${
                active === "pain" ? "pt-[60px]" : "px-5 pb-4"
              }`}
            >
              {active === "postpartum" && (
                <PostpartumSymptomsForm date={date} data={data} update={update} onDone={close} />
              )}

              {active === "pain" && (
                <PainWizard
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={initialPain ?? (edit as PainEntry | undefined)}
                />
              )}
              {active === "panic" && (
                <PanicForm
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={edit as PanicAttack | undefined}
                />
              )}
              {active === "tetany" && (
                <TetanyForm
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={edit as TetanyEpisode | undefined}
                />
              )}
              {active === "period" && <PeriodForm date={date} data={data} update={update} onDone={close} />}
              {active === "sex" && (
                <SexForm
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={edit as SexEntry | undefined}
                />
              )}
              {active === "heat" && (
                <ThermoForm
                  date={date}
                  update={update}
                  onDone={close}
                  initialEntry={edit as ThermoSession | undefined}
                />
              )}
              {active === "food" && (
                <FoodForm
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={edit as FoodEntry | undefined}
                />
              )}
              {active === "bowel" && (
                <BowelForm
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={edit as BowelEntry | undefined}
                />
              )}
              {active === "workout" && (
                <WorkoutForm
                  date={date}
                  data={data}
                  update={update}
                  onDone={close}
                  initialEntry={edit as WorkoutEntry | undefined}
                />
              )}
              {active === "temp" && <TempForm date={date} data={data} update={update} onDone={close} />}
              {active === "meds" && <MedsForm date={date} data={data} update={update} onDone={close} />}
              {active === "task" && (
                <TaskForm date={date} update={update} onDone={close} initialEntry={edit as TaskEntry | undefined} />
              )}
              {active === "event" && (
                <EventForm date={date} update={update} onDone={close} initialEntry={edit as EventEntry | undefined} />
              )}
              {active === "note" && <NoteForm date={date} update={update} onDone={close} />}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------- Primitives ------------------- */
function Field({ label, children }: { label: string; children: ReactNode }) {
  // Intentionally a <div>, not <label>. Wrapping chip/button groups in <label>
  // caused stray click activations on the first focusable descendant, which
  // manifested as chips getting "auto-selected" in the Pain wizard.
  return (
    <div className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Chip({
  active,
  onClick,
  children,
  color,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "text-white shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background scale-[1.03]"
          : "bg-tint text-foreground ring-1 ring-border"
      }`}
      style={active && color ? { background: color } : active ? { background: "var(--primary)" } : undefined}
    >
      {typeof children === "string" ? <IcoText text={children} size={14} /> : children}
    </button>
  );
}
function SaveBar({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <SheetFooter className="sticky top-0 z-30 -mx-5 mt-0 flex-row items-center justify-between gap-2 border-b border-border/50 bg-background px-5 py-1.5">
      <button
        type="button"
        onClick={onCancel}
        className="flex min-w-[58px] items-center gap-1 text-xs font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="text-sm leading-none">←</span>
        <span>Back</span>
      </button>

      <span className="min-w-0 flex-1" aria-hidden="true" />

      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="inline-flex h-8 min-w-[68px] items-center justify-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span>Save</span>
        <span aria-hidden="true" className="text-sm leading-none">✓</span>
      </button>
    </SheetFooter>
  );
}

function CustomChipList({
  base,
  custom,
  onAddCustom,
  onRemoveCustom,
  onRenameCustom,
  selected,
  onToggle,
  descriptions,
}: {
  base: string[];
  custom: string[];
  onAddCustom: (v: string) => void;
  onRemoveCustom?: (v: string) => void;
  onRenameCustom?: (oldV: string, newV: string) => void;
  selected: string[];
  onToggle: (v: string) => void;
  descriptions?: Record<string, string>;
}) {
  const [adding, setAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [text, setText] = useState("");
  const [infoFor, setInfoFor] = useState<string | null>(null);
  const canEdit = !!(onRenameCustom || onRemoveCustom) && custom.length > 0;
  return (
    <div className="mt-2">
      {(canEdit || true) && (
        <div className="mb-2 flex items-center gap-2">
          {adding ? (
            <div className="flex flex-1 items-center gap-1">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-8 flex-1"
                placeholder="Custom…"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (text.trim()) {
                    onAddCustom(text.trim());
                    setText("");
                    setAdding(false);
                  }
                }}
              >
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setText("");
                  setAdding(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" /> Add custom
            </button>
          )}
          {canEdit && !adding && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${editMode ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground hover:text-foreground"}`}
            >
              <Pencil className="h-3 w-3" /> {editMode ? "Done" : "Edit"}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {base.map((v) => (
          <span key={v} className="inline-flex items-center gap-0.5">
            <Chip active={selected.includes(v)} onClick={() => onToggle(v)} title={descriptions?.[v]}>
              {v}
            </Chip>
            {descriptions?.[v] && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoFor(infoFor === v ? null : v);
                }}
                aria-label={`Info ${v}`}
                className="grid h-4 w-4 place-items-center rounded-full bg-tint text-[10px] font-bold text-muted-foreground hover:bg-primary/15 hover:text-primary"
              >
                i
              </button>
            )}
          </span>
        ))}
        {custom.map((v) => (
          <span key={v} className="relative inline-flex items-center">
            <Chip active={selected.includes(v)} onClick={() => onToggle(v)}>
              {v}
            </Chip>
            {editMode && onRenameCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next = prompt(`Rename "${v}" to:`, v);
                  if (next && next.trim() && next.trim() !== v) onRenameCustom(v, next.trim());
                }}
                aria-label={`Rename ${v}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-primary/15 hover:text-primary"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {editMode && onRemoveCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove "${v}" from your custom list?`)) onRemoveCustom(v);
                }}
                aria-label={`Remove ${v}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {infoFor && descriptions?.[infoFor] && (
        <div className="mt-2 rounded-lg bg-tint px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
          <span className="font-semibold">{infoFor}:</span> {descriptions[infoFor]}
        </div>
      )}
    </div>
  );
}
const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
/** Strips a leading emoji (+ following space) so legacy saved values with emoji prefixes still match emoji-free option lists. */
const stripEmoji = (v: string) => v.replace(/^[\p{Extended_Pictographic}\u200d\ufe0f]+\s*/u, "").trim();

import { getScaleDesc } from "@/lib/scaleDescriptions";

function scaleColor(value: number, from: number, max: number): string {
  const span = Math.max(0.5, max - from);
  const normalized = ((value - from) / span) * 10;
  return painColor(Math.max(0, Math.min(10, normalized)));
}

function ScaleLegend({
  max,
  descriptions,
  value,
  title,
  from = 0,
}: {
  max: number;
  descriptions: Record<number, string>;
  value?: number;
  title: string;
  from?: number;
}) {
  const items: number[] = [];
  for (let i = Math.ceil(from); i <= max; i++) items.push(i);
  const activeLegendValue = value == null || value < from ? undefined : Math.round(value);

  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-surface/50 p-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1 text-[11px] leading-tight">
        {items.map((n) => (
          <div key={n} className="flex items-start gap-2">
            <span
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
              style={{ background: scaleColor(n, from, max) }}
            >
              {n}
            </span>
            <span className={activeLegendValue === n ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {descriptions[n]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntensityScale({
  value,
  onChange,
  max,
  descriptions,
  legendTitle,
  from = 0,
  compactSingleRow = false,
  step = 0.5,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  descriptions?: Record<number, string>;
  legendTitle?: string;
  from?: number;
  compactSingleRow?: boolean;
  step?: number;
}) {
  const nums = Array.from(
    { length: Math.floor((max - from) / step) + 1 },
    (_, i) => Number((from + i * step).toFixed(1)),
  );

  const roundedValue = Math.round(value);
  const selectedDescription = descriptions?.[roundedValue];

  return (
    <div className="mt-2 space-y-1.5">
      <div
        className={
          compactSingleRow
            ? "flex flex-nowrap items-center justify-center gap-0.5 px-0"
            : "flex flex-wrap justify-center gap-1.5 px-1"
        }
      >
        {nums.map((n) => {
          const active = value === n;
          const description = descriptions?.[Math.round(n)];
          const bg = scaleColor(n, from, max);

          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={description ? `${n} — ${description}` : String(n)}
              aria-label={description ? `${n} — ${description}` : `Intensity ${n}`}
              className={`${
                compactSingleRow ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]"
              } shrink-0 rounded-full font-semibold transition ${
                active ? "text-white ring-2 ring-foreground" : "text-foreground"
              }`}
              style={{ background: bg }}
            >
              {Number.isInteger(n) ? n : n.toFixed(1)}
            </button>
          );
        })}
      </div>

      {descriptions && value >= from && selectedDescription && (
        <div className="mt-2 rounded-lg bg-tint px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
          <span className="font-semibold">
            Level {Number.isInteger(value) ? value : value.toFixed(1)}:
          </span>{" "}
          {selectedDescription}
        </div>
      )}

      {descriptions && legendTitle && (
        <ScaleLegend
          max={max}
          from={from}
          descriptions={descriptions}
          value={value}
          title={legendTitle}
        />
      )}
    </div>
  );
}

function DurationField({
  minutes,
  setMinutes,
  ongoing,
  setOngoing,
}: {
  minutes: string;
  setMinutes: (s: string) => void;
  ongoing: boolean;
  setOngoing: (b: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">Duration (min)</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={ongoing ? "" : minutes}
          disabled={ongoing}
          onChange={(e) => setMinutes(e.target.value)}
          className="flex-1"
          placeholder="—"
        />
        <button
          type="button"
          onClick={() => setOngoing(!ongoing)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-border ${ongoing ? "bg-primary text-white" : "bg-tint text-foreground"}`}
        >
          Ongoing
        </button>
      </div>
    </div>
  );
}

/* ------------------- PAIN wizard ------------------- */
function PainWizard({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: PainEntry;
}) {
  /**
   * The newest pain entry for the selected day. A new entry can reuse this
   * state and only add what changed (for example a headache several hours later).
   * Editing an existing entry never uses this shortcut.
   */
  const latestPain = useMemo(() => {
    if (initialEntry) return undefined;
    const entries = data.dayLogs[date]?.pain ?? [];
    if (!entries.length) return undefined;

    return entries.reduce((latest, entry) =>
      (entry.time ?? "").localeCompare(latest.time ?? "") >= 0 ? entry : latest,
    );
  }, [data.dayLogs, date, initialEntry]);

  const [step, setStep] = useState(0);
  const [score, setScore] = useState(initialEntry?.score ?? 0);
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [parts, setParts] = useState<string[]>(initialEntry?.parts ?? []);
  const [quality, setQuality] = useState<string[]>(initialEntry?.quality ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  // Extended
  const [tetany, setTetany] = useState(false);
  const [tetanyTypes, setTetanyTypes] = useState<string[]>([]);
  const [tetanyLoc, setTetanyLoc] = useState<string[]>([]);
  const [tetanyIntensity, setTetanyIntensity] = useState(1);
  const [tetanyMin, setTetanyMin] = useState("5");
  const [tetanyOngoing, setTetanyOngoing] = useState(false);
  const [tetanyTriggers, setTetanyTriggers] = useState<string[]>([]);
  const [tetanyHelped, setTetanyHelped] = useState<string[]>([]);
  const [tetanyNote, setTetanyNote] = useState("");
  // Panic (full inline log — under Tetany)
  const [panic, setPanic] = useState(false);
  const [panicTime, setPanicTime] = useState(nowHHMM());
  const [panicIntensity, setPanicIntensity] = useState(5);
  const [panicMinutes, setPanicMinutes] = useState("10");
  const [panicOngoing, setPanicOngoing] = useState(false);
  const [panicPhysical, setPanicPhysical] = useState<string[]>([]);
  const [panicCognitive, setPanicCognitive] = useState<string[]>([]);
  const [panicTrigger, setPanicTrigger] = useState("");
  const [panicPlace, setPanicPlace] = useState("");
  const [panicHyper, setPanicHyper] = useState<"no" | "before" | "during" | "unknown">("unknown");
  const [panicTetany, setPanicTetany] = useState(false);
  const [panicHelped, setPanicHelped] = useState<string[]>([]);
  const [panicNote, setPanicNote] = useState("");
  const [bodyBattery, setBodyBattery] = useState<number | undefined>(initialEntry?.bodyBattery);
  const [stress, setStress] = useState<number | undefined>(initialEntry?.stress);
  const [mood, setMood] = useState<string[]>(initialEntry?.mood ?? []);
  const [hotFlashesOn, setHotFlashesOn] = useState<boolean>(!!initialEntry?.hotFlashesOn);
  const [hotFlashes, setHotFlashes] = useState<number | undefined>(initialEntry?.hotFlashes);
  const [headache, setHeadache] = useState<boolean>(!!initialEntry?.headache);
  const [headacheTypes, setHeadacheTypes] = useState<string[]>(initialEntry?.headacheTypes ?? []);
  const [headacheIntensity, setHeadacheIntensity] = useState<number | undefined>(initialEntry?.headacheIntensity);
  const [headacheMedOn, setHeadacheMedOn] = useState<boolean>(!!initialEntry?.headacheMed);
  const [headacheMed, setHeadacheMed] = useState<string>(initialEntry?.headacheMed ?? "");
  const [headacheMedTime, setHeadacheMedTime] = useState<string>(initialEntry?.headacheMedTime ?? nowHHMM());
  const [pcosSymptoms, setPcosSymptoms] = useState<string[]>(initialEntry?.pcosSymptoms ?? []);
  const [fluNote, setFluNote] = useState<string>(initialEntry?.fluNote ?? "");
  // Pressure detail (shown when "Pressure" quality is selected)
  const [pressureTypes, setPressureTypes] = useState<string[]>(initialEntry?.pressureTypes ?? []);
  const [pressureIntensity, setPressureIntensity] = useState<number | undefined>(initialEntry?.pressureIntensity);
  // Nausea section
  const [nausea, setNausea] = useState<boolean>(!!initialEntry?.nausea);
  const [nauseaTypes, setNauseaTypes] = useState<string[]>(initialEntry?.nauseaTypes ?? []);
  const [nauseaSeverity, setNauseaSeverity] = useState<number | undefined>(initialEntry?.nauseaSeverity);
  const [nauseaMinutes, setNauseaMinutes] = useState<string>(
    initialEntry?.nauseaMinutes != null ? String(initialEntry.nauseaMinutes) : "",
  );
  const [nauseaOngoing, setNauseaOngoing] = useState<boolean>(!!initialEntry?.nauseaOngoing);
  const [nauseaTriggers, setNauseaTriggers] = useState<string[]>(initialEntry?.nauseaTriggers ?? []);
  const [nauseaSymptoms, setNauseaSymptoms] = useState<string[]>(initialEntry?.nauseaSymptoms ?? []);
  const [nauseaHelped, setNauseaHelped] = useState<string[]>(initialEntry?.nauseaHelped ?? []);

  // Quick update: copy the latest state, use the current time and jump to symptoms.
  const [quickSymptomUpdate, setQuickSymptomUpdate] = useState(false);
  const [copiedFromTime, setCopiedFromTime] = useState<string | undefined>();
  const startSymptomUpdate = () => {
    if (!latestPain) return;

    // Core pain state.
    setScore(latestPain.score);
    setParts([...(latestPain.parts ?? [])]);
    setQuality([...(latestPain.quality ?? [])]);
    setSymptoms([...(latestPain.symptoms ?? [])]);
    setPressureTypes([...(latestPain.pressureTypes ?? [])]);
    setPressureIntensity(latestPain.pressureIntensity);

    // Body battery, stress and mood are momentary measurements. Do not duplicate
    // their older values into the new time point.
    setBodyBattery(undefined);
    setStress(undefined);
    setMood([]);

    // Carry forward symptom details; the user only changes what is new.
    setHotFlashesOn(!!latestPain.hotFlashesOn);
    setHotFlashes(latestPain.hotFlashes);
    setPcosSymptoms([...(latestPain.pcosSymptoms ?? [])]);
    setFluNote(latestPain.fluNote ?? "");

    setNausea(!!latestPain.nausea);
    setNauseaTypes([...(latestPain.nauseaTypes ?? [])]);
    setNauseaSeverity(latestPain.nauseaSeverity);
    setNauseaMinutes(latestPain.nauseaMinutes != null ? String(latestPain.nauseaMinutes) : "");
    setNauseaOngoing(!!latestPain.nauseaOngoing);
    setNauseaTriggers([...(latestPain.nauseaTriggers ?? [])]);
    setNauseaSymptoms([...(latestPain.nauseaSymptoms ?? [])]);
    setNauseaHelped([...(latestPain.nauseaHelped ?? [])]);

    // Preserve the previous headache state; this shortcut is for adding any symptoms.
    setHeadache(!!latestPain.headache);
    setHeadacheTypes([...(latestPain.headacheTypes ?? [])]);
    setHeadacheIntensity(latestPain.headacheIntensity);
    setHeadacheMedOn(!!latestPain.headacheMed);
    setHeadacheMed(latestPain.headacheMed ?? "");
    setHeadacheMedTime(latestPain.headacheMedTime ?? nowHHMM());

    // A copied note would look like a new note, so leave it blank.
    setNote("");
    setTime(nowHHMM());

    // Never duplicate separate inline episodes when carrying a pain state forward.
    setTetany(false);
    setPanic(false);

    setCopiedFromTime(latestPain.time);
    setQuickSymptomUpdate(true);
    setStep(3);
  };


  type CKey =
    | "bodyParts"
    | "quality"
    | "symptoms"
    | "moods"
    | "tetanyTypes"
    | "tetanyLocations"
    | "tetanyTriggers"
    | "tetanyHelped"
    | "pcosSymptoms"
    | "headacheTypes"
    | "pressureTypes"
    | "nauseaTypes"
    | "nauseaTriggers"
    | "nauseaSymptoms"
    | "nauseaHelped";
  const addCustom = (key: CKey, v: string) =>
    update((d) =>
      withoutCustomTombstones({ ...d, custom: { ...d.custom, [key]: [...(d.custom[key] ?? []), v] } }, key, [v]),
    );
  const removeCustom = (key: CKey, v: string) =>
    update((d) =>
      withCustomTombstones(
        { ...d, custom: { ...d.custom, [key]: (d.custom[key] ?? []).filter((x) => x !== v) } },
        key,
        [v],
      ),
    );
  const renameCustom = (key: CKey, oldV: string, newV: string) =>
    update((d) =>
      withoutCustomTombstones(
        withCustomTombstones(
          { ...d, custom: { ...d.custom, [key]: (d.custom[key] ?? []).map((x) => (x === oldV ? newV : x)) } },
          key,
          [oldV],
        ),
        key,
        [newV],
      ),
    );

  const save = () => {
    const editing = !!initialEntry;
    const p: PainEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time,
      score,
      parts,
      quality,
      symptoms,
      note: note.trim(),
      bodyBattery,
      stress,
      mood: mood.length ? mood : undefined,
      hotFlashesOn: hotFlashesOn || undefined,
      hotFlashes: hotFlashesOn ? hotFlashes : undefined,
      headache: headache || undefined,
      headacheTypes: headache && headacheTypes.length ? headacheTypes : undefined,
      headacheIntensity: headache ? headacheIntensity : undefined,
      headacheMed: headache && headacheMedOn && headacheMed.trim() ? headacheMed.trim() : undefined,
      headacheMedTime: headache && headacheMedOn && headacheMed.trim() ? headacheMedTime : undefined,
      pressureTypes: quality.includes("Pressure") && pressureTypes.length ? pressureTypes : undefined,
      pressureIntensity: quality.includes("Pressure") ? pressureIntensity : undefined,
      nausea: nausea || undefined,
      nauseaTypes: nausea && nauseaTypes.length ? nauseaTypes : undefined,
      nauseaSeverity: nausea ? nauseaSeverity : undefined,
      nauseaMinutes: nausea && !nauseaOngoing && nauseaMinutes !== "" ? Number(nauseaMinutes) : undefined,
      nauseaOngoing: nausea ? nauseaOngoing || undefined : undefined,
      nauseaTriggers: nausea && nauseaTriggers.length ? nauseaTriggers : undefined,
      nauseaSymptoms: nausea && nauseaSymptoms.length ? nauseaSymptoms : undefined,
      nauseaHelped: nausea && nauseaHelped.length ? nauseaHelped : undefined,
      fluNote: symptoms.includes("Flu") && fluNote.trim() ? fluNote.trim() : undefined,
      pcosSymptoms: pcosSymptoms.length ? pcosSymptoms : undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      pain: editing ? (l.pain ?? []).map((x) => (x.id === p.id ? p : x)) : [...(l.pain ?? []), p],
    }));
    if (tetany) {
      const t: TetanyEpisode = {
        id: crypto.randomUUID(),
        time: nowHHMM(),
        types: tetanyTypes,
        location: tetanyLoc,
        intensity: tetanyIntensity,
        minutes: tetanyOngoing ? undefined : tetanyMin === "" ? undefined : Number(tetanyMin),
        triggers: tetanyTriggers,
        helped: tetanyHelped,
        note: tetanyNote.trim() || undefined,
      };
      updateDayLog(update, date, (l) => ({ ...l, tetany: [...(l.tetany ?? []), t] }));
    }
    if (panic) {
      const pk: PanicAttack = {
        id: crypto.randomUUID(),
        time: panicTime,
        minutes: panicOngoing ? undefined : panicMinutes === "" ? undefined : Number(panicMinutes),
        intensity: panicIntensity,
        physical: panicPhysical,
        cognitive: panicCognitive,
        trigger: panicTrigger.trim(),
        place: panicPlace.trim() || undefined,
        hyperventilation: panicHyper,
        tetanyPresent: panicTetany,
        helped: panicHelped,
        note: panicNote.trim() || undefined,
      };
      updateDayLog(update, date, (l) => ({ ...l, panic: [...(l.panic ?? []), pk] }));
    }
    onDone();
  };

  const bg = painColor(score);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStartRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const target = e.target as HTMLElement;
    if (target.closest('input,textarea,select,button,[role="slider"],.no-swipe')) return;
    if (dx < 0 && step < 4) setStep(step + 1);
    else if (dx > 0 && step > 0) setStep(step - 1);
  };

  return (
    <div
      className="flex min-h-full flex-col px-5 pb-4 pt-0 transition-colors touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {quickSymptomUpdate ? (
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Quick symptom update
          </span>
          <span className="text-xs text-muted-foreground">New entry · {time}</span>
        </div>
      ) : (
        <div
          className="fixed inset-x-0 z-30 h-[60px] flex items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur"
          style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
        >
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex min-w-[68px] items-center gap-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true" className="text-base leading-none">←</span>
              <span>Back</span>
            </button>
          ) : (
            <span className="min-w-[68px]" aria-hidden="true" />
          )}

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-tint"}`}
                />
              ))}
            </div>
            <span className="shrink-0 text-xs font-semibold text-foreground/75">{step + 1}/5</span>
          </div>

          <button
            type="button"
            onClick={step < 4 ? () => setStep(step + 1) : save}
            className="flex h-[52px] min-w-[64px] flex-col items-center justify-center rounded-[1.15rem] bg-primary px-3 text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="text-sm font-semibold leading-none">{step < 4 ? "Next" : "Save"}</span>
            <span aria-hidden="true" className="mt-0.5 text-base leading-none">{step < 4 ? "→" : "✓"}</span>
          </button>
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-col items-center gap-4 py-6">
          {latestPain && !initialEntry && (
            <div className="w-full rounded-2xl border border-primary/30 bg-surface/90 p-3 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Pain still feels the same?</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Last log: {latestPain.time} · pain {latestPain.score}/10. Reuse it and add only the new symptoms.
                  </p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
                  <Ico e="🤕" size={22} />
                </span>
              </div>
              <Button type="button" onClick={startSymptomUpdate} className="w-full">
                Same pain — add symptoms
              </Button>
            </div>
          )}

          <div
            className="grid h-32 w-32 place-items-center rounded-full text-5xl font-bold text-white"
            style={{ background: bg }}
          >
            {Number.isInteger(score) ? score : score.toFixed(1)}
          </div>
          <p className="text-center font-medium">{getScaleDesc(data, "pain")[Math.round(score)]}</p>
          <div className="w-full px-4">
            <Slider value={[score * 2]} min={0} max={20} step={1} onValueChange={([v]) => setScore(v / 2)} />
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 px-4">
            {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                title={`${n} — ${getScaleDesc(data, "pain")[Math.round(n)]}`}
                className={`h-8 w-8 rounded-full text-[11px] font-semibold transition ${
                  score === n ? "text-white ring-2 ring-foreground" : "text-foreground"
                }`}
                style={{ background: painColor(n) }}
              >
                {Number.isInteger(n) ? n : n.toFixed(1)}
              </button>
            ))}
          </div>
          <div className="w-full px-2">
            <ScaleLegend
              max={10}
              from={0}
              descriptions={getScaleDesc(data, "pain")}
              value={Math.round(score)}
              title="Pain scale (Mankosky)"
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <Field label="Where does it hurt?">
          <CustomChipList
            base={BODY_PARTS_DEFAULT}
            custom={data.custom.bodyParts}
            onAddCustom={(v) => addCustom("bodyParts", v)}
            onRemoveCustom={(v) => {
              removeCustom("bodyParts", v);
              setParts((a) => a.filter((x) => x !== v));
            }}
            onRenameCustom={(o, n) => {
              renameCustom("bodyParts", o, n);
              setParts((a) => a.map((x) => (x === o ? n : x)));
            }}
            selected={parts}
            onToggle={(v) => setParts((a) => toggleIn(a, v))}
          />
        </Field>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <Field label="How does it hurt?">
            <CustomChipList
              base={PAIN_QUALITY_DEFAULT}
              custom={data.custom.quality}
              onAddCustom={(v) => addCustom("quality", v)}
              onRemoveCustom={(v) => {
                removeCustom("quality", v);
                setQuality((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("quality", o, n);
                setQuality((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={quality}
              onToggle={(v) => setQuality((a) => toggleIn(a, v))}
            />
          </Field>
          {quality.includes("Pressure") && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label="Type of pressure">
                <CustomChipList
                  base={PRESSURE_TYPES}
                  custom={data.custom.pressureTypes ?? []}
                  onAddCustom={(v) => addCustom("pressureTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("pressureTypes", v);
                    setPressureTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("pressureTypes", o, n);
                    setPressureTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={pressureTypes}
                  onToggle={(v) => setPressureTypes((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label={`Pressure intensity ${pressureIntensity ?? "-"}/10`}>
                <IntensityScale
                  value={pressureIntensity ?? -1}
                  onChange={(n) => setPressureIntensity(pressureIntensity === n ? undefined : n)}
                  max={10}
                  from={0}
                />
              </Field>
            </div>
          )}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          {quickSymptomUpdate && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">
              <p className="font-semibold">
                Pain {score}/10 copied from {copiedFromTime ?? "the latest log"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This saves a new entry at {time}; the older log stays unchanged. Add or adjust the symptoms below.
              </p>
            </div>
          )}

          <Field label="Other symptoms">
            <CustomChipList
              base={OTHER_SYMPTOMS_DEFAULT}
              custom={data.custom.symptoms}
              onAddCustom={(v) => addCustom("symptoms", v)}
              onRemoveCustom={(v) => {
                removeCustom("symptoms", v);
                setSymptoms((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("symptoms", o, n);
                setSymptoms((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={symptoms}
              onToggle={(v) => setSymptoms((a) => toggleIn(a, v))}
            />
          </Field>
          {symptoms.includes("Flu") && (
            <Field label="Flu symptoms note">
              <Textarea
                rows={2}
                value={fluNote}
                onChange={(e) => setFluNote(e.target.value)}
                placeholder="e.g. stuffy nose, sore throat"
              />
            </Field>
          )}
          <Field label="Nausea?">
            <div className="mt-1 flex gap-2">
              <Chip active={!nausea} onClick={() => setNausea(false)}>
                No
              </Chip>
              <Chip active={nausea} onClick={() => setNausea(true)}>
                Yes — log it
              </Chip>
            </div>
          </Field>
          {nausea && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label="Type of nausea">
                <CustomChipList
                  base={NAUSEA_TYPES}
                  custom={data.custom.nauseaTypes ?? []}
                  descriptions={NAUSEA_TYPE_DESC}
                  onAddCustom={(v) => addCustom("nauseaTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaTypes", v);
                    setNauseaTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaTypes", o, n);
                    setNauseaTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaTypes}
                  onToggle={(v) => setNauseaTypes((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label={`Nausea severity ${nauseaSeverity ?? "-"}/10`}>
                <IntensityScale
                  value={nauseaSeverity ?? -1}
                  onChange={(n) => setNauseaSeverity(nauseaSeverity === n ? undefined : n)}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={NAUSEA_SEVERITY_DESC}
                  legendTitle="Nausea severity scale"
                  compactSingleRow
                />
              </Field>
              <DurationField
                minutes={nauseaMinutes}
                setMinutes={setNauseaMinutes}
                ongoing={nauseaOngoing}
                setOngoing={setNauseaOngoing}
              />
              <Field label="Triggers">
                <CustomChipList
                  base={NAUSEA_TRIGGERS}
                  custom={data.custom.nauseaTriggers ?? []}
                  onAddCustom={(v) => addCustom("nauseaTriggers", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaTriggers", v);
                    setNauseaTriggers((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaTriggers", o, n);
                    setNauseaTriggers((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaTriggers}
                  onToggle={(v) => setNauseaTriggers((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Associated symptoms">
                <CustomChipList
                  base={NAUSEA_SYMPTOMS}
                  custom={data.custom.nauseaSymptoms ?? []}
                  onAddCustom={(v) => addCustom("nauseaSymptoms", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaSymptoms", v);
                    setNauseaSymptoms((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaSymptoms", o, n);
                    setNauseaSymptoms((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaSymptoms}
                  onToggle={(v) => setNauseaSymptoms((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Relieved by">
                <CustomChipList
                  base={NAUSEA_HELPED}
                  custom={data.custom.nauseaHelped ?? []}
                  onAddCustom={(v) => addCustom("nauseaHelped", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("nauseaHelped", v);
                    setNauseaHelped((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("nauseaHelped", o, n);
                    setNauseaHelped((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={nauseaHelped}
                  onToggle={(v) => setNauseaHelped((a) => toggleIn(a, v))}
                />
              </Field>
            </div>
          )}
          <div>
            <Field label="Headache?">
              <div className="mt-1 flex gap-2">
                <Chip active={!headache} onClick={() => setHeadache(false)}>
                  No
                </Chip>
                <Chip active={headache} onClick={() => setHeadache(true)}>
                  Yes — log it
                </Chip>
              </div>
            </Field>
            {headache && (
              <div className="mt-3 rounded-2xl border border-border p-3 space-y-3">
                <Field label="Headache type">
                  <CustomChipList
                    base={HEADACHE_TYPES}
                    custom={data.custom.headacheTypes ?? []}
                    descriptions={HEADACHE_TYPE_DESC}
                    onAddCustom={(v) => addCustom("headacheTypes", v)}
                    onRemoveCustom={(v) => {
                      removeCustom("headacheTypes", v);
                      setHeadacheTypes((a) => a.filter((x) => x !== v));
                    }}
                    onRenameCustom={(o, n) => {
                      renameCustom("headacheTypes", o, n);
                      setHeadacheTypes((a) => a.map((x) => (x === o ? n : x)));
                    }}
                    selected={headacheTypes}
                    onToggle={(v) => setHeadacheTypes((a) => toggleIn(a, v))}
                  />
                </Field>
                <Field label={`Headache intensity ${headacheIntensity ?? "-"}/10`}>
                  <IntensityScale
                    value={headacheIntensity ?? 0}
                    onChange={(n) => setHeadacheIntensity(headacheIntensity === n ? undefined : n)}
                    max={10}
                    from={1}
                    step={1}
                    descriptions={getScaleDesc(data, "headache")}
                    legendTitle="Headache scale"
                    compactSingleRow
                  />
                </Field>
                <Field label="Medication taken">
                  <div className="mt-1 flex gap-2">
                    <Chip active={!headacheMedOn} onClick={() => setHeadacheMedOn(false)}>
                      No
                    </Chip>
                    <Chip active={headacheMedOn} onClick={() => setHeadacheMedOn(true)}>
                      Yes
                    </Chip>
                  </div>
                  {headacheMedOn && (
                    <div className="mt-2 space-y-2">
                      {data.meds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {data.meds.map((m) => {
                            const label = `${m.name}${m.dose ? ` ${m.dose}` : ""}`;
                            return (
                              <Chip
                                key={m.id}
                                active={headacheMed === label}
                                onClick={() => setHeadacheMed(headacheMed === label ? "" : label)}
                              >
                                {label}
                              </Chip>
                            );
                          })}
                        </div>
                      )}
                      <Input
                        value={headacheMed}
                        onChange={(e) => setHeadacheMed(e.target.value)}
                        placeholder="Medication + dose"
                      />
                      <Input type="time" value={headacheMedTime} onChange={(e) => setHeadacheMedTime(e.target.value)} />
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>
          <Field label="Hot flashes?">
            <div className="mt-1 flex gap-2">
              <Chip active={!hotFlashesOn} onClick={() => setHotFlashesOn(false)}>
                No
              </Chip>
              <Chip active={hotFlashesOn} onClick={() => setHotFlashesOn(true)}>
                Yes — log it
              </Chip>
            </div>
          </Field>
          {hotFlashesOn && (
            <Field label={`Hot flashes intensity ${hotFlashes ?? "-"}/5`}>
              <IntensityScale
                value={hotFlashes ?? 0}
                onChange={(n) => setHotFlashes(hotFlashes === n ? undefined : n)}
                max={5}
                from={1}
                step={1}
                descriptions={getScaleDesc(data, "hotFlashes")}
                legendTitle="Hot flashes scale"
                compactSingleRow
              />
            </Field>
          )}
          <Field label="PCOS symptoms">
            <CustomChipList
              base={PCOS_SYMPTOMS}
              custom={data.custom.pcosSymptoms ?? []}
              onAddCustom={(v) => addCustom("pcosSymptoms", v)}
              onRemoveCustom={(v) => {
                removeCustom("pcosSymptoms", v);
                setPcosSymptoms((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("pcosSymptoms", o, n);
                setPcosSymptoms((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={pcosSymptoms}
              onToggle={(v) => setPcosSymptoms((a) => toggleIn(a, v))}
            />
          </Field>
          <Field label="Tetany episode?">
            <div className="mt-1 flex gap-2">
              <Chip active={!tetany} onClick={() => setTetany(false)}>
                No
              </Chip>
              <Chip active={tetany} onClick={() => setTetany(true)}>
                Yes — log it
              </Chip>
            </div>
          </Field>
          {tetany && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label="Type">
                <CustomChipList
                  base={TETANY_TYPES}
                  custom={data.custom.tetanyTypes}
                  descriptions={TETANY_TYPE_DESC}
                  onAddCustom={(v) => addCustom("tetanyTypes", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("tetanyTypes", v);
                    setTetanyTypes((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("tetanyTypes", o, n);
                    setTetanyTypes((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={tetanyTypes}
                  onToggle={(v) => setTetanyTypes((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Location">
                <CustomChipList
                  base={TETANY_LOCATIONS_DEFAULT}
                  custom={data.custom.tetanyLocations}
                  onAddCustom={(v) => addCustom("tetanyLocations", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("tetanyLocations", v);
                    setTetanyLoc((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("tetanyLocations", o, n);
                    setTetanyLoc((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={tetanyLoc}
                  onToggle={(v) => setTetanyLoc((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label={`Intensity ${tetanyIntensity}/5`}>
                <IntensityScale
                  value={tetanyIntensity}
                  onChange={setTetanyIntensity}
                  max={5}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "tetany")}
                  legendTitle="Tetany intensity scale"
                  compactSingleRow
                />
              </Field>
              <DurationField
                minutes={tetanyMin}
                setMinutes={setTetanyMin}
                ongoing={tetanyOngoing}
                setOngoing={setTetanyOngoing}
              />
              <Field label="Triggers">
                <CustomChipList
                  base={TETANY_TRIGGERS}
                  custom={data.custom.tetanyTriggers}
                  onAddCustom={(v) => addCustom("tetanyTriggers", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("tetanyTriggers", v);
                    setTetanyTriggers((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("tetanyTriggers", o, n);
                    setTetanyTriggers((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={tetanyTriggers}
                  onToggle={(v) => setTetanyTriggers((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="What helped">
                <CustomChipList
                  base={TETANY_HELPED_DEFAULT}
                  custom={data.custom.tetanyHelped}
                  onAddCustom={(v) => addCustom("tetanyHelped", v)}
                  onRemoveCustom={(v) => {
                    removeCustom("tetanyHelped", v);
                    setTetanyHelped((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    renameCustom("tetanyHelped", o, n);
                    setTetanyHelped((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={tetanyHelped}
                  onToggle={(v) => setTetanyHelped((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Note (optional)">
                <Textarea rows={2} value={tetanyNote} onChange={(e) => setTetanyNote(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Panic attack?">
            <div className="mt-1 flex gap-2">
              <Chip active={!panic} onClick={() => setPanic(false)}>
                No
              </Chip>
              <Chip active={panic} onClick={() => setPanic(true)}>
                Yes — log it
              </Chip>
            </div>
          </Field>
          {panic && (
            <div className="rounded-2xl border border-border p-3 space-y-3">
              <Field label="Time">
                <Input type="time" value={panicTime} onChange={(e) => setPanicTime(e.target.value)} />
              </Field>
              <DurationField
                minutes={panicMinutes}
                setMinutes={setPanicMinutes}
                ongoing={panicOngoing}
                setOngoing={setPanicOngoing}
              />
              <Field label={`Intensity ${panicIntensity}/10`}>
                <IntensityScale
                  value={panicIntensity}
                  onChange={setPanicIntensity}
                  max={10}
                  from={1}
                  step={1}
                  descriptions={getScaleDesc(data, "panic")}
                  legendTitle="Panic intensity scale"
                  compactSingleRow
                />
              </Field>
              <Field label="Physical symptoms">
                <CustomChipList
                  base={PANIC_PHYSICAL}
                  custom={data.custom.panicPhysical}
                  onAddCustom={(v) =>
                    update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: [...d.custom.panicPhysical, v] } }))
                  }
                  onRemoveCustom={(v) => {
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.filter((x) => x !== v) },
                    }));
                    setPanicPhysical((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.map((x) => (x === o ? n : x)) },
                    }));
                    setPanicPhysical((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={panicPhysical}
                  onToggle={(v) => setPanicPhysical((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Cognitive symptoms">
                <CustomChipList
                  base={PANIC_COGNITIVE}
                  custom={data.custom.panicCognitive}
                  onAddCustom={(v) =>
                    update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: [...d.custom.panicCognitive, v] } }))
                  }
                  onRemoveCustom={(v) => {
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.filter((x) => x !== v) },
                    }));
                    setPanicCognitive((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.map((x) => (x === o ? n : x)) },
                    }));
                    setPanicCognitive((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={panicCognitive}
                  onToggle={(v) => setPanicCognitive((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Trigger (or 'no obvious trigger')">
                <Textarea rows={2} value={panicTrigger} onChange={(e) => setPanicTrigger(e.target.value)} />
              </Field>
              <Field label="Place (optional)">
                <Input value={panicPlace} onChange={(e) => setPanicPlace(e.target.value)} />
              </Field>
              <Field label="Hyperventilation">
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["no", "before", "during", "unknown"] as const).map((v) => (
                    <Chip key={v} active={panicHyper === v} onClick={() => setPanicHyper(v)}>
                      {v}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Tetany present?">
                <div className="mt-2 flex gap-2">
                  <Chip active={!panicTetany} onClick={() => setPanicTetany(false)}>
                    No
                  </Chip>
                  <Chip active={panicTetany} onClick={() => setPanicTetany(true)}>
                    Yes
                  </Chip>
                </div>
              </Field>
              <Field label="What helped">
                <CustomChipList
                  base={PANIC_HELPED_DEFAULT}
                  custom={data.custom.panicHelped}
                  onAddCustom={(v) =>
                    update((d) => ({ ...d, custom: { ...d.custom, panicHelped: [...d.custom.panicHelped, v] } }))
                  }
                  onRemoveCustom={(v) => {
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, panicHelped: d.custom.panicHelped.filter((x) => x !== v) },
                    }));
                    setPanicHelped((a) => a.filter((x) => x !== v));
                  }}
                  onRenameCustom={(o, n) => {
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, panicHelped: d.custom.panicHelped.map((x) => (x === o ? n : x)) },
                    }));
                    setPanicHelped((a) => a.map((x) => (x === o ? n : x)));
                  }}
                  selected={panicHelped}
                  onToggle={(v) => setPanicHelped((a) => toggleIn(a, v))}
                />
              </Field>
              <Field label="Note (optional)">
                <Textarea rows={2} value={panicNote} onChange={(e) => setPanicNote(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {(() => {
            const STRESS_DESC = getScaleDesc(data, "stress");
            return (
              <Field label={`Stress ${stress ?? "-"} / 10`}>
                <IntensityScale
                  value={stress ?? -1}
                  onChange={(n) => setStress(stress === n ? undefined : n)}
                  max={10}
                  from={0}
                  descriptions={STRESS_DESC}
                  legendTitle="Stress scale"
                />
              </Field>
            );
          })()}
          <Field label="Body battery">
            <div className="mt-2 flex justify-between gap-2">
              {BODY_BATTERY.map((b) => (
                <button
                  key={b.n}
                  type="button"
                  onClick={() => setBodyBattery(bodyBattery === b.n ? undefined : b.n)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border p-2 transition ${bodyBattery === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
                >
                  <div className="grid h-10 w-6 place-items-end rounded-md border-2 border-foreground/60 p-0.5">
                    <div className="w-full rounded" style={{ height: `${b.n * 18}%`, background: b.color }} />
                  </div>
                  <span className="text-[10px]">{b.emoji}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Mood">
            <CustomChipList
              base={MOODS_DEFAULT}
              custom={data.custom.moods}
              onAddCustom={(v) => addCustom("moods", v)}
              onRemoveCustom={(v) => {
                removeCustom("moods", v);
                setMood((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustom("moods", o, n);
                setMood((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={mood}
              onToggle={(v) => setMood((a) => toggleIn(a, v))}
            />
          </Field>
          <Field label="Time of entry">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Note (optional)">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else…" />
          </Field>
        </div>
      )}

      {quickSymptomUpdate && step === 3 && (
        <SheetFooter className="fixed inset-x-0 z-30 h-[60px] flex-row items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-5 py-2 shadow-sm backdrop-blur" style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}>
          <button
            type="button"
            onClick={() => {
              setQuickSymptomUpdate(false);
              setCopiedFromTime(undefined);
              setStep(0);
            }}
            className="flex items-center gap-1 px-1 text-sm font-semibold text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="text-xl leading-none">←</span>
            <span>Edit full log</span>
          </button>

          <button
            type="button"
            onClick={save}
            className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>Save update</span>
            <span aria-hidden="true" className="text-base leading-none">✓</span>
          </button>
        </SheetFooter>
      )}
    </div>
  );
}

/* ------------------- PANIC attack ------------------- */
function PanicForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: PanicAttack;
}) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [minutes, setMinutes] = useState(initialEntry?.minutes != null ? String(initialEntry.minutes) : "10");
  const [ongoing, setOngoing] = useState(initialEntry?.minutes == null && !!initialEntry);
  const [intensity, setIntensity] = useState(initialEntry?.intensity ?? 5);
  const [physical, setPhysical] = useState<string[]>(initialEntry?.physical ?? []);
  const [cognitive, setCognitive] = useState<string[]>(initialEntry?.cognitive ?? []);
  const [trigger, setTrigger] = useState(initialEntry?.trigger ?? "");
  const [place, setPlace] = useState(initialEntry?.place ?? "");
  const [hyper, setHyper] = useState<"no" | "before" | "during" | "unknown">(
    initialEntry?.hyperventilation ?? "unknown",
  );
  const [tetanyPresent, setTetanyPresent] = useState(initialEntry?.tetanyPresent ?? false);
  const [helped, setHelped] = useState<string[]>(initialEntry?.helped ?? []);
  const [rescueMed, setRescueMed] = useState<string>(initialEntry?.rescueMed ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addHelped = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, panicHelped: [...d.custom.panicHelped, v] } }));
  const rmHelped = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, panicHelped: d.custom.panicHelped.filter((x) => x !== v) } }));
    setHelped((a) => a.filter((x) => x !== v));
  };

  const save = () => {
    const editing = !!initialEntry;
    const p: PanicAttack = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time,
      minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes),
      intensity,
      physical,
      cognitive,
      trigger: trigger.trim(),
      place: place.trim() || undefined,
      hyperventilation: hyper,
      tetanyPresent,
      helped,
      rescueMed: rescueMed.trim() || undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      panic: editing ? (l.panic ?? []).map((x) => (x.id === p.id ? p : x)) : [...(l.panic ?? []), p],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />
      </Field>
      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} />
      <Field label={`Intensity ${intensity}/10`}>
        <IntensityScale
          value={intensity}
          onChange={setIntensity}
          max={10}
          descriptions={getScaleDesc(data, "panic")}
          legendTitle="Panic intensity scale"
        />
      </Field>
      <Field label="Physical symptoms">
        <CustomChipList
          base={PANIC_PHYSICAL}
          custom={data.custom.panicPhysical}
          onAddCustom={(v) =>
            update((d) => ({ ...d, custom: { ...d.custom, panicPhysical: [...d.custom.panicPhysical, v] } }))
          }
          onRemoveCustom={(v) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.filter((x) => x !== v) },
            }));
            setPhysical((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, panicPhysical: d.custom.panicPhysical.map((x) => (x === o ? n : x)) },
            }));
            setPhysical((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={physical}
          onToggle={(v) => setPhysical((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Cognitive symptoms">
        <CustomChipList
          base={PANIC_COGNITIVE}
          custom={data.custom.panicCognitive}
          onAddCustom={(v) =>
            update((d) => ({ ...d, custom: { ...d.custom, panicCognitive: [...d.custom.panicCognitive, v] } }))
          }
          onRemoveCustom={(v) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.filter((x) => x !== v) },
            }));
            setCognitive((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, panicCognitive: d.custom.panicCognitive.map((x) => (x === o ? n : x)) },
            }));
            setCognitive((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={cognitive}
          onToggle={(v) => setCognitive((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Trigger (or 'no obvious trigger')">
        <Textarea rows={2} value={trigger} onChange={(e) => setTrigger(e.target.value)} />
      </Field>
      <Field label="Place (optional)">
        <Input value={place} onChange={(e) => setPlace(e.target.value)} />
      </Field>
      <Field label="Hyperventilation">
        <div className="mt-2 flex flex-wrap gap-2">
          {(["no", "before", "during", "unknown"] as const).map((v) => (
            <Chip key={v} active={hyper === v} onClick={() => setHyper(v)}>
              {v}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Tetany present?">
        <div className="mt-2 flex gap-2">
          <Chip active={!tetanyPresent} onClick={() => setTetanyPresent(false)}>
            No
          </Chip>
          <Chip active={tetanyPresent} onClick={() => setTetanyPresent(true)}>
            Yes
          </Chip>
        </div>
      </Field>
      <Field label="What helped">
        <CustomChipList
          base={PANIC_HELPED_DEFAULT}
          custom={data.custom.panicHelped}
          onAddCustom={addHelped}
          onRemoveCustom={rmHelped}
          selected={helped}
          onToggle={(v) => setHelped((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Rescue med (what you took)">
        <Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder="e.g. Frontin 0.25 mg" />
        {data.meds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.meds.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRescueMed(m.dose ? `${m.name} ${m.dose}` : m.name)}
                className="rounded-full bg-tint px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border"
              >
                {m.name}
                {m.dose ? ` ${m.dose}` : ""}
              </button>
            ))}
          </div>
        )}
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- TETANY episode ------------------- */
function TetanyForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: TetanyEpisode;
}) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [types, setTypes] = useState<string[]>(initialEntry?.types ?? []);
  const [loc, setLoc] = useState<string[]>(initialEntry?.location ?? []);
  const [intensity, setIntensity] = useState(initialEntry?.intensity ?? 1);
  const [minutes, setMinutes] = useState(initialEntry?.minutes != null ? String(initialEntry.minutes) : "5");
  const [ongoing, setOngoing] = useState(initialEntry?.minutes == null && !!initialEntry);
  const [triggers, setTriggers] = useState<string[]>(initialEntry?.triggers ?? []);
  const [helped, setHelped] = useState<string[]>(initialEntry?.helped ?? []);
  const [rescueMed, setRescueMed] = useState<string>(initialEntry?.rescueMed ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");

  type CK = "tetanyTypes" | "tetanyLocations" | "tetanyTriggers" | "tetanyHelped";
  const addC = (k: CK, v: string) =>
    update((d) => withoutCustomTombstones({ ...d, custom: { ...d.custom, [k]: [...d.custom[k], v] } }, k, [v]));
  const rmC = (k: CK, v: string) =>
    update((d) =>
      withCustomTombstones({ ...d, custom: { ...d.custom, [k]: d.custom[k].filter((x) => x !== v) } }, k, [v]),
    );
  const rnC = (k: CK, o: string, n: string) =>
    update((d) =>
      withoutCustomTombstones(
        withCustomTombstones(
          { ...d, custom: { ...d.custom, [k]: d.custom[k].map((x) => (x === o ? n : x)) } },
          k,
          [o],
        ),
        k,
        [n],
      ),
    );

  const save = () => {
    const editing = !!initialEntry;
    const t: TetanyEpisode = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time,
      types,
      location: loc,
      intensity,
      minutes: ongoing ? undefined : minutes === "" ? undefined : Number(minutes),
      triggers,
      helped,
      rescueMed: rescueMed.trim() || undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      tetany: editing ? (l.tetany ?? []).map((x) => (x.id === t.id ? t : x)) : [...(l.tetany ?? []), t],
    }));
    onDone();
  };

  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Type">
        <CustomChipList
          base={TETANY_TYPES}
          custom={data.custom.tetanyTypes}
          descriptions={TETANY_TYPE_DESC}
          onAddCustom={(v) => addC("tetanyTypes", v)}
          onRemoveCustom={(v) => {
            rmC("tetanyTypes", v);
            setTypes((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            rnC("tetanyTypes", o, n);
            setTypes((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={types}
          onToggle={(v) => setTypes((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Location">
        <CustomChipList
          base={TETANY_LOCATIONS_DEFAULT}
          custom={data.custom.tetanyLocations}
          onAddCustom={(v) => addC("tetanyLocations", v)}
          onRemoveCustom={(v) => {
            rmC("tetanyLocations", v);
            setLoc((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            rnC("tetanyLocations", o, n);
            setLoc((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={loc}
          onToggle={(v) => setLoc((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label={`Intensity ${intensity}/5`}>
        <IntensityScale
          value={intensity}
          onChange={setIntensity}
          max={5}
          descriptions={getScaleDesc(data, "tetany")}
          legendTitle="Tetany intensity scale"
        />
      </Field>
      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} />
      <Field label="Triggers">
        <CustomChipList
          base={TETANY_TRIGGERS}
          custom={data.custom.tetanyTriggers}
          onAddCustom={(v) => addC("tetanyTriggers", v)}
          onRemoveCustom={(v) => {
            rmC("tetanyTriggers", v);
            setTriggers((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            rnC("tetanyTriggers", o, n);
            setTriggers((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={triggers}
          onToggle={(v) => setTriggers((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="What helped">
        <CustomChipList
          base={TETANY_HELPED_DEFAULT}
          custom={data.custom.tetanyHelped}
          onAddCustom={(v) => addC("tetanyHelped", v)}
          onRemoveCustom={(v) => {
            rmC("tetanyHelped", v);
            setHelped((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            rnC("tetanyHelped", o, n);
            setHelped((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={helped}
          onToggle={(v) => setHelped((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Rescue med (what you took)">
        <Input value={rescueMed} onChange={(e) => setRescueMed(e.target.value)} placeholder="e.g. Magnesium 400 mg" />
        {data.meds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.meds.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRescueMed(m.dose ? `${m.name} ${m.dose}` : m.name)}
                className="rounded-full bg-tint px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border"
              >
                {m.name}
                {m.dose ? ` ${m.dose}` : ""}
              </button>
            ))}
          </div>
        )}
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- PERIOD (Blueberry) ------------------- */
function PeriodForm({
  date,
  data,
  update,
  onDone,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
}) {
  const cur = data.dayLogs[date]?.periodInfo;
  const [level, setLevel] = useState<PeriodLevel>(cur?.level ?? "");
  const [discharge, setDischarge] = useState<string>(cur?.discharge ?? "");
  const [dNote, setDNote] = useState<string>(cur?.dischargeNote ?? "");
  const [note, setNote] = useState<string>(cur?.note ?? "");
  const [cramps, setCramps] = useState<number | undefined>(cur?.cramps);
  const painDesc = getScaleDesc(data, "pain");

  const save = () => {
    updateDayLog(update, date, (l) => ({
      ...l,
      period: level || undefined,
      periodInfo: {
        level,
        discharge: discharge || undefined,
        dischargeNote: dNote.trim() || undefined,
        note: note.trim() || undefined,
        cramps,
      },
    }));
    onDone();
  };
  const LEVELS: { v: PeriodLevel; label: string; color: string }[] = [
    { v: "spotting", label: "Spotting", color: "var(--period-spotting)" },
    { v: "light", label: "Light", color: "var(--period-light)" },
    { v: "medium", label: "Medium", color: "var(--period-medium)" },
    { v: "heavy", label: "Heavy", color: "var(--period-heavy)" },
    { v: "very-heavy", label: "Very heavy", color: "var(--period-veryheavy)" },
  ];
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Flow">
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {LEVELS.map((L) => (
            <button
              key={L.v}
              onClick={() => setLevel(L.v)}
              className={`rounded-2xl p-2 text-[11px] font-medium ${level === L.v ? "text-white ring-2 ring-foreground" : "bg-tint text-foreground"}`}
              style={level === L.v ? { background: L.color } : undefined}
            >
              {L.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Cramp pain ${cramps == null ? "—" : Number.isInteger(cramps) ? cramps : cramps.toFixed(1)} / 10`}>
        <div className="mt-2 flex items-center gap-3">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white"
            style={{ background: cramps == null ? "hsl(var(--muted-foreground))" : painColor(cramps) }}
          >
            {cramps == null ? "—" : Number.isInteger(cramps) ? cramps : cramps.toFixed(1)}
          </div>
          <div className="flex-1">
            <Slider value={[(cramps ?? 0) * 2]} min={0} max={20} step={1} onValueChange={([v]) => setCramps(v / 2)} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5 px-1">
          {Array.from({ length: 21 }, (_, i) => i / 2).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCramps(cramps === n ? undefined : n)}
              title={`${n} — ${painDesc[Math.round(n)]}`}
              className={`h-8 w-8 rounded-full text-[11px] font-semibold transition ${
                cramps === n ? "text-white ring-2 ring-foreground" : "text-foreground"
              }`}
              style={{ background: painColor(n) }}
            >
              {Number.isInteger(n) ? n : n.toFixed(1)}
            </button>
          ))}
        </div>
        {cramps != null && (
          <div className="mt-2 rounded-lg bg-tint px-2.5 py-1.5 text-[11px] leading-snug text-foreground">
            <span className="font-semibold">Level {Math.round(cramps)}:</span> {painDesc[Math.round(cramps)]}
          </div>
        )}
        <ScaleLegend
          max={10}
          from={0}
          descriptions={painDesc}
          value={cramps == null ? undefined : Math.round(cramps)}
          title="Pain scale (Mankosky)"
        />
      </Field>
      <Field label="Discharge (optional)">
        <div className="mt-2 flex flex-wrap gap-2">
          {DISCHARGE_OPTS.map((d) => (
            <Chip
              key={d.value}
              active={discharge === d.value}
              onClick={() => setDischarge(discharge === d.value ? "" : d.value)}
              color={d.color}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Discharge note (optional)">
        <Input value={dNote} onChange={(e) => setDNote(e.target.value)} />
      </Field>
      <Field label="Day note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Birth control since (optional)">
        <Input
          type="date"
          value={data.settings.birthControlSince ?? ""}
          onChange={(e) =>
            update((d) => ({ ...d, settings: { ...d.settings, birthControlSince: e.target.value || undefined } }))
          }
        />
        {data.settings.birthControlSince && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Taking birth control since {data.settings.birthControlSince}
          </p>
        )}
      </Field>
      <Field label="Pregnant?">
        <div className="mt-1 flex gap-2">
          <Chip
            active={!data.settings.pregnantSince}
            onClick={() => update((d) => ({ ...d, settings: { ...d.settings, pregnantSince: undefined } }))}
          >
            No
          </Chip>
          <Chip
            active={!!data.settings.pregnantSince}
            onClick={() =>
              update((d) => ({
                ...d,
                settings: { ...d.settings, pregnantSince: d.settings.pregnantSince ?? todayKey() },
              }))
            }
          >
            Yes
          </Chip>
        </div>
        {data.settings.pregnantSince && (
          <div className="mt-2">
            <span className="text-xs font-medium text-muted-foreground">Since when</span>
            <Input
              type="date"
              className="mt-1"
              value={data.settings.pregnantSince}
              onChange={(e) =>
                update((d) => ({ ...d, settings: { ...d.settings, pregnantSince: e.target.value || undefined } }))
              }
            />
            {(() => {
              const p = pregnancyInfo(data.settings.pregnantSince);
              return p ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Week {p.week} · Trimester {p.trimester} — cycle predictions are paused.
                </p>
              ) : null;
            })()}
          </div>
        )}
      </Field>
      <div className="rounded-2xl bg-tint p-3 text-[11px] leading-relaxed text-muted-foreground">
        Cycle prediction is based on your last period and cycle length (edit in Settings later).
      </div>
      {cur && (
        <button
          type="button"
          onClick={() => {
            updateDayLog(update, date, (l) => {
              const { period: _p, periodInfo: _pi, ...rest } = l;
              void _p;
              void _pi;
              return rest;
            });
            onDone();
          }}
          className="w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30"
        >
          Delete Blueberry entry
        </button>
      )}
    </div>
  );
}

/* ------------------- ŠukŠuk (Sex) ------------------- */
function SexForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: SexEntry;
}) {
  const [kind, setKind] = useState<SexKind>(initialEntry?.kind ?? "sex");
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [feelingAfter, setFeelingAfter] = useState<string[]>(asArr(initialEntry?.feelingAfter));
  const [painful, setPainful] = useState<PainfulWhen>(initialEntry?.painful ?? "no");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addCustom = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, sexTypes: [...d.custom.sexTypes, v] } }));
  const rmCustom = (v: string) => {
    if (!confirm(`Remove "${v}" from your list?`)) return;
    update((d) => ({ ...d, custom: { ...d.custom, sexTypes: d.custom.sexTypes.filter((x) => x !== v) } }));
    if (kind === (`other:${v}` as SexKind)) setKind("sex");
  };
  const custom = data.custom.sexTypes;
  const save = () => {
    const editing = !!initialEntry;
    const e: SexEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time,
      kind,
      feelingAfter: feelingAfter.length ? feelingAfter : undefined,
      painful,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      sex: editing ? (l.sex ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.sex ?? []), e],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Type">
        <div className="mt-2 flex flex-wrap gap-2">
          {SEX_TYPES_DEFAULT.map((o) => (
            <Chip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)}>
              {o.label}
            </Chip>
          ))}
          {custom.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <Chip active={kind === (`other:${c}` as SexKind)} onClick={() => setKind(`other:${c}` as SexKind)}>
                {c}
              </Chip>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rmCustom(c);
                }}
                aria-label={`Remove ${c}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCustomInline onAdd={addCustom} />
        </div>
      </Field>
      <Field label="How I feel after">
        <CustomChipList
          base={SEX_FEELINGS_DEFAULT}
          custom={data.custom.sexFeelings ?? []}
          onAddCustom={(v) =>
            update((d) => ({ ...d, custom: { ...d.custom, sexFeelings: [...(d.custom.sexFeelings ?? []), v] } }))
          }
          onRemoveCustom={(v) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).filter((x) => x !== v) },
            }));
            setFeelingAfter((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, sexFeelings: (d.custom.sexFeelings ?? []).map((x) => (x === o ? n : x)) },
            }));
            setFeelingAfter((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={feelingAfter}
          onToggle={(v) => setFeelingAfter((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Painful?">
        <div className="mt-2 flex gap-2">
          {(["no", "before", "during", "after"] as const).map((v) => (
            <Chip key={v} active={painful === v} onClick={() => setPainful(v)}>
              {v}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}
function AddCustomInline({ onAdd }: { onAdd: (v: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  if (!adding)
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-xs font-medium text-muted-foreground"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    );
  const commit = () => {
    if (text.trim()) {
      onAdd(text.trim());
      setText("");
      setAdding(false);
    }
  };
  return (
    <div className="flex items-center gap-1">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-8 w-32"
        placeholder="Custom…"
        autoFocus
      />
      <Button type="button" size="sm" onClick={commit}>
        Add
      </Button>
    </div>
  );
}

/* ------------------- Heat / Cold / TENS ------------------- */
function ThermoForm({
  date,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: ThermoSession;
}) {
  const [kind, setKind] = useState<ThermoKind>(initialEntry?.kind ?? "heat");
  const [start, setStart] = useState(initialEntry?.start ?? nowHHMM());
  const [minutes, setMinutes] = useState<string>(
    initialEntry ? (initialEntry.minutes != null ? String(initialEntry.minutes) : "") : "20",
  );
  const [ongoing, setOngoing] = useState(!!initialEntry?.ongoing);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    const editing = !!initialEntry;
    const mins = ongoing ? 0 : minutes === "" ? 0 : Number(minutes);
    const e: ThermoSession = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      kind,
      start,
      minutes: mins,
      ongoing: ongoing || undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      heat: editing ? (l.heat ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.heat ?? []), e],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Type">
        <div className="mt-2 flex gap-2">
          <Chip active={kind === "heat"} onClick={() => setKind("heat")}>
            <Ico e="♨️" size={16} /> Heat
          </Chip>
          <Chip active={kind === "cold"} onClick={() => setKind("cold")}>
            <Ico e="🧊" size={16} /> Cold
          </Chip>
          <Chip active={kind === "tens"} onClick={() => setKind("tens")}>
            <Ico e="⭐" size={16} /> TENS
          </Chip>
        </div>
      </Field>
      <Field label="Start">
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full" />
      </Field>
      <DurationField minutes={minutes} setMinutes={setMinutes} ongoing={ongoing} setOngoing={setOngoing} />
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- FOOD ------------------- */
function FoodForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: FoodEntry;
}) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [what, setWhat] = useState(initialEntry?.what ?? "");
  const [feelings, setFeelings] = useState<string[]>(initialEntry?.feelings ?? []);
  const [after, setAfter] = useState(initialEntry?.after ?? "");
  const [hydration, setHydration] = useState<string>(
    initialEntry?.hydrationMl != null ? String(initialEntry.hydrationMl) : "",
  );
  const [caffeine, setCaffeine] = useState<string>(
    initialEntry?.caffeineMg != null ? String(initialEntry.caffeineMg) : "",
  );
  const [alcohol, setAlcohol] = useState<string>(
    initialEntry?.alcoholDrinks != null ? String(initialEntry.alcoholDrinks) : "",
  );
  const [symptomsAfter, setSymptomsAfter] = useState<string[]>(initialEntry?.symptomsAfter ?? []);
  const [histFlare, setHistFlare] = useState<boolean>(!!initialEntry?.histamineFlare);
  const [histSymptoms, setHistSymptoms] = useState<string[]>(initialEntry?.histamineSymptoms ?? []);
  const [highHist, setHighHist] = useState<boolean>(!!initialEntry?.highHistamine);
  const [allergensInMeal, setAllergensInMeal] = useState<string[]>(initialEntry?.allergensInMeal ?? []);
  const [allergicReaction, setAllergicReaction] = useState<boolean>(!!initialEntry?.allergicReaction);
  const [reactionSeverity, setReactionSeverity] = useState<"mild" | "moderate" | "severe" | undefined>(
    initialEntry?.reactionSeverity,
  );
  const allergensBase = data.settings.allergens ?? ALLERGENS_DEFAULT;
  const addCustom = (v: string) =>
    update((d) =>
      withoutCustomTombstones(
        { ...d, custom: { ...d.custom, foodFeelings: [...d.custom.foodFeelings, v] } },
        "foodFeelings",
        [v],
      ),
    );
  const addCustomList = (k: "histamineSymptoms" | "foodSymptomsAfter", v: string) =>
    update((d) => withoutCustomTombstones({ ...d, custom: { ...d.custom, [k]: [...(d.custom[k] ?? []), v] } }, k, [v]));
  const removeCustomList = (k: "histamineSymptoms" | "foodSymptomsAfter", v: string) =>
    update((d) =>
      withCustomTombstones({ ...d, custom: { ...d.custom, [k]: (d.custom[k] ?? []).filter((x) => x !== v) } }, k, [v]),
    );
  const renameCustomList = (k: "histamineSymptoms" | "foodSymptomsAfter", o: string, n: string) =>
    update((d) =>
      withoutCustomTombstones(
        withCustomTombstones(
          { ...d, custom: { ...d.custom, [k]: (d.custom[k] ?? []).map((x) => (x === o ? n : x)) } },
          k,
          [o],
        ),
        k,
        [n],
      ),
    );
  const save = () => {
    if (!what.trim() && !hydration && !caffeine && !alcohol && !histFlare && symptomsAfter.length === 0) return;
    const editing = !!initialEntry;
    const entry: FoodEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time,
      what: what.trim(),
      feelings,
      after: after.trim() || undefined,
      hydrationMl: hydration === "" ? undefined : Number(hydration),
      caffeineMg: caffeine === "" ? undefined : Number(caffeine),
      alcoholDrinks: alcohol === "" ? undefined : Number(alcohol),
      symptomsAfter: symptomsAfter.length ? symptomsAfter : undefined,
      histamineFlare: histFlare || undefined,
      histamineSymptoms: histFlare && histSymptoms.length ? histSymptoms : undefined,
      highHistamine: highHist || undefined,
      allergensInMeal: allergensInMeal.length ? allergensInMeal : undefined,
      allergicReaction: allergicReaction || undefined,
      reactionSeverity: allergicReaction ? reactionSeverity : undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      food: editing ? (l.food ?? []).map((x) => (x.id === entry.id ? entry : x)) : [...(l.food ?? []), entry],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="What did you eat?">
        <Textarea
          rows={2}
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="e.g. chicken, rice, tomato"
        />
      </Field>
      <Field label="Quick add">
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { l: "🍵 Matcha", w: "Matcha", caf: 70 },
            { l: "☕ Coffee", w: "Coffee", caf: 95 },
            { l: "🫖 Tea", w: "Tea", caf: 40 },
            { l: "💧 Water", w: "Water", hyd: 250 },
            { l: "🥑 Avocado", w: "Avocado" },
          ].map((q) => (
            <button
              key={q.l}
              type="button"
              onClick={() => {
                setWhat((w) => (w ? `${w}, ${q.w}` : q.w));
                if (q.caf) setCaffeine(String((Number(caffeine) || 0) + q.caf));
                if (q.hyd) setHydration(String((Number(hydration) || 0) + q.hyd));
              }}
              className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10"
            >
              <IcoText text={q.l} size={14} />
            </button>
          ))}
          {data.custom.foodQuickAdd.map((c) => (
            <span key={c} className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setWhat((w) => (w ? `${w}, ${c}` : c))}
                className="rounded-full bg-tint px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:bg-primary/10"
              >
                <IcoText text={c} size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove "${c}" from quick add?`))
                    update((d) => ({
                      ...d,
                      custom: { ...d.custom, foodQuickAdd: d.custom.foodQuickAdd.filter((x) => x !== c) },
                    }));
                }}
                aria-label={`Remove ${c}`}
                className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-tint text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <AddCustomInline
            onAdd={(v) =>
              update((d) => ({ ...d, custom: { ...d.custom, foodQuickAdd: [...d.custom.foodQuickAdd, v] } }))
            }
          />
        </div>
      </Field>
      <Field label="Reaction?">
        <div className="mt-1 flex gap-2">
          <Chip active={!allergicReaction} onClick={() => setAllergicReaction(false)}>
            No / not sure
          </Chip>
          <Chip active={allergicReaction} onClick={() => setAllergicReaction(true)}>
            Yes — log it
          </Chip>
        </div>
        {allergicReaction && (
          <div className="mt-2 flex gap-2">
            {(["mild", "moderate", "severe"] as const).map((s2) => (
              <Chip key={s2} active={reactionSeverity === s2} onClick={() => setReactionSeverity(s2)}>
                {s2[0].toUpperCase() + s2.slice(1)}
              </Chip>
            ))}
          </div>
        )}
      </Field>
      <Field label="How do I feel after food?">
        <CustomChipList
          base={FOOD_FEELINGS_DEFAULT}
          custom={data.custom.foodFeelings}
          onAddCustom={addCustom}
          onRemoveCustom={(v) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, foodFeelings: d.custom.foodFeelings.filter((x) => x !== v) },
            }));
            setFeelings((a) => a.filter((x) => x !== v));
          }}
          selected={feelings}
          onToggle={(v) => setFeelings((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Symptoms after food">
        <CustomChipList
          base={FOOD_SYMPTOMS_AFTER}
          custom={data.custom.foodSymptomsAfter ?? []}
          onAddCustom={(v) => addCustomList("foodSymptomsAfter", v)}
          onRemoveCustom={(v) => {
            removeCustomList("foodSymptomsAfter", v);
            setSymptomsAfter((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            renameCustomList("foodSymptomsAfter", o, n);
            setSymptomsAfter((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={symptomsAfter}
          onToggle={(v) => setSymptomsAfter((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="High histamine food?">
        <div className="mt-1 flex gap-2">
          <Chip active={!highHist} onClick={() => setHighHist(false)}>
            No
          </Chip>
          <Chip active={highHist} onClick={() => setHighHist(true)}>
            Yes
          </Chip>
        </div>
      </Field>
      <Field label="Histamine flare?">
        <div className="mt-1 flex gap-2">
          <Chip active={!histFlare} onClick={() => setHistFlare(false)}>
            No
          </Chip>
          <Chip active={histFlare} onClick={() => setHistFlare(true)}>
            Yes — log it
          </Chip>
        </div>
      </Field>
      {histFlare && (
        <div className="rounded-2xl border border-border p-3">
          <Field label="Histamine flare symptoms">
            <CustomChipList
              base={HISTAMINE_SYMPTOMS}
              custom={data.custom.histamineSymptoms ?? []}
              onAddCustom={(v) => addCustomList("histamineSymptoms", v)}
              onRemoveCustom={(v) => {
                removeCustomList("histamineSymptoms", v);
                setHistSymptoms((a) => a.filter((x) => x !== v));
              }}
              onRenameCustom={(o, n) => {
                renameCustomList("histamineSymptoms", o, n);
                setHistSymptoms((a) => a.map((x) => (x === o ? n : x)));
              }}
              selected={histSymptoms}
              onToggle={(v) => setHistSymptoms((a) => toggleIn(a, v))}
            />
          </Field>
        </div>
      )}
      <Field label="Allergens in this meal">
        <CustomChipList
          base={allergensBase}
          custom={data.custom.allergens}
          onAddCustom={(v) =>
            update((d) => ({
              ...d,
              settings: { ...d.settings, allergens: [...(d.settings.allergens ?? ALLERGENS_DEFAULT), v] },
              custom: { ...d.custom, allergens: [...d.custom.allergens, v] },
            }))
          }
          onRemoveCustom={(v) => {
            update((d) => ({ ...d, custom: { ...d.custom, allergens: d.custom.allergens.filter((x) => x !== v) } }));
            setAllergensInMeal((a) => a.filter((x) => x !== v));
          }}
          onRenameCustom={(o, n) => {
            update((d) => ({
              ...d,
              custom: { ...d.custom, allergens: d.custom.allergens.map((x) => (x === o ? n : x)) },
            }));
            setAllergensInMeal((a) => a.map((x) => (x === o ? n : x)));
          }}
          selected={allergensInMeal}
          onToggle={(v) => setAllergensInMeal((a) => toggleIn(a, v))}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Water (ml)">
          <Input type="number" value={hydration} onChange={(e) => setHydration(e.target.value)} placeholder="300" />
        </Field>
        <Field label="Caffeine (mg)">
          <Input type="number" value={caffeine} onChange={(e) => setCaffeine(e.target.value)} placeholder="80" />
        </Field>
        <Field label="Alcohol (drinks)">
          <Input type="number" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <Field label="Additional note (optional)">
        <Textarea rows={2} value={after} onChange={(e) => setAfter(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- BOWEL ------------------- */
function BristolIcon({ shape, color }: { shape: string; color: string }) {
  const s = shape;
  return (
    <svg viewBox="0 0 60 40" className="h-8 w-14 shrink-0">
      {s === "lumps" &&
        Array.from({ length: 5 }).map((_, i) => <circle key={i} cx={8 + i * 11} cy={20} r={4.5} fill={color} />)}
      {s === "lumpy" && (
        <rect x={4} y={12} width={52} height={16} rx={7} fill={color} stroke="#0002" strokeDasharray="4 3" />
      )}
      {s === "cracked" && (
        <>
          <rect x={4} y={12} width={52} height={16} rx={8} fill={color} />
          {[16, 26, 36, 46].map((x) => (
            <line key={x} x1={x} y1={13} x2={x} y2={27} stroke="#0004" strokeWidth={1.5} />
          ))}
        </>
      )}
      {s === "smooth" && <rect x={4} y={13} width={52} height={14} rx={7} fill={color} />}
      {s === "blobs" && (
        <>
          <ellipse cx={16} cy={20} rx={10} ry={7} fill={color} />
          <ellipse cx={32} cy={20} rx={9} ry={6} fill={color} />
          <ellipse cx={46} cy={20} rx={8} ry={6} fill={color} />
        </>
      )}
      {s === "mushy" && <path d="M4 22 Q10 10 20 22 T36 22 T56 22 L56 30 L4 30 Z" fill={color} />}
      {s === "liquid" && (
        <>
          <rect x={4} y={22} width={52} height={8} rx={4} fill={color} />
          {[12, 24, 36, 48].map((x) => (
            <circle key={x} cx={x} cy={16} r={2} fill={color} opacity={0.6} />
          ))}
        </>
      )}
    </svg>
  );
}
function BowelForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: BowelEntry;
}) {
  const [time, setTime] = useState(initialEntry?.time ?? nowHHMM());
  const [bristol, setBristol] = useState<number>(initialEntry?.bristol ?? 4);
  const [feelings, setFeelings] = useState<string[]>((initialEntry?.feelings ?? []).map(stripEmoji));
  const [symptoms, setSymptoms] = useState<string[]>(initialEntry?.symptoms ?? []);
  const [urinary, setUrinary] = useState<string[]>(initialEntry?.urinary ?? []);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const addUrinary = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, urinary: [...d.custom.urinary, v] } }));
  const rmUrinary = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, urinary: d.custom.urinary.filter((x) => x !== v) } }));
    setUrinary((a) => a.filter((x) => x !== v));
  };
  const rnUrinary = (o: string, n: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, urinary: d.custom.urinary.map((x) => (x === o ? n : x)) } }));
    setUrinary((a) => a.map((x) => (x === o ? n : x)));
  };
  const addFeel = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, bowelFeelings: [...d.custom.bowelFeelings, v] } }));
  const rmFeel = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, bowelFeelings: d.custom.bowelFeelings.filter((x) => x !== v) } }));
    setFeelings((a) => a.filter((x) => x !== v));
  };
  const addSym = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, bowelSymptoms: [...d.custom.bowelSymptoms, v] } }));
  const rmSym = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, bowelSymptoms: d.custom.bowelSymptoms.filter((x) => x !== v) } }));
    setSymptoms((a) => a.filter((x) => x !== v));
  };
  const save = () => {
    const editing = !!initialEntry;
    const entry: BowelEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time,
      bristol,
      feelings: feelings.length ? feelings : undefined,
      symptoms: symptoms.length ? symptoms : undefined,
      urinary: urinary.length ? urinary : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      bowel: editing ? (l.bowel ?? []).map((x) => (x.id === entry.id ? entry : x)) : [...(l.bowel ?? []), entry],
    }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Time">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Bristol stool scale">
        <div className="mt-1 space-y-1.5">
          <button
            onClick={() => setBristol(-1)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
              bristol === -1 ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              ∅
            </span>
            <span className="flex-1">
              <span className="font-medium">No bowel movement</span>
              <br />
              <span className="text-[11px] text-muted-foreground">Didn't go today</span>
            </span>
          </button>
          <button
            onClick={() => setBristol(0)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
              bristol === 0 ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6)" }}
            >
              0
            </span>
            <span className="flex-1">
              <span className="font-medium">Type 0 — Mystery</span>
              <br />
              <span className="text-[11px] text-muted-foreground">Unknown / mixed</span>
            </span>
          </button>

          {BRISTOL.map((b) => (
            <button
              key={b.n}
              onClick={() => setBristol(b.n)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                bristol === b.n ? "border-primary bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
                style={{ background: b.color }}
              >
                {b.n}
              </span>
              <BristolIcon shape={b.shape} color={b.color} />
              <div className="flex-1">
                <p className="font-medium">
                  <IcoText text={b.label} size={14} />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <IcoText text={b.sub} size={12} />
                </p>
              </div>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Urinary">
        <CustomChipList
          base={URINARY_DEFAULT}
          custom={data.custom.urinary}
          onAddCustom={addUrinary}
          onRemoveCustom={rmUrinary}
          onRenameCustom={rnUrinary}
          selected={urinary}
          onToggle={(v) => setUrinary((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="How do you feel?">
        <CustomChipList
          base={BOWEL_FEELINGS_DEFAULT}
          custom={data.custom.bowelFeelings}
          onAddCustom={addFeel}
          onRemoveCustom={rmFeel}
          selected={feelings}
          onToggle={(v) => setFeelings((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Symptoms">
        <CustomChipList
          base={BOWEL_SYMPTOMS_DEFAULT}
          custom={data.custom.bowelSymptoms}
          onAddCustom={addSym}
          onRemoveCustom={rmSym}
          selected={symptoms}
          onToggle={(v) => setSymptoms((a) => toggleIn(a, v))}
        />
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- TEMP / WEIGHT / SLEEP ------------------- */
function TempForm({
  date,
  data,
  update,
  onDone,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
}) {
  type VitalRow = {
    id: string;
    time: string;
    value: number;
  };

  const cur = data.dayLogs[date] ?? {};

  const [temperature, setTemperature] = useState("");
  const [temperatureTime, setTemperatureTime] = useState(nowHHMM());

  const [weight, setWeight] = useState("");
  const [weightTime, setWeightTime] = useState(nowHHMM());

  const [sleep, setSleep] = useState(cur.sleepHours != null ? String(cur.sleepHours) : "");

  const [quality, setQuality] = useState<string[]>(asArr(cur.sleepQuality));

  const sortVitals = (entries: VitalRow[]): VitalRow[] =>
    entries.slice().sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));

  const latestVitalValue = (entries: VitalRow[]): number | undefined => {
    const sorted = sortVitals(entries);

    return sorted.length ? sorted[sorted.length - 1].value : undefined;
  };

  const existingVitals = (
    entries: VitalRow[] | undefined,
    legacyValue: number | undefined,
    legacyId: string,
  ): VitalRow[] => {
    if (entries?.length) {
      return sortVitals(entries);
    }

    if (legacyValue != null && Number.isFinite(legacyValue)) {
      return [
        {
          id: legacyId,
          time: "00:00",
          value: legacyValue,
        },
      ];
    }

    return [];
  };

  const temperatureEntries = useMemo(
    () => existingVitals(cur.temperatureEntries, cur.temperature, `${date}-legacy-temperature`),
    [cur.temperatureEntries, cur.temperature, date],
  );

  const weightEntries = useMemo(
    () => existingVitals(cur.weightEntries, cur.weight, `${date}-legacy-weight`),
    [cur.weightEntries, cur.weight, date],
  );

  const deleteTemperature = (id: string) => {
    updateDayLog(update, date, (log) => {
      const current = existingVitals(log.temperatureEntries, log.temperature, `${date}-legacy-temperature`);

      const next = sortVitals(current.filter((entry) => entry.id !== id));

      return {
        ...log,
        temperatureEntries: next.length ? next : undefined,
        temperature: latestVitalValue(next),
      };
    });
  };

  const deleteWeight = (id: string) => {
    updateDayLog(update, date, (log) => {
      const current = existingVitals(log.weightEntries, log.weight, `${date}-legacy-weight`);

      const next = sortVitals(current.filter((entry) => entry.id !== id));

      return {
        ...log,
        weightEntries: next.length ? next : undefined,
        weight: latestVitalValue(next),
      };
    });
  };

  const save = () => {
    const temperatureValue = temperature.trim() === "" ? undefined : Number(temperature.replace(",", "."));

    const weightValue = weight.trim() === "" ? undefined : Number(weight.replace(",", "."));

    const sleepValue = sleep.trim() === "" ? undefined : Number(sleep.replace(",", "."));

    updateDayLog(update, date, (log) => {
      const currentTemperatures = existingVitals(log.temperatureEntries, log.temperature, `${date}-legacy-temperature`);

      const currentWeights = existingVitals(log.weightEntries, log.weight, `${date}-legacy-weight`);

      const nextTemperatures =
        temperatureValue != null && Number.isFinite(temperatureValue)
          ? sortVitals([
              ...currentTemperatures,
              {
                id: crypto.randomUUID(),
                time: temperatureTime || nowHHMM(),
                value: temperatureValue,
              },
            ])
          : currentTemperatures;

      const nextWeights =
        weightValue != null && Number.isFinite(weightValue)
          ? sortVitals([
              ...currentWeights,
              {
                id: crypto.randomUUID(),
                time: weightTime || nowHHMM(),
                value: weightValue,
              },
            ])
          : currentWeights;

      return {
        ...log,

        temperatureEntries: nextTemperatures.length ? nextTemperatures : undefined,

        weightEntries: nextWeights.length ? nextWeights : undefined,

        // Posledná hodnota zostáva aj v starom poli,
        // aby fungoval Home, Calendar a staršie grafy.
        temperature: latestVitalValue(nextTemperatures),

        weight: latestVitalValue(nextWeights),

        sleepHours: sleepValue != null && Number.isFinite(sleepValue) ? sleepValue : undefined,

        sleepQuality: quality.length ? quality : undefined,
      };
    });

    onDone();
  };

  return (
    <div className="space-y-5">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="New temperature measurement">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1"))}
            placeholder="36,6 °C"
          />

          <Input type="time" value={temperatureTime} onChange={(e) => setTemperatureTime(e.target.value)} />
        </div>

        {temperatureEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Saved temperature measurements
            </p>

            {temperatureEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-tint">
                  <Ico e="🌡️" size={19} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{entry.value.toFixed(1).replace(".", ",")} °C</p>

                  <p className="text-xs text-muted-foreground">{entry.time}</p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteTemperature(entry.id)}
                  aria-label={`Delete temperature ${entry.value}`}
                  className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="New weight measurement">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1"))}
            placeholder="62,5 kg"
          />

          <Input type="time" value={weightTime} onChange={(e) => setWeightTime(e.target.value)} />
        </div>

        {weightEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Saved weight measurements
            </p>

            {weightEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-tint">
                  <Ico e="⚖️" size={19} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{entry.value.toFixed(1).replace(".", ",")} kg</p>

                  <p className="text-xs text-muted-foreground">{entry.time}</p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteWeight(entry.id)}
                  aria-label={`Delete weight ${entry.value}`}
                  className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="Sleep (hours)">
        <Input
          type="text"
          inputMode="decimal"
          value={sleep}
          onChange={(e) => setSleep(e.target.value.replace(/[^0-9.,]/g, "").replace(/([.,].*)[.,]/g, "$1"))}
          placeholder="8"
        />
      </Field>

      <Field label="How I slept">
        <div className="mt-2 flex flex-wrap gap-2">
          {SLEEP_QUALITY.map((item) => (
            <Chip
              key={item}
              active={quality.includes(item)}
              onClick={() => setQuality((current) => toggleIn(current, item))}
            >
              {item}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  );
}

/* ------------------- MEDS ------------------- */
function MedsForm({
  date,
  data,
  update,
  onDone,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
}) {
  const meds = data.meds;
  const taken = data.medLog[date] ?? {};
  const takenTimes = data.medLogTimes?.[date] ?? {};
  const toggle = (key: string, defaultTime?: string) =>
    update((d) => {
      const day = { ...(d.medLog[date] ?? {}) };
      const times = { ...(d.medLogTimes?.[date] ?? {}) };
      const nextOn = !day[key];
      day[key] = nextOn;
      if (nextOn && defaultTime && !times[key]) times[key] = defaultTime;
      if (!nextOn) delete times[key];
      return { ...d, medLog: { ...d.medLog, [date]: day }, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
    });
  const setTakenTime = (key: string, time: string) =>
    update((d) => {
      const times = { ...(d.medLogTimes?.[date] ?? {}) };
      times[key] = time;
      return { ...d, medLogTimes: { ...(d.medLogTimes ?? {}), [date]: times } };
    });

  const [extraName, setExtraName] = useState("");
  const [extraDose, setExtraDose] = useState("");
  const [extraTime, setExtraTime] = useState(nowHHMM());
  const [extraNote, setExtraNote] = useState("");
  const addExtra = () => {
    if (!extraName.trim()) return;
    const e: ExtraMed = {
      id: crypto.randomUUID(),
      time: extraTime,
      name: extraName.trim(),
      dose: extraDose.trim() || undefined,
      note: extraNote.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({ ...l, extraMeds: [...(l.extraMeds ?? []), e] }));
    setExtraName("");
    setExtraDose("");
    setExtraNote("");
    setExtraTime(nowHHMM());
  };
  const today = date === todayKey();
  const extras = data.dayLogs[date]?.extraMeds ?? [];

  return (
    <div className="space-y-4">
      {meds.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medications yet. Add them from Meds settings.</p>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{today ? "Today" : date}</p>
          <div className="mt-2 space-y-2">
            {meds.map((m) =>
              m.asNeeded ? (
                <label key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                  <input
                    type="checkbox"
                    checked={!!taken[`${m.id}@asneeded`]}
                    onChange={() => toggle(`${m.id}@asneeded`, nowHHMM())}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">As needed{m.dose ? ` · ${m.dose}` : ""}</p>
                    {m.note && (
                      <p className="text-[11px] text-muted-foreground">
                        <Ico e="📝" size={13} /> <IcoText text={m.note} size={12} />
                      </p>
                    )}
                  </div>
                  {taken[`${m.id}@asneeded`] && (
                    <Input
                      type="time"
                      value={takenTimes[`${m.id}@asneeded`] ?? nowHHMM()}
                      onChange={(e) => setTakenTime(`${m.id}@asneeded`, e.target.value)}
                      className="h-8 w-24"
                    />
                  )}
                </label>
              ) : (
                m.times.map((t) => {
                  const k = `${m.id}@${t}`;
                  const isTaken = !!taken[k];
                  return (
                    <label key={k} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                      <input type="checkbox" checked={isTaken} onChange={() => toggle(k, t)} className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {m.name} <span className="text-xs text-muted-foreground">· scheduled {t}</span>
                        </p>
                        {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
                        {m.note && (
                          <p className="text-[11px] text-muted-foreground">
                            <Ico e="📝" size={13} /> <IcoText text={m.note} size={12} />
                          </p>
                        )}
                      </div>
                      {isTaken && (
                        <Input
                          type="time"
                          value={takenTimes[k] ?? t}
                          onChange={(e) => setTakenTime(k, e.target.value)}
                          className="h-8 w-24"
                          title="Actual time taken"
                        />
                      )}
                    </label>
                  );
                })
              ),
            )}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Extra dose (one-off)</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Input
            placeholder="Name"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className="col-span-2"
          />
          <Input type="time" value={extraTime} onChange={(e) => setExtraTime(e.target.value)} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input placeholder="Dose (optional)" value={extraDose} onChange={(e) => setExtraDose(e.target.value)} />
          <Input placeholder="Note (optional)" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
        </div>
        <Button className="mt-2 w-full" onClick={addExtra} disabled={!extraName.trim()}>
          Add extra dose
        </Button>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {extras.map((e) => (
              <li key={e.id}>
                • {e.time} — {e.name}
                {e.dose ? ` (${e.dose})` : ""}
                {e.note ? ` — ${e.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
      <SheetFooter className="mt-2">
        <div className="mt-5 flex justify-end border-t border-border/50 pt-4">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-10 min-w-[78px] items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>Done</span>
            <span aria-hidden="true" className="text-base leading-none">✓</span>
          </button>
        </div>
      </SheetFooter>
    </div>
  );
}

/* ------------------- WORKOUT ------------------- */
function WorkoutForm({
  date,
  data,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: WorkoutEntry;
}) {
  const [kind, setKind] = useState<string>(
    initialEntry?.kind ? stripEmoji(initialEntry.kind) : WORKOUT_KINDS_DEFAULT[0],
  );
  const [minutes, setMinutes] = useState<number>(initialEntry?.minutes ?? 30);
  const [weight, setWeight] = useState<string>(initialEntry?.weightKg != null ? String(initialEntry.weightKg) : "");
  const [distance, setDistance] = useState<string>(
    initialEntry?.distanceKm != null ? String(initialEntry.distanceKm) : "",
  );
  const [elevation, setElevation] = useState<string>(
    initialEntry?.elevationM != null ? String(initialEntry.elevationM) : "",
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialEntry?.exercises ?? []);
  const [rpe, setRpe] = useState<number | undefined>(initialEntry?.rpe);
  const [magnesium, setMagnesium] = useState<boolean>(initialEntry?.magnesiumBefore ?? false);
  const [trigger, setTrigger] = useState<WorkoutEntry["triggeredSymptom"]>(initialEntry?.triggeredSymptom);
  const [feeling, setFeeling] = useState<string[]>(asArr(initialEntry?.feeling).map(stripEmoji));
  const [note, setNote] = useState<string>(initialEntry?.note ?? "");
  const addKind = (v: string) =>
    update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: [...d.custom.workoutKinds, v] } }));
  const rmKind = (v: string) => {
    update((d) => ({ ...d, custom: { ...d.custom, workoutKinds: d.custom.workoutKinds.filter((x) => x !== v) } }));
    if (kind === v) setKind(WORKOUT_KINDS_DEFAULT[0]);
  };

  const log = data.dayLogs[date];
  const symptomOptions = [
    ...(log?.tetany ?? []).map((t) => ({
      type: "tetany" as const,
      id: t.id,
      label: `${t.time} tetany ${t.intensity}/5`,
    })),
    ...(log?.pain ?? []).map((p) => ({ type: "pain" as const, id: p.id, label: `${p.time} pain ${p.score}/10` })),
  ];

  const save = () => {
    const editing = !!initialEntry;
    const e: WorkoutEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      time: initialEntry?.time ?? nowHHMM(),
      kind,
      minutes,
      weightKg: weight === "" ? undefined : Number(weight),
      distanceKm: workoutHasDistance(kind) && distance !== "" ? Number(distance) : undefined,
      elevationM: workoutIsHike(kind) && elevation !== "" ? Number(elevation) : undefined,
      exercises: workoutIsStrength(kind) && exercises.length ? exercises : undefined,
      rpe,
      magnesiumBefore: magnesium || undefined,
      triggeredSymptom: trigger,
      feeling: feeling.length ? feeling : undefined,
      note: note.trim() || undefined,
    };
    updateDayLog(update, date, (l) => ({
      ...l,
      workout: editing ? (l.workout ?? []).map((x) => (x.id === e.id ? e : x)) : [...(l.workout ?? []), e],
    }));
    // NOTE: workout "weight after" is stored on the workout entry only — it must not
    // overwrite the day's body-weight metric used by the Weight chart.
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} />
      <Field label="Type">
        <CustomChipList
          base={WORKOUT_KINDS_DEFAULT}
          custom={data.custom.workoutKinds}
          onAddCustom={addKind}
          onRemoveCustom={rmKind}
          selected={[kind]}
          onToggle={(v) => setKind(v)}
        />
      </Field>
      <Field label="Duration (minutes)">
        <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
      </Field>

      {workoutHasDistance(kind) && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Distance (km)">
            <Input type="number" step="0.1" min={0} value={distance} onChange={(e) => setDistance(e.target.value)} />
          </Field>
          {workoutIsHike(kind) && (
            <Field label="Elevation gain (m)">
              <Input type="number" step="1" min={0} value={elevation} onChange={(e) => setElevation(e.target.value)} />
            </Field>
          )}
        </div>
      )}

      {workoutIsStrength(kind) && (
        <Field label="Exercises">
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={ex.id} className="rounded-2xl border border-border p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={ex.name}
                    placeholder="Exercise name"
                    onChange={(e) =>
                      setExercises((a) => a.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove exercise"
                    onClick={() => setExercises((a) => a.filter((_, j) => j !== i))}
                    className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Sets"
                    value={ex.sets ?? ""}
                    onChange={(e) =>
                      setExercises((a) =>
                        a.map((x, j) =>
                          j === i ? { ...x, sets: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Reps"
                    value={ex.reps ?? ""}
                    onChange={(e) =>
                      setExercises((a) =>
                        a.map((x, j) =>
                          j === i ? { ...x, reps: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="kg"
                    value={ex.weightKg ?? ""}
                    onChange={(e) =>
                      setExercises((a) =>
                        a.map((x, j) =>
                          j === i ? { ...x, weightKg: e.target.value === "" ? undefined : Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExercises((a) => [...a, { id: crypto.randomUUID(), name: "" }])}
            >
              <Plus className="h-4 w-4" /> Add exercise
            </Button>
          </div>
        </Field>
      )}

      <Field label={`Intensity (RPE) ${rpe ?? "-"} / 10`}>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5 px-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const active = rpe === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRpe(rpe === n ? undefined : n)}
                aria-label={`RPE ${n}`}
                className={`h-8 w-8 rounded-full text-[11px] font-semibold transition ${
                  active ? "text-white ring-2 ring-foreground" : "text-foreground"
                }`}
                style={{ background: painColor(n) }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Magnesium before workout?">
        <div className="mt-1 flex gap-2">
          <Chip active={!magnesium} onClick={() => setMagnesium(false)}>
            No
          </Chip>
          <Chip active={magnesium} onClick={() => setMagnesium(true)}>
            Yes
          </Chip>
        </div>
      </Field>

      <Field label="Triggered a symptom? (optional)">
        {symptomOptions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No tetany or pain entries logged for this day yet.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            <Chip active={!trigger} onClick={() => setTrigger(undefined)}>
              No
            </Chip>
            {symptomOptions.map((o) => (
              <Chip
                key={o.id}
                active={trigger?.id === o.id}
                onClick={() =>
                  setTrigger(trigger?.id === o.id ? undefined : { type: o.type, id: o.id, label: o.label })
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <Field label="Weight after (kg, optional)">
        <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Saved with this workout only — it doesn't change your daily weight.
        </p>
      </Field>
      <Field label="How you feel">
        <div className="mt-2 flex flex-wrap gap-2">
          {["Great", "Good", "Ok", "Tired", "Sore"].map((f) => (
            <Chip key={f} active={feeling.includes(f)} onClick={() => setFeeling((a) => toggleIn(a, f))}>
              {f}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- EVENT ------------------- */
function EventForm({
  date,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: EventEntry;
}) {
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [color, setColor] = useState(initialEntry?.color ?? EVENT_COLORS[0]);
  const save = () => {
    if (!title.trim()) return;
    const editing = !!initialEntry;
    const e: EventEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined,
      timeEnd: timeEnd || undefined,
      note: note.trim() || undefined,
      color,
    };
    update((d) => ({ ...d, events: editing ? d.events.map((x) => (x.id === e.id ? e : x)) : [...d.events, e] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Doctor visit" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Time from">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Time to">
          <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </Field>
      </div>
      <Field label="Color">
        <div className="mt-2 flex gap-2 flex-wrap">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- TASK ------------------- */
function TaskForm({
  date,
  update,
  onDone,
  initialEntry,
}: {
  date: string;
  update: UpdateFn;
  onDone: () => void;
  initialEntry?: TaskEntry;
}) {
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [startDate, setStartDate] = useState(initialEntry?.startDate ?? date);
  const [endDate, setEndDate] = useState(initialEntry?.endDate ?? date);
  const [time, setTime] = useState(initialEntry?.time ?? "");
  const [timeEnd, setTimeEnd] = useState(initialEntry?.timeEnd ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const save = () => {
    if (!title.trim()) return;
    const editing = !!initialEntry;
    const t: TaskEntry = {
      id: initialEntry?.id ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      time: time || undefined,
      timeEnd: timeEnd || undefined,
      done: initialEntry?.done ?? false,
      note: note.trim() || undefined,
    };
    update((d) => ({ ...d, tasks: editing ? d.tasks.map((x) => (x.id === t.id ? t : x)) : [...d.tasks, t] }));
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} disabled={!title.trim()} />
      <Field label="Task">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What to do…" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Time from">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Time to">
          <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

/* ------------------- NOTE ------------------- */
function NoteForm({ date, update, onDone }: { date: string; update: UpdateFn; onDone: () => void }) {
  const [t, setT] = useState("");
  const [time, setTime] = useState("");
  const save = () => {
    if (!t.trim()) return;
    update((d) => {
      const list = (d.dayNotes[date] ?? []) as (string | { text: string; time?: string })[];
      const next: { text: string; time?: string }[] = list.map((x) => (typeof x === "string" ? { text: x } : x));
      next.push({ text: t.trim(), time: time || undefined });
      return { ...d, dayNotes: { ...d.dayNotes, [date]: next } };
    });
    onDone();
  };
  return (
    <div className="space-y-3">
      <SaveBar onCancel={onDone} onSave={save} disabled={!t.trim()} />
      <Field label="Time (optional)">
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Textarea rows={6} value={t} onChange={(e) => setT(e.target.value)} placeholder="Anything about today…" />
    </div>
  );
}

/* ------------------- Postpartum symptoms ------------------- */

function PostpartumSymptomsForm({
  date,
  data,
  update,
  onDone,
}: {
  date: string;
  data: BixboData;
  update: UpdateFn;
  onDone: () => void;
}) {
  const current: PostpartumDayLog = data.dayLogs[date]?.postpartum ?? {};
  const [symptoms, setSymptoms] = useState<string[]>(current.symptoms ?? []);
  const [note, setNote] = useState(current.note ?? "");

  const toggleSymptom = (symptom: string) => {
    setSymptoms((currentSymptoms) =>
      currentSymptoms.includes(symptom)
        ? currentSymptoms.filter((item) => item !== symptom)
        : [...currentSymptoms, symptom],
    );
  };

  const save = () => {
    updateDayLog(update, date, (dayLog) => ({
      ...dayLog,
      postpartum: {
        ...(dayLog.postpartum ?? {}),
        symptoms: symptoms.length ? symptoms : undefined,
        note: note.trim() || undefined,
      },
    }));

    onDone();
  };

  return (
    <div className="space-y-5">
      <SaveBar onCancel={onDone} onSave={save} />
      <div className="flex items-start gap-3 rounded-3xl bg-tint p-4 ring-1 ring-border/50">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-border/50">
          <Ico e="🤱" size={30} />
        </span>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Postpartum recovery</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Select every symptom you experienced today. The BIXBO icon is used instead of an Apple emoji.
          </p>
        </div>
      </div>

      <Field label="Symptoms today">
        <div className="mt-2 flex flex-wrap gap-2">
          {POSTPARTUM_SYMPTOMS.map((symptom) => (
            <Chip key={symptom} active={symptoms.includes(symptom)} onClick={() => toggleSymptom(symptom)}>
              {symptom}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Recovery note (optional)">
        <Textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add anything important about recovery, bleeding, feeding or how you feel."
        />
      </Field>

      {current.symptoms?.length || current.note ? (
        <button
          type="button"
          onClick={() => {
            updateDayLog(update, date, (dayLog) => ({
              ...dayLog,
              postpartum: {
                ...(dayLog.postpartum ?? {}),
                symptoms: undefined,
                note: undefined,
              },
            }));
            onDone();
          }}
          className="w-full rounded-2xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive ring-1 ring-destructive/30"
        >
          Clear postpartum symptoms
        </button>
      ) : null}
    </div>
  );
}