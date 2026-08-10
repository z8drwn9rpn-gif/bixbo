import { useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { BIXBO_LAYOUT_SECTIONS, orderedLayoutSections, type LayoutPageId } from "@/lib/layoutRegistry";
import type { BixboData } from "@/lib/storage";

type UpdateFn = (u: (d: BixboData) => BixboData) => void;

const PAGE_LABELS: Record<LayoutPageId, string> = {
  home: "Overview / Home",
  insights: "Insights",
  "patterns.cycle": "Patterns · Cycle",
  "patterns.monthly": "Patterns · Monthly",
  "patterns.treatment": "Patterns · Treatment",
  "patterns.triggers": "Patterns · Triggers",
  "couple.overview": "Couple · Overview",
  "couple.compare": "Couple · Compare",
  "couple.health": "Couple · Health",
};

export function LayoutOrderEditor({ data, update }: { data: BixboData; update: UpdateFn }) {
  const { t } = useI18n();
  const [page, setPage] = useState<LayoutPageId>("home");
  const [dragged, setDragged] = useState<string | null>(null);
  const sections = useMemo(() => orderedLayoutSections(data, page), [data, page]);

  const writeOrder = (ids: string[]) => update((current) => ({
    ...current,
    settings: {
      ...current.settings,
      adminConfig: {
        ...(current.settings.adminConfig ?? {}),
        enabled: true,
        layoutOrder: { ...(current.settings.adminConfig?.layoutOrder ?? {}), [page]: ids },
      },
    },
  }));



  const drop = (targetId: string) => {
    if (!dragged || dragged === targetId) return;
    const ids = sections.map((section) => section.id);
    const from = ids.indexOf(dragged);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeOrder(ids);
  };

  const moveDraggedByPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragged) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-layout-sort-id]");
    const targetId = target?.dataset.layoutSortId;
    if (targetId && targetId !== dragged) drop(targetId);
  };

  const reset = () => update((current) => {
    const layoutOrder = { ...(current.settings.adminConfig?.layoutOrder ?? {}) };
    delete layoutOrder[page];
    return { ...current, settings: { ...current.settings, adminConfig: { ...(current.settings.adminConfig ?? {}), layoutOrder } } };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
        <p className="font-serif text-lg font-bold">{t("Layout & order")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Reorder whole sections without changing their data or source code.")}</p>
      </section>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.keys(PAGE_LABELS) as LayoutPageId[]).map((id) => (
          <button key={id} type="button" onClick={() => setPage(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${page === id ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>
            {t(PAGE_LABELS[id])}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div key={section.id} data-layout-sort-id={section.id} draggable onDragStart={() => setDragged(section.id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { drop(section.id); setDragged(null); }} className={`flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-border/80 lg:cursor-grab ${dragged === section.id ? "opacity-60" : ""}`}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-xs font-bold text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t(section.label)}</p><p className="text-[9px] text-muted-foreground">ID: {section.id}</p></div>
            <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragged(section.id); }} onPointerMove={moveDraggedByPointer} onPointerUp={() => setDragged(null)} onPointerCancel={() => setDragged(null)} style={{ touchAction: "none" }} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-tint px-3 text-[11px] font-semibold text-muted-foreground cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-base">⋮⋮</span>{t("Drag")}</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={reset} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Reset this page order")}</button>
    </div>
  );
}
