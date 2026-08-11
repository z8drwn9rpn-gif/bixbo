import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "@/hooks/useI18n";
import { getRegistryFeature, type AdminPageBlock } from "@/lib/appRegistry";
import { getEffectiveAdminConfig } from "@/lib/effectiveAdminConfig";
import { DEVICE_ADMIN_CONFIG_CHANGED, getDeviceAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";
import { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { EMPTY, useBixbo } from "@/lib/storage";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";
import { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";

const STORAGE_KEY = "bixbo-hak-admin-layout-v1";

type HakItemId =
  | "overviewTitle"
  | "cycleTitle"
  | "cycleSubtitle"
  | "currentPack"
  | "menstruation"
  | "cycle"
  | "takingHak"
  | "protection"
  | "sex";

type HakItemOverride = { label?: string; hidden?: boolean };
type HakConfig = Partial<Record<HakItemId, HakItemOverride>>;

type HakDefinition = {
  id: HakItemId;
  original: string;
  defaultLabel: string;
  kind: "text" | "section";
};

const BASE_DEFINITIONS: HakDefinition[] = [
  { id: "overviewTitle", original: "Birth control overview", defaultLabel: "Birth control overview", kind: "text" },
  { id: "cycleTitle", original: "Blueberry cycle", defaultLabel: "Blueberry cycle", kind: "text" },
  { id: "cycleSubtitle", original: "Birth control overview", defaultLabel: "Birth control overview", kind: "text" },
  { id: "currentPack", original: "Current HAK pack", defaultLabel: "Current HAK pack", kind: "section" },
  { id: "menstruation", original: "Menstruation", defaultLabel: "Menstruation", kind: "text" },
  { id: "cycle", original: "Cycle", defaultLabel: "Cycle", kind: "text" },
  { id: "takingHak", original: "Taking HAK", defaultLabel: "Taking HAK", kind: "text" },
  { id: "protection", original: "Protection", defaultLabel: "Protection", kind: "text" },
  { id: "sex", original: "ŠukŠuk!", defaultLabel: "ŠukŠuk!", kind: "section" },
];

function readLegacyConfig(): HakConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HakConfig) : {};
  } catch {
    return {};
  }
}

function readConfig(): HakConfig {
  const hak = getEffectiveAdminConfig().hak;
  if (hak?.items) return hak.items as HakConfig;
  return readLegacyConfig();
}

function writeConfig(config: HakConfig) {
  const current = getDeviceAdminConfig();
  setDeviceAdminConfig({
    ...current,
    enabled: true,
    hak: { ...(current.hak ?? {}), items: config },
  });
}

function findHakRoot(): HTMLElement | null {
  const marked = document.querySelector<HTMLElement>("[data-bixbo-hak-root]");
  if (marked) return marked;

  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1"));
  const heading = headings.find((element) => element.textContent?.trim() === "Birth control overview");
  if (!heading) return null;

  const root = heading.closest<HTMLElement>(".fixed.inset-0") ?? heading.parentElement?.parentElement?.parentElement ?? null;
  if (root) root.dataset.bixboHakRoot = "1";
  return root;
}

function findDefinitionElement(root: HTMLElement, definition: HakDefinition): HTMLElement | null {
  const selector =
    definition.id === "overviewTitle"
      ? "h1"
      : definition.id === "cycleTitle" || definition.id === "sex"
        ? "h2"
        : definition.id === "currentPack"
          ? "h3"
          : "p";
  return (
    Array.from(root.querySelectorAll<HTMLElement>(selector)).find(
      (element) =>
        !element.closest("[data-bixbo-hak-admin-ui]") &&
        element.children.length === 0 &&
        element.textContent?.trim() === definition.original,
    ) ?? null
  );
}

function restoreRuntime(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-bixbo-hak-original-text]").forEach((element) => {
    element.textContent = element.dataset.bixboHakOriginalText ?? element.textContent;
    delete element.dataset.bixboHakOriginalText;
  });
  root.querySelectorAll<HTMLElement>("[data-bixbo-hak-original-display]").forEach((element) => {
    element.style.display = element.dataset.bixboHakOriginalDisplay ?? "";
    delete element.dataset.bixboHakOriginalDisplay;
  });
}

function sectionContainer(element: HTMLElement, id: HakItemId): HTMLElement {
  if (id === "sex") return element.closest<HTMLElement>("section") ?? element;
  if (id === "currentPack") return element.parentElement ?? element;
  return element;
}

export function HakAdminEditOverlay() {
  const { t } = useI18n();
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const sexRegistryLabel = getRegistryFeature(view, "sex").label;
  const [hakOpen, setHakOpen] = useState(false);
  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());
  const [editorOpen, setEditorOpen] = useState(false);
  const [config, setConfig] = useState<HakConfig>(() => readConfig());
  const [revision, setRevision] = useState(0);
  const [portalRevision, setPortalRevision] = useState(0);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  const definitions = useMemo(
    () => BASE_DEFINITIONS.map((item) => (item.id === "sex" ? { ...item, defaultLabel: sexRegistryLabel } : item)),
    [sexRegistryLabel],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const detect = () => setHakOpen(!!findHakRoot());
    detect();
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());
    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);
    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);
  }, []);

  useEffect(() => {
    const openHakEditor = () => {
      if (adminMode && hakOpen) setEditorOpen(true);
    };
    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openHakEditor);
    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openHakEditor);
  }, [adminMode, hakOpen]);

  useEffect(() => {
    if (!adminMode) setEditorOpen(false);
  }, [adminMode]);

  useEffect(() => {
    const refresh = () => {
      setConfig(readConfig());
      setRevision((value) => value + 1);
      setPortalRevision((value) => value + 1);
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
    window.addEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
      window.removeEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    };
  }, []);

  useEffect(() => {
    if (!hakOpen) {
      setEditorOpen(false);
      return;
    }

    let disposed = false;
    let scheduled = false;

    const apply = () => {
      scheduled = false;
      if (disposed) return;
      const root = findHakRoot();
      if (!root) return;
      restoreRuntime(root);

      definitions.forEach((definition) => {
        const element = findDefinitionElement(root, definition);
        if (!element) return;

        const override = config[definition.id] ?? {};
        const effectiveLabel = override.label?.trim() || definition.defaultLabel;
        if (effectiveLabel !== definition.original) {
          element.dataset.bixboHakOriginalText = definition.original;
          element.textContent = effectiveLabel;
        }

        if (override.hidden) {
          const target = definition.kind === "section" ? sectionContainer(element, definition.id) : element;
          target.dataset.bixboHakOriginalDisplay = target.style.display;
          target.style.display = "none";
        }
      });
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(apply);
    };

    apply();
    const root = findHakRoot();
    const observer = new MutationObserver(schedule);
    if (root) observer.observe(root, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      const currentRoot = findHakRoot();
      if (currentRoot) restoreRuntime(currentRoot);
    };
  }, [config, definitions, hakOpen, revision]);

  const effectiveHakBlocks = useMemo(
    () => [...(getEffectiveAdminConfig().hak?.blocks ?? [])].sort((a, b) => a.order - b.order),
    [revision, portalRevision],
  );

  const writeBlocks = (blocks: Array<AdminPageBlock & { placement?: "top" | "bottom" }>) => {
    const current = getDeviceAdminConfig();
    setDeviceAdminConfig({
      ...current,
      enabled: true,
      hak: {
        ...(current.hak ?? {}),
        blocks: [...blocks].map((block, index) => ({ ...block, order: (index + 1) * 10 })),
      },
    });
    setPortalRevision((value) => value + 1);
  };

  const editableBlocks = () => {
    const local = getDeviceAdminConfig().hak?.blocks;
    return [...(local ?? effectiveHakBlocks)].sort((a, b) => a.order - b.order);
  };

  const addBlock = () => {
    const blocks = editableBlocks();
    writeBlocks([
      ...blocks,
      {
        id: `hak_block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        title: t("New section"),
        body: "",
        order: (blocks.at(-1)?.order ?? 0) + 10,
        placement: "bottom",
      },
    ]);
  };

  const patchBlock = (blockId: string, next: Partial<AdminPageBlock & { placement?: "top" | "bottom" }>) => {
    writeBlocks(editableBlocks().map((block) => block.id === blockId ? { ...block, ...next, id: block.id } : block));
  };

  const deleteBlock = (blockId: string) => writeBlocks(editableBlocks().filter((block) => block.id !== blockId));

  const moveBlock = (blockId: string, delta: -1 | 1) => {
    const blocks = editableBlocks();
    const from = blocks.findIndex((block) => block.id === blockId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= blocks.length) return;
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    writeBlocks(blocks);
  };

  const dropBlock = (targetId: string) => {
    if (!draggedBlock || draggedBlock === targetId) return;
    const blocks = editableBlocks();
    const from = blocks.findIndex((block) => block.id === draggedBlock);
    const to = blocks.findIndex((block) => block.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    writeBlocks(blocks);
  };

  const moveDraggedBlockByPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (!draggedBlock) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-hak-block-sort-id]");
    const targetId = target?.dataset.hakBlockSortId;
    if (targetId && targetId !== draggedBlock) dropBlock(targetId);
  };

  const patch = (id: HakItemId, next: HakItemOverride) => {
    const updated = { ...config, [id]: { ...(config[id] ?? {}), ...next } };
    setConfig(updated);
    writeConfig(updated);
    setRevision((value) => value + 1);
  };

  const reset = (id: HakItemId) => {
    const updated = { ...config };
    delete updated[id];
    setConfig(updated);
    writeConfig(updated);
    setRevision((value) => value + 1);
  };

  if (!hakOpen || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  const hakContent = document.querySelector<HTMLElement>("[data-bixbo-hak-content]");
  const hakTop = document.querySelector<HTMLElement>("[data-bixbo-hak-custom-top]");
  const visibleBlocks = effectiveHakBlocks.filter((block) => block.hidden !== true);
  const renderBlocks = (placement: "top" | "bottom") => (
    <div data-bixbo-hak-custom-sections className="space-y-3 px-1 py-3">
      {visibleBlocks.filter((block) => (block.placement ?? "bottom") === placement).map((block) => (
        <section key={block.id} className="rounded-[1.75rem] bg-surface p-4 ring-1 ring-border/80">
          <h2 className="font-serif text-lg font-semibold text-foreground">{block.title}</h2>
          {block.body.trim() ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{block.body}</p> : null}
        </section>
      ))}
    </div>
  );

  return (
    <>
      {hakTop ? createPortal(renderBlocks("top"), hakTop) : null}
      {hakContent ? createPortal(renderBlocks("bottom"), hakContent) : null}
      <div data-bixbo-hak-admin-ui data-bixbo-admin-ui className="fixed right-4 top-[max(4.1rem,calc(env(safe-area-inset-top)+3.1rem))] z-[9980]">
        <button
          type="button"
          data-bixbo-admin-page-opener
          onClick={() => setEditorOpen((value) => !value)}
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg ring-1 ring-primary/30"
        >
          {editorOpen ? t("Done") : `✦ ${t("Edit")}`}
        </button>
      </div>

      {editorOpen ? (
        <div data-bixbo-hak-admin-ui data-bixbo-admin-ui className="fixed inset-0 z-[9970] bg-black/25" onClick={() => setEditorOpen(false)}>
          <aside
            className="absolute inset-x-0 bottom-0 max-h-[72dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:left-auto lg:right-4 lg:top-4 lg:w-[430px] lg:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold">HAK · {t("Admin edit mode")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename, hide or add HAK sections without changing pill calculations or saved health data.")}</p>
                </div>
                <button type="button" onClick={addBlock} className="rounded-full bg-primary px-3 py-2 text-[10px] font-bold text-primary-foreground">+ {t("Add section")}</button>
              </div>
            </div>

            <div className="space-y-2 px-4 py-4">
              {effectiveHakBlocks.length ? (
                <div className="mb-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("Custom sections")}</p>
                  {effectiveHakBlocks.map((block, blockIndex) => (
                    <section key={block.id} data-hak-block-sort-id={block.id} className={`rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/15 ${draggedBlock === block.id ? "opacity-60" : ""}`}>
                      <input value={block.title} onChange={(event) => patchBlock(block.id, { title: event.target.value })} className="h-9 w-full rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
                      <textarea value={block.body} onChange={(event) => patchBlock(block.id, { body: event.target.value })} rows={2} placeholder={t("Text…")} className="mt-2 w-full resize-y rounded-xl bg-tint px-3 py-2 text-xs ring-1 ring-border" />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={blockIndex === 0} onClick={() => moveBlock(block.id, -1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] ring-1 ring-border disabled:opacity-25">↑</button>
                        <button type="button" disabled={blockIndex === effectiveHakBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] ring-1 ring-border disabled:opacity-25">↓</button>
                        <button
                          type="button"
                          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedBlock(block.id); }}
                          onPointerMove={moveDraggedBlockByPointer}
                          onPointerUp={() => setDraggedBlock(null)}
                          onPointerCancel={() => setDraggedBlock(null)}
                          style={{ touchAction: "none" }}
                          className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing"
                          aria-label={t("Drag to reorder")}
                        ><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                        <select value={block.placement ?? "bottom"} onChange={(event) => patchBlock(block.id, { placement: event.target.value as "top" | "bottom" })} className="h-7 rounded-full bg-tint px-2 text-[9px] ring-1 ring-border">
                          <option value="top">{t("Top")}</option>
                          <option value="bottom">{t("Bottom")}</option>
                        </select>
                        <button type="button" onClick={() => patchBlock(block.id, { hidden: block.hidden !== true })} className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${block.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{block.hidden ? t("Hidden") : t("Shown")}</button>
                        <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">{block.id}</span>
                        <button type="button" onClick={() => deleteBlock(block.id)} className="rounded-full px-2.5 py-1 text-[9px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}

              {definitions.map((definition) => {
                const override = config[definition.id] ?? {};
                const label = override.label ?? definition.defaultLabel;
                const hidden = override.hidden === true;
                const hasLocalOverride = Boolean(getDeviceAdminConfig().hak?.items?.[definition.id]);
                return (
                  <section key={definition.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">
                    <div className="flex items-center gap-2">
                      <input
                        value={label}
                        onChange={(event) => patch(definition.id, { label: event.target.value })}
                        className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border"
                      />
                      <button
                        type="button"
                        onClick={() => patch(definition.id, { hidden: !hidden })}
                        className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}
                      >
                        {hidden ? t("Hidden") : t("Shown")}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-muted-foreground">{definition.id}</span>
                      {hasLocalOverride ? <button type="button" onClick={() => reset(definition.id)} className="text-[9px] font-semibold text-primary">{t("Reset")}</button> : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
