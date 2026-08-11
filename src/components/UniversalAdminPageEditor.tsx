import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouterState } from "@tanstack/react-router";

import { useI18n } from "@/hooks/useI18n";
import type { AdminConfig } from "@/lib/appRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import {
  DEVICE_ADMIN_CONFIG_CHANGED,
  getDeviceAdminConfig,
  setDeviceAdminConfig,
} from "@/lib/deviceAdminConfig";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";
import { ADMIN_CUSTOMIZE_REQUESTED } from "@/lib/adminCustomizeEvents";
import { getEffectiveAdminConfig } from "@/lib/effectiveAdminConfig";

type UniversalBlockOverride = {
  label?: string;
  hidden?: boolean;
  order?: number;
};

type UniversalPageConfig = {
  blocks?: Record<string, UniversalBlockOverride>;
};

type ExtendedAdminConfig = AdminConfig & {
  universalPages?: Record<string, UniversalPageConfig>;
};

type BlockSnapshot = {
  key: string;
  label: string;
  originalLabel: string;
  hidden: boolean;
  order: number;
  canRename: boolean;
};

const SPECIALIZED_PATHS = ["/insights", "/patterns", "/couple", "/admin"];

function isSpecializedPath(pathname: string) {
  return pathname === "/" || SPECIALIZED_PATHS.some((path) => pathname.startsWith(path));
}

function isBrandLabel(value: string) {
  return /^BIXBO(?:\s|$|—|-)/i.test(value.trim());
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "section";
}

function pageRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector<HTMLElement>("main") ??
    document.querySelector<HTMLElement>('[role="main"]') ??
    document.querySelector<HTMLElement>("#root") ??
    document.body
  );
}

function labelElement(block: HTMLElement): HTMLElement | null {
  const candidates = Array.from(
    block.querySelectorAll<HTMLElement>("h1,h2,h3,h4,[data-admin-label]"),
  ).filter((element) => !element.closest("[data-bixbo-admin-ui]") && element.children.length === 0);
  return candidates.find((element) => Boolean(element.textContent?.trim())) ?? null;
}

function discoverBlocks(pathname: string): HTMLElement[] {
  const root = pageRoot();
  if (!root) return [];

  const sections = Array.from(root.querySelectorAll<HTMLElement>("section")).filter((section) => {
    if (section.closest("[data-bixbo-admin-ui]")) return false;
    const parentSection = section.parentElement?.closest("section");
    return !parentSection || !root.contains(parentSection);
  });

  const candidates = sections.length
    ? sections
    : Array.from(root.children).filter((element): element is HTMLElement => element instanceof HTMLElement);

  const usable = candidates.filter((element) => {
    if (element.closest("[data-bixbo-admin-ui]")) return false;
    if (element.matches("nav,header,footer,script,style")) return false;
    const label = labelElement(element)?.textContent?.trim() ?? "";
    return !isBrandLabel(label);
  });

  const parentCounts = new Map<HTMLElement, number>();
  usable.forEach((element) => {
    const parent = element.parentElement;
    if (!parent) return;
    const index = parentCounts.get(parent) ?? 0;
    parentCounts.set(parent, index + 1);

    if (!element.dataset.bixboUniversalKey) {
      const originalLabel = labelElement(element)?.textContent?.trim() ?? `Section ${index + 1}`;
      element.dataset.bixboUniversalKey = `${pathname}:${index}:${slug(originalLabel)}`;
      element.dataset.bixboUniversalOriginalOrder = String(index);
      element.dataset.bixboUniversalOriginalLabel = originalLabel;
    }
  });

  return usable;
}

function readExtendedConfig(): ExtendedAdminConfig {
  return getDeviceAdminConfig() as ExtendedAdminConfig;
}

function writeExtendedConfig(config: ExtendedAdminConfig) {
  setDeviceAdminConfig(config as AdminConfig);
}

function pageConfig(pathname: string): UniversalPageConfig {
  return (getEffectiveAdminConfig() as ExtendedAdminConfig).universalPages?.[pathname] ?? {};
}

function localPageConfig(pathname: string): UniversalPageConfig {
  return readExtendedConfig().universalPages?.[pathname] ?? {};
}

function applyPageConfig(pathname: string) {
  const blocks = discoverBlocks(pathname);
  const config = pageConfig(pathname);
  const overrides = config.blocks ?? {};

  const byParent = new Map<HTMLElement, HTMLElement[]>();
  blocks.forEach((block) => {
    const parent = block.parentElement;
    if (!parent) return;
    const list = byParent.get(parent) ?? [];
    list.push(block);
    byParent.set(parent, list);
  });

  byParent.forEach((siblings, parent) => {
    const sorted = [...siblings].sort((a, b) => {
      const aKey = a.dataset.bixboUniversalKey ?? "";
      const bKey = b.dataset.bixboUniversalKey ?? "";
      const aFallback = Number(a.dataset.bixboUniversalOriginalOrder ?? 9999);
      const bFallback = Number(b.dataset.bixboUniversalOriginalOrder ?? 9999);
      return (overrides[aKey]?.order ?? aFallback) - (overrides[bKey]?.order ?? bFallback);
    });
    sorted.forEach((block) => parent.appendChild(block));
  });

  blocks.forEach((block) => {
    const key = block.dataset.bixboUniversalKey ?? "";
    const override = overrides[key];
    const heading = labelElement(block);
    const originalLabel = block.dataset.bixboUniversalOriginalLabel ?? heading?.textContent?.trim() ?? "";

    if (heading && !isBrandLabel(originalLabel)) {
      if (heading.dataset.bixboUniversalAppliedLabel === "1") {
        heading.textContent = originalLabel;
        delete heading.dataset.bixboUniversalAppliedLabel;
      }
      if (override?.label?.trim()) {
        heading.textContent = override.label.trim();
        heading.dataset.bixboUniversalAppliedLabel = "1";
      }
    }

    block.style.display = override?.hidden ? "none" : "";
  });
}

function snapshots(pathname: string): BlockSnapshot[] {
  const overrides = pageConfig(pathname).blocks ?? {};
  return discoverBlocks(pathname).map((block, index) => {
    const key = block.dataset.bixboUniversalKey ?? `${pathname}:${index}`;
    const heading = labelElement(block);
    const originalLabel = block.dataset.bixboUniversalOriginalLabel ?? heading?.textContent?.trim() ?? `Section ${index + 1}`;
    const override = overrides[key];
    return {
      key,
      label: override?.label ?? originalLabel,
      originalLabel,
      hidden: override?.hidden === true,
      order: override?.order ?? Number(block.dataset.bixboUniversalOriginalOrder ?? index),
      canRename: Boolean(heading) && !isBrandLabel(originalLabel),
    };
  }).sort((a, b) => a.order - b.order);
}

export function UniversalAdminPageEditor() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  const supported = !isSpecializedPath(pathname);
  const blocks = useMemo(() => (supported ? snapshots(pathname) : []), [pathname, revision, supported]);

  useEffect(() => {
    const sync = () => {
      setAdminMode(isGlobalAdminModeActive());
      setRevision((value) => value + 1);
    };
    window.addEventListener(ADMIN_MODE_CHANGED, sync);
    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, sync);
    return () => {
      window.removeEventListener(ADMIN_MODE_CHANGED, sync);
      window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, sync);
    };
  }, []);

  useEffect(() => {
    const openCurrentPageEditor = () => {
      if (adminMode && supported) setOpen(true);
    };
    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);
    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);
  }, [adminMode, supported]);

  useEffect(() => {
    if (!supported) return;
    let refreshQueued = false;
    const refreshObserver = new MutationObserver(() => {
      if (refreshQueued) return;
      refreshQueued = true;
      window.requestAnimationFrame(() => {
        refreshQueued = false;
        setRevision((value) => value + 1);
      });
    });
    refreshObserver.observe(document.body, { childList: true, subtree: true });
    return () => refreshObserver.disconnect();
  }, [pathname, supported]);

  useEffect(() => {
    if (!supported) return;
    let queued = false;
    const apply = () => {
      queued = false;
      applyPageConfig(pathname);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(apply);
    };
    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, revision, supported]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!adminMode) setOpen(false);
  }, [adminMode]);

  const persist = (nextPage: UniversalPageConfig) => {
    const config = readExtendedConfig();
    writeExtendedConfig({
      ...config,
      enabled: true,
      universalPages: {
        ...(config.universalPages ?? {}),
        [pathname]: nextPage,
      },
    });
    setRevision((value) => value + 1);
  };

  const patchBlock = (key: string, patch: UniversalBlockOverride) => {
    const current = pageConfig(pathname);
    persist({
      ...current,
      blocks: {
        ...(current.blocks ?? {}),
        [key]: { ...(current.blocks?.[key] ?? {}), ...patch },
      },
    });
  };

  const writeOrder = (ordered: BlockSnapshot[]) => {
    const current = localPageConfig(pathname);
    const nextBlocks = { ...(current.blocks ?? {}) };
    ordered.forEach((block, orderIndex) => {
      nextBlocks[block.key] = { ...(nextBlocks[block.key] ?? {}), order: orderIndex };
    });
    persist({ ...current, blocks: nextBlocks });
  };

  const move = (key: string, delta: number) => {
    const ordered = [...blocks];
    const index = ordered.findIndex((block) => block.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    writeOrder(ordered);
  };

  const dropBlock = (targetKey: string) => {
    if (!draggedBlock || draggedBlock === targetKey) return;
    const ordered = [...blocks];
    const from = ordered.findIndex((block) => block.key === draggedBlock);
    const to = ordered.findIndex((block) => block.key === targetKey);
    if (from < 0 || to < 0) return;
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    writeOrder(ordered);
  };

  const moveDraggedBlockByPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (!draggedBlock) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-universal-page-sort-key]");
    const targetKey = target?.dataset.universalPageSortKey;
    if (targetKey && targetKey !== draggedBlock) dropBlock(targetKey);
  };

  const resetBlock = (key: string) => {
    const current = pageConfig(pathname);
    const nextBlocks = { ...(current.blocks ?? {}) };
    delete nextBlocks[key];
    persist({ ...current, blocks: nextBlocks });
  };

  const resetPage = () => {
    const config = readExtendedConfig();
    const universalPages = { ...(config.universalPages ?? {}) };
    delete universalPages[pathname];
    writeExtendedConfig({ ...config, universalPages });
    setRevision((value) => value + 1);
  };

  if (!supported || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  return (
    <>
      <div data-bixbo-admin-ui className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-[91] lg:bottom-6 lg:right-6">
        <button
          type="button"
          data-bixbo-admin-open="universal"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg ring-1 ring-primary/30"
        >
          {open ? t("Done") : `✦ ${t("Edit page")}`}
        </button>
      </div>

      {open ? (
        <div data-bixbo-admin-ui className="fixed inset-0 z-[90] bg-black/20" onClick={() => setOpen(false)}>
          <aside
            className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[460px] lg:max-h-none lg:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
              <p className="font-serif text-xl font-bold">{t("Page customization")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{pathname} · {t("Rename, hide or reorder visible page sections.")}</p>
            </div>

            <div className="space-y-2 px-4 py-4">
              {blocks.length ? blocks.map((block, index) => (
                <section key={block.key} data-universal-page-sort-key={block.key} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedBlock === block.key ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                    <input
                      value={block.label}
                      disabled={!block.canRename}
                      onChange={(event) => patchBlock(block.key, { label: event.target.value })}
                      className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => patchBlock(block.key, { hidden: !block.hidden })}
                      className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${block.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}
                    >
                      {block.hidden ? t("Hidden") : t("Shown")}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button type="button" disabled={index === 0} onClick={() => move(block.key, -1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↑</button>
                    <button type="button" disabled={index === blocks.length - 1} onClick={() => move(block.key, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>
                    <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedBlock(block.key); }} onPointerMove={moveDraggedBlockByPointer} onPointerUp={() => setDraggedBlock(null)} onPointerCancel={() => setDraggedBlock(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                    <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">{block.key}</span>
                    {Boolean(localPageConfig(pathname).blocks?.[block.key]) ? <button type="button" onClick={() => resetBlock(block.key)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}
                  </div>
                </section>
              )) : (
                <p className="rounded-2xl bg-tint p-4 text-xs text-muted-foreground">{t("No editable page sections were detected on this screen.")}</p>
              )}

              {Boolean(readExtendedConfig().universalPages?.[pathname]) ? <button type="button" onClick={resetPage} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                {t("Reset this page")}
              </button> : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
