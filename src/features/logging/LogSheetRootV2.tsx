import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Ico } from "@/components/icons/BixboIcons";
import { ChevronLeft, Check, Pencil, Plus, Trash2, X } from "@/components/icons/BixboIcons";
import { CustomLogForm } from "@/components/CustomLogForm";
import { CoreFeatureCustomFieldInput } from "@/components/CoreFeatureCustomFieldsForm";
import { useI18n } from "@/hooks/useI18n";
import {
  customLogDefinitions,
  getRegistryFeature,
  isRegistrySurfaceEnabled,
  registryCustomFieldsForFeature,
  type RegistryFeatureId,
} from "@/lib/appRegistry";
import {
  isCycleTrackingHidden,
  nowHHMM,
  type BixboData,
  type BowelEntry,
  type CustomLogEntry,
  type CustomLogValue,
  type EventEntry,
  type FoodEntry,
  type PainEntry,
  type PanicAttack,
  type SexEntry,
  type TaskEntry,
  type TetanyEpisode,
  type ThermoSession,
  type WorkoutEntry,
} from "@/lib/storage";
import { CATEGORIES, type Category } from "./logCategories";
import { LogSchemaContext } from "./LogSchemaContext";
import type { UpdateFn } from "./LogFormPrimitives";
import { PainWizard } from "./PainWizard";
import { PanicForm, TetanyForm } from "./EpisodeForms";
import { PeriodForm } from "./CycleForms";
import { MedsForm } from "./MedsWorkoutForms";
import { EventForm, NoteForm, PostpartumSymptomsForm, TaskForm } from "./CalendarForms";
import {
  EnhancedBowelForm,
  EnhancedFoodForm,
  EnhancedSexForm,
  EnhancedTempForm,
  EnhancedThermoForm,
  EnhancedWorkoutForm,
} from "./EnhancedForms";

type PlanTarget = "event" | "task" | "note" | null;

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
  const { t } = useI18n();
  const [cat, setCat] = useState<Category | null>(initial ?? null);
  const [openToken, setOpenToken] = useState(0);
  const [editingOrder, setEditingOrder] = useState(false);
  const [customEditEntry, setCustomEditEntry] = useState<CustomLogEntry | null | undefined>();
  const [planTarget, setPlanTarget] = useState<PlanTarget>(
    initial === "event" || initial === "task" || initial === "note" ? initial : null,
  );

  useEffect(() => {
    if (open) {
      setOpenToken((v) => v + 1);
      setCat(initial ?? null);
      setPlanTarget(initial === "event" || initial === "task" || initial === "note" ? initial : null);
    }
  }, [open, initial]);

  const close = () => {
    setCat(null);
    setEditingOrder(false);
    setCustomEditEntry(undefined);
    setPlanTarget(null);
    onOpenChange(false);
  };

  const active = cat ?? initial;
  const renderActive: Category | undefined = active === "note" && planTarget ? planTarget : active;

  const back = () => {
    setCustomEditEntry(undefined);
    if (active === "note" && planTarget) {
      setPlanTarget(null);
      return;
    }
    if (initial) {
      close();
      return;
    }
    setCat(null);
    setPlanTarget(null);
  };

  const edit = editEntry;
  const editSource = edit && typeof edit === "object" ? (edit as { id?: unknown; time?: unknown }) : null;
  const editSourceId = typeof editSource?.id === "string" ? editSource.id : undefined;
  const editSourceTime = typeof editSource?.time === "string" ? editSource.time : undefined;
  const [adminFieldValues, setAdminFieldValues] = useState<Record<string, CustomLogValue>>({});

  const activeRegistryFeature = renderActive && !renderActive.startsWith("custom:")
    ? (renderActive as RegistryFeatureId)
    : null;
  const dayLevelAdminFeatures = new Set<RegistryFeatureId>(["period", "temp", "meds", "postpartum"]);
  const draftSourceEntryId = useMemo(
    () => globalThis.crypto?.randomUUID?.() ?? `core-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    [renderActive, date, openToken],
  );
  const activeSourceEntryId = activeRegistryFeature
    ? editSourceId ?? (dayLevelAdminFeatures.has(activeRegistryFeature) ? `day:${activeRegistryFeature}:${date}` : draftSourceEntryId)
    : draftSourceEntryId;
  const activeAdminFields = activeRegistryFeature ? registryCustomFieldsForFeature(data, activeRegistryFeature) : [];

  useEffect(() => {
    if (!activeRegistryFeature) {
      setAdminFieldValues({});
      return;
    }
    const entries = data.dayLogs[date]?.adminFields?.[activeRegistryFeature] ?? [];
    const linked = entries.find((entry) => entry.sourceEntryId === activeSourceEntryId);
    const legacyByTime = editSourceTime
      ? [...entries].reverse().find((entry) => !entry.sourceEntryId && entry.time === editSourceTime)
      : undefined;
    const legacyDayLevel = dayLevelAdminFeatures.has(activeRegistryFeature)
      ? [...entries].reverse().find((entry) => !entry.sourceEntryId)
      : undefined;
    setAdminFieldValues((linked ?? legacyByTime ?? legacyDayLevel)?.values ?? {});
  }, [activeRegistryFeature, activeSourceEntryId, data.dayLogs, date, editSourceTime, openToken]);

  const saveAdminCustomFields = () => {
    if (!activeRegistryFeature || !activeAdminFields.length) return;
    const editableFieldIds = new Set(activeAdminFields.map((field) => field.id));
    update((current) => {
      const day = current.dayLogs[date] ?? {};
      const adminFields = day.adminFields ?? {};
      const existing = adminFields[activeRegistryFeature] ?? [];
      const linkedIndex = existing.findIndex((entry) => entry.sourceEntryId === activeSourceEntryId);
      let legacyIndex = -1;
      if (linkedIndex < 0) {
        for (let index = existing.length - 1; index >= 0; index -= 1) {
          const entry = existing[index];
          const legacyTimeMatch = Boolean(editSourceTime && !entry.sourceEntryId && entry.time === editSourceTime);
          const legacyDayMatch = dayLevelAdminFeatures.has(activeRegistryFeature) && !entry.sourceEntryId;
          if (legacyTimeMatch || legacyDayMatch) {
            legacyIndex = index;
            break;
          }
        }
      }
      const matchIndex = linkedIndex >= 0 ? linkedIndex : legacyIndex;
      const previousValues = matchIndex >= 0 ? existing[matchIndex]?.values ?? {} : {};
      const values: Record<string, CustomLogValue> = { ...previousValues };
      editableFieldIds.forEach((fieldId) => {
        const value = adminFieldValues[fieldId];
        if (value === "" || value === undefined) delete values[fieldId];
        else values[fieldId] = value;
      });

      let nextEntries = existing;
      if (!Object.keys(values).length) {
        if (matchIndex >= 0) nextEntries = existing.filter((_, index) => index !== matchIndex);
        else return current;
      } else if (matchIndex >= 0) {
        nextEntries = existing.map((entry, index) => index === matchIndex
          ? { ...entry, values, sourceEntryId: activeSourceEntryId }
          : entry);
      } else {
        nextEntries = [...existing, {
          id: globalThis.crypto?.randomUUID?.() ?? `admin-field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: editSourceTime ?? nowHHMM(),
          values,
          sourceEntryId: activeSourceEntryId,
        }];
      }

      return {
        ...current,
        dayLogs: {
          ...current.dayLogs,
          [date]: {
            ...day,
            adminFields: { ...adminFields, [activeRegistryFeature]: nextEntries },
          },
        },
      };
    });
  };

  const cycleTrackingHidden = isCycleTrackingHidden(data);
  const postpartumActive = Boolean(data.postpartum?.active);

  const orderedCats = useMemo(() => {
    const saved = data.settings.logOrder ?? [];
    const builtins = CATEGORIES
      .map((category) => {
        const feature = getRegistryFeature(data, category.id as RegistryFeatureId);
        if (category.id === "note") {
          return { ...category, label: "Note & plan", emoji: "📝", registryOrder: feature.order };
        }
        return { ...category, label: feature.label || category.label, emoji: feature.icon || category.emoji, registryOrder: feature.order };
      })
      .filter((category) => {
        if (category.id === "event" || category.id === "task") return false;
        if (!isRegistrySurfaceEnabled(data, category.id as RegistryFeatureId, "log")) return false;
        if (category.id === "period" && cycleTrackingHidden) return false;
        if (category.id === "postpartum" && !postpartumActive) return false;
        return true;
      });
    const customs = customLogDefinitions(data).map((definition) => ({
      id: `custom:${definition.id}` as Category,
      label: definition.label,
      emoji: definition.icon,
      hint: "Custom log",
      registryOrder: 1000 + definition.order,
    }));
    const source = [...builtins, ...customs].sort((a, b) => a.registryOrder - b.registryOrder);
    const byId = new Map(source.map((c) => [c.id, c]));
    const seen = new Set<string>();
    const out: typeof source = [];
    for (const id of saved) {
      const c = byId.get(id as Category);
      if (c && !seen.has(id)) {
        out.push(c);
        seen.add(id);
      }
    }
    for (const c of source) if (!seen.has(c.id)) out.push(c);
    return out;
  }, [cycleTrackingHidden, data, postpartumActive]);

  const [draggingCat, setDraggingCat] = useState<Category | null>(null);
  const draggingCatRef = useRef<Category | null>(null);
  const dragOrderRef = useRef<Category[]>([]);
  const lastDragTargetRef = useRef<Category | null>(null);

  const persistVisibleOrder = (nextVisible: Category[]) => {
    update((d) => {
      const visible = new Set(nextVisible);
      const hiddenSaved = (d.settings.logOrder ?? []).filter((id) => !visible.has(id as Category));
      return { ...d, settings: { ...d.settings, logOrder: [...nextVisible, ...hiddenSaved] } };
    });
  };

  const startDirectReorder = (e: React.PointerEvent<HTMLButtonElement>, id: Category) => {
    if (!editingOrder) return;
    e.preventDefault();
    e.stopPropagation();
    draggingCatRef.current = id;
    dragOrderRef.current = orderedCats.map((c) => c.id);
    lastDragTargetRef.current = id;
    setDraggingCat(id);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* WebKit fallback */ }
  };

  const moveDirectReorder = (e: React.PointerEvent<HTMLButtonElement>) => {
    const fromId = draggingCatRef.current;
    if (!editingOrder || !fromId) return;
    e.preventDefault();
    e.stopPropagation();
    const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = hit?.closest<HTMLElement>("[data-log-category]");
    const toId = target?.dataset.logCategory as Category | undefined;
    if (!toId || toId === fromId || toId === lastDragTargetRef.current) return;
    const next = dragOrderRef.current.slice();
    const from = next.indexOf(fromId);
    const to = next.indexOf(toId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    dragOrderRef.current = next;
    lastDragTargetRef.current = toId;
    persistVisibleOrder(next);
  };

  const endDirectReorder = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    draggingCatRef.current = null;
    dragOrderRef.current = [];
    lastDragTargetRef.current = null;
    setDraggingCat(null);
  };

  const title = active === "note" && !planTarget
    ? "Note & plan"
    : renderActive === "tetany"
      ? "Tetany episode"
      : renderActive === "panic"
        ? "Panic attack"
        : orderedCats.find((c) => c.id === active)?.label ?? CATEGORIES.find((c) => c.id === renderActive)?.label ?? "";

  return (
    <Sheet open={open} onOpenChange={(b) => { if (!b) close(); }}>
      <SheetContent
        side="bottom"
        className={(active
          ? `flex h-[100dvh] max-h-[100dvh] flex-col rounded-t-none bg-background p-0 ${renderActive === "pain" ? "pt-[env(safe-area-inset-top)]" : "pt-0"}`
          : "fixed !inset-0 !left-0 !right-0 !top-0 !bottom-0 flex !h-[100dvh] !max-h-none !w-full !max-w-none min-h-0 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0 !shadow-none") + " [&>button.absolute]:hidden"}
      >
        {!active ? (
          <>
            <SheetTitle className="sr-only">{t("Log")}</SheetTitle>
            <button type="button" aria-label={t("Close log menu")} onClick={close} className="absolute inset-0 z-0 cursor-default bg-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] bg-[#596330]/45 backdrop-blur-[2px]" />
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              <div className="absolute left-1/2 h-[430px] w-[390px] max-w-[100vw] -translate-x-1/2" style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 22px)" }}>
                {(() => {
                  const radialCats = orderedCats;
                  const count = Math.max(1, radialCats.length);
                  const centerUp = 205;
                  const radiusX = 112;
                  const radiusY = 145;
                  const categoryButtonSize = 54;
                  const categoryCircleSize = 48;
                  const slots = radialCats.map((_, index) => {
                    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const x = Math.round(radiusX * cos);
                    const up = Math.round(centerUp - radiusY * sin);
                    const labelSide = sin < -0.58 ? "top" as const : sin > 0.58 ? "bottom" as const : cos >= 0 ? "right" as const : "left" as const;
                    return { x, up, labelSide };
                  });
                  return <>
                    <svg aria-hidden="true" viewBox="-195 -430 390 430" className="pointer-events-none absolute bottom-0 left-1/2 h-[430px] w-[390px] max-w-[100vw] -translate-x-1/2 overflow-visible">
                      <ellipse cx="0" cy={-centerUp} rx="88" ry="88" fill="none" stroke="rgba(241,244,220,0.20)" strokeWidth="1" strokeDasharray="3 5" />
                      {slots.map((slot, index) => {
                        const dx = slot.x;
                        const dy = -(slot.up - centerUp);
                        const len = Math.hypot(dx, dy) || 1;
                        const ux = dx / len;
                        const uy = dy / len;
                        const x1 = ux * 44;
                        const y1 = -centerUp + uy * 44;
                        const x2 = dx - ux * (categoryCircleSize / 2 + 5);
                        const y2 = -centerUp + dy - uy * (categoryCircleSize / 2 + 5);
                        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(241,244,220,0.52)" strokeWidth="1" strokeDasharray="3 5" />;
                      })}
                    </svg>
                    {radialCats.map((c, index) => {
                      const slot = slots[index];
                      if (!slot) return null;
                      const side = slot.labelSide;
                      return <button
                        key={c.id}
                        type="button"
                        data-log-category={c.id}
                        onPointerDown={(e) => startDirectReorder(e, c.id)}
                        onPointerMove={moveDirectReorder}
                        onPointerUp={endDirectReorder}
                        onPointerCancel={endDirectReorder}
                        onClick={(e) => {
                          if (editingOrder) { e.preventDefault(); e.stopPropagation(); return; }
                          setCat(c.id);
                          setPlanTarget(null);
                        }}
                        aria-label={editingOrder ? `Drag ${c.label} to reorder` : `Log ${c.label}`}
                        className={`pointer-events-auto absolute z-20 touch-none select-none outline-none transition-[filter,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-[#edf2cf] ${editingOrder ? "cursor-grab active:cursor-grabbing" : ""} ${draggingCat === c.id ? "z-50 brightness-110 drop-shadow-[0_0_10px_rgba(238,243,207,0.8)]" : ""}`}
                        style={{ width: `${categoryButtonSize}px`, height: `${categoryButtonSize}px`, left: "50%", bottom: 0, transform: `translate(calc(-50% + ${slot.x}px), -${slot.up - categoryButtonSize / 2}px)` }}
                      >
                        <span className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#edf2cf]/65 bg-[#dce5b2]/38 shadow-[0_6px_16px_rgba(20,28,9,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] ring-[3px] ring-[#e8edc5]/38 backdrop-blur-[7px]" style={{ width: `${categoryCircleSize}px`, height: `${categoryCircleSize}px` }}><Ico e={c.emoji} size={26} /></span>
                        <span className="absolute z-30 w-[68px] whitespace-normal text-[10px] font-semibold leading-[1.08] text-white drop-shadow-[0_1px_2px_rgba(31,37,16,0.95)]" style={side === "left" ? { right: "calc(100% + 3px)", top: "50%", transform: "translateY(-50%)", textAlign: "right" } : side === "right" ? { left: "calc(100% + 3px)", top: "50%", transform: "translateY(-50%)", textAlign: "left" } : side === "bottom" ? { left: "50%", top: "calc(100% + 5px)", transform: "translateX(-50%)", textAlign: "center" } : { left: "50%", bottom: "calc(100% + 5px)", transform: "translateX(-50%)", textAlign: "center" }}>{t(c.label)}</span>
                      </button>;
                    })}
                    <button type="button" onClick={close} aria-label={t("Close Log")} className="pointer-events-auto absolute left-1/2 z-40 grid h-[76px] w-[76px] -translate-x-1/2 place-items-center rounded-full border border-[#f1f4dc]/80 bg-[#657632] text-white shadow-[0_0_0_7px_rgba(231,238,190,0.44),0_0_24px_rgba(232,238,190,0.48),0_10px_26px_rgba(20,28,9,0.36)] ring-2 ring-[#dfe7b4]/70 transition-transform duration-150 active:scale-95" style={{ bottom: `${centerUp - 38}px` }}><Plus className="h-9 w-9" strokeWidth={2.15} /></button>
                  </>;
                })()}
              </div>
              <button type="button" onClick={() => { endDirectReorder(); setEditingOrder((v) => !v); }} aria-label={editingOrder ? "Finish reordering log categories" : "Reorder log categories"} className="pointer-events-auto absolute bottom-[calc(max(12px,env(safe-area-inset-bottom))+14px)] right-4 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#edf2cf]/65 bg-[#dce5b2]/38 shadow-[0_6px_16px_rgba(20,28,9,0.28)] ring-[3px] ring-[#e8edc5]/38 backdrop-blur-[7px] transition active:scale-95">{editingOrder ? <Check className="h-6 w-6 text-white" strokeWidth={2.6} /> : <span className="grid grid-cols-2 gap-[3px]" aria-hidden="true">{Array.from({ length: 6 }).map((_, i) => <span key={i} className="h-[5px] w-[5px] rounded-full bg-white/90" />)}</span>}</button>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className={`shrink-0 flex-row items-end justify-between gap-0 border-b border-border px-5 pb-2 ${renderActive === "pain" ? "h-14 pt-0" : "h-[calc(40px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]"}`}>
              <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5" /> {t("Back to Log")}</button>
              <SheetTitle className="font-serif text-lg">{t(title)}</SheetTitle>
              <button onClick={close} aria-label={t("Close")} className="rounded-full p-1 hover:bg-tint"><X className="h-5 w-5" /></button>
            </SheetHeader>
            <LogSchemaContext.Provider value={activeRegistryFeature ? {
              data,
              featureId: activeRegistryFeature,
              adminFields: activeAdminFields,
              adminFieldValues,
              setAdminFieldValue: (fieldId, value) => setAdminFieldValues((current) => ({ ...current, [fieldId]: value })),
              saveAdminCustomFields,
              sourceEntryId: activeSourceEntryId,
            } : null}>
              <div key={`${renderActive}-${openToken}-${(edit as { id?: string } | undefined)?.id ?? initialPain?.id ?? "new"}`} className={`min-h-0 flex-1 overflow-y-auto ${renderActive === "pain" ? "pt-[60px]" : "px-5 pb-4"}`}>
                {active?.startsWith("custom:") && (() => {
                  const id = active.slice("custom:".length);
                  const definition = customLogDefinitions(data).find((item) => item.id === id);
                  if (!definition) return null;
                  const savedEntries = data.dayLogs[date]?.customLogs?.[id] ?? [];
                  const initialCustomEntry = customEditEntry === null ? undefined : customEditEntry ?? (edit as CustomLogEntry | undefined);
                  return <div className="space-y-4">
                    {savedEntries.length ? <section className="rounded-2xl bg-tint p-3 ring-1 ring-border/70">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold">{t("Saved entries")}</p><p className="text-[10px] text-muted-foreground">{t("Tap an entry to edit it without creating a duplicate.")}</p></div>{initialCustomEntry ? <button type="button" onClick={() => setCustomEditEntry(null)} className="rounded-full bg-background px-3 py-1 text-[10px] font-semibold ring-1 ring-border">{t("New entry")}</button> : null}</div>
                      <div className="mt-2 flex flex-wrap gap-2">{savedEntries.map((entry, index) => <div key={entry.id} className="inline-flex items-center gap-1"><button type="button" onClick={() => setCustomEditEntry(entry)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border ${initialCustomEntry?.id === entry.id ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}><Pencil className="h-3 w-3" />{entry.time || `${t("Entry")} ${index + 1}`}</button><button type="button" aria-label={t("Delete")} onClick={() => { if (!window.confirm(t("Delete this saved entry? Other entries and the selected day will stay unchanged."))) return; update((current) => { const day = current.dayLogs[date]; if (!day) return current; const customLogs = { ...(day.customLogs ?? {}) }; const nextEntries = (customLogs[id] ?? []).filter((saved) => saved.id !== entry.id); if (nextEntries.length) customLogs[id] = nextEntries; else delete customLogs[id]; return { ...current, dayLogs: { ...current.dayLogs, [date]: { ...day, customLogs } } }; }); if (initialCustomEntry?.id === entry.id) setCustomEditEntry(null); }} className="grid h-7 w-7 place-items-center rounded-full bg-background text-destructive ring-1 ring-border"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
                    </section> : null}
                    <CustomLogForm key={`${definition.id}:${initialCustomEntry?.id ?? "new"}`} definition={definition} date={date} data={data} update={update} onDone={close} initialEntry={initialCustomEntry} />
                  </div>;
                })()}

                {active === "note" && !planTarget && <PlanChooser onPick={setPlanTarget} />}
                {renderActive === "postpartum" && <PostpartumSymptomsForm date={date} data={data} update={update} onDone={close} />}
                {renderActive === "pain" && <PainWizard date={date} data={data} update={update} onDone={close} initialEntry={initialPain ?? (edit as PainEntry | undefined)} />}
                {renderActive === "panic" && <PanicForm date={date} data={data} update={update} onDone={close} initialEntry={edit as PanicAttack | undefined} />}
                {renderActive === "tetany" && <TetanyForm date={date} data={data} update={update} onDone={close} initialEntry={edit as TetanyEpisode | undefined} />}
                {renderActive === "period" && <PeriodForm date={date} data={data} update={update} onDone={close} />}
                {renderActive === "sex" && <EnhancedSexForm date={date} data={data} update={update} onDone={close} initialEntry={edit as SexEntry | undefined} />}
                {renderActive === "heat" && <EnhancedThermoForm date={date} update={update} onDone={close} initialEntry={edit as ThermoSession | undefined} />}
                {renderActive === "food" && <EnhancedFoodForm date={date} data={data} update={update} onDone={close} initialEntry={edit as FoodEntry | undefined} />}
                {renderActive === "bowel" && <EnhancedBowelForm date={date} data={data} update={update} onDone={close} initialEntry={edit as BowelEntry | undefined} />}
                {renderActive === "workout" && <EnhancedWorkoutForm date={date} data={data} update={update} onDone={close} initialEntry={edit as WorkoutEntry | undefined} />}
                {renderActive === "temp" && <EnhancedTempForm date={date} data={data} update={update} onDone={close} />}
                {renderActive === "meds" && <MedsForm date={date} data={data} update={update} onDone={close} />}
                {renderActive === "task" && <TaskForm date={date} update={update} onDone={close} initialEntry={edit as TaskEntry | undefined} />}
                {renderActive === "event" && <EventForm date={date} update={update} onDone={close} initialEntry={edit as EventEntry | undefined} />}
                {renderActive === "note" && planTarget === "note" && <NoteForm date={date} update={update} onDone={close} />}

                {activeAdminFields.length > 0 && renderActive !== "pain" && !active?.startsWith("custom:") && !(active === "note" && !planTarget) ? (
                  <div className="mt-4 rounded-2xl border border-border p-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("Custom fields")}</p>
                    <div className="space-y-3">{activeAdminFields.map((field) => <CoreFeatureCustomFieldInput key={field.id} field={field} value={adminFieldValues[field.id]} onChange={(value) => setAdminFieldValues((current) => ({ ...current, [field.id]: value }))} />)}</div>
                  </div>
                ) : null}
              </div>
            </LogSchemaContext.Provider>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PlanChooser({ onPick }: { onPick: (target: Exclude<PlanTarget, null>) => void }) {
  const { t } = useI18n();
  const options = [
    { id: "event" as const, icon: "📅", title: "Event", hint: "Date · time · reminder" },
    { id: "task" as const, icon: "✅", title: "To do", hint: "Task · date · priority" },
    { id: "note" as const, icon: "📝", title: "Note", hint: "Quick note for this day" },
  ];
  return <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-5">
    <div className="px-1 pb-2 text-center"><h2 className="font-serif text-xl font-semibold">{t("Note & plan")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("What would you like to add?")}</p></div>
    {options.map((option) => <button key={option.id} type="button" onClick={() => onPick(option.id)} className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left shadow-sm transition active:scale-[0.99]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10"><Ico e={option.icon} size={26} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(option.title)}</span><span className="mt-0.5 block text-xs text-muted-foreground">{t(option.hint)}</span></span><span className="text-lg text-muted-foreground" aria-hidden="true">→</span></button>)}
  </div>;
}
