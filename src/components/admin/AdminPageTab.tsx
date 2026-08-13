import type { PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "@/hooks/useI18n";
import {
  getEffectiveLayoutSectionLabel,
  isEffectiveLayoutSectionVisible,
  layoutSectionOverridesFromConfig,
  withoutPageLayoutOverrides,
} from "@/lib/adminLayoutOverrides";
import type { AdminConfig } from "@/lib/appRegistry";
import type { LayoutPageId } from "@/lib/layoutRegistry";

type SectionDefinition = { id: string; label: string; order: number };

export function AdminPageTab({
  page,
  sections,
  localConfig,
  draggedSection,
  onPatchSection,
  onMoveSection,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResetSection,
  onPersist,
}: {
  page: LayoutPageId;
  sections: SectionDefinition[];
  localConfig: AdminConfig;
  draggedSection: string | null;
  onPatchSection: (sectionId: string, patch: { label?: string; hidden?: boolean }) => void;
  onMoveSection: (sectionId: string, delta: number) => void;
  onDragStart: (sectionId: string) => void;
  onDragMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onResetSection: (sectionId: string) => void;
  onPersist: (config: AdminConfig) => void;
}) {
  const { t } = useI18n();
  return <>
    <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
      <p className="text-sm font-bold">{t("Current page layout")}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename, hide or reorder whole sections. Stable section IDs never change.")}</p>
    </section>
    {sections.map((section, index) => {
      const label = getEffectiveLayoutSectionLabel(page, section.id);
      const visible = isEffectiveLayoutSectionVisible(page, section.id);
      const localOverride = layoutSectionOverridesFromConfig(localConfig)[page]?.[section.id];
      return <section key={section.id} data-admin-section-sort-id={section.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedSection === section.id ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-[10px] font-bold text-muted-foreground">{index + 1}</span>
          <input value={label} onChange={(event) => onPatchSection(section.id, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
          <button type="button" onClick={() => onPatchSection(section.id, { hidden: visible })} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${visible ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>{visible ? t("Shown") : t("Hidden")}</button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <button type="button" disabled={index === 0} onClick={() => onMoveSection(section.id, -1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↑</button>
          <button type="button" disabled={index === sections.length - 1} onClick={() => onMoveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>
          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onDragStart(section.id); }} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
          <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>
          {localOverride ? <button type="button" onClick={() => onResetSection(section.id)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}
        </div>
      </section>;
    })}
    <button type="button" onClick={() => onPersist(withoutPageLayoutOverrides(localConfig, page))} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Reset current page customizations")}</button>
  </>;
}
