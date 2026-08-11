import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouterState } from "@tanstack/react-router";

import { useI18n } from "@/hooks/useI18n";
import type { AdminPageBlock } from "@/lib/appRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import {
  DEVICE_ADMIN_CONFIG_CHANGED,
  getDeviceAdminConfig,
  setDeviceAdminConfig,
} from "@/lib/deviceAdminConfig";
import { getEffectiveAdminConfig } from "@/lib/effectiveAdminConfig";
import {
  ADMIN_MODE_CHANGED,
  isGlobalAdminModeActive,
} from "@/components/GlobalAdminModeController";

function makeBlockId() {
  return `page_block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pageHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("main") ?? document.querySelector<HTMLElement>('[role="main"]');
}

function sorted(blocks: AdminPageBlock[]) {
  return [...blocks].sort((a, b) => a.order - b.order);
}

export function AdminCustomPageBlocks() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(pageHost());
    setOpen(false);
  }, [pathname]);

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

  const effectiveBlocks = useMemo(
    () => sorted(getEffectiveAdminConfig().pageBlocks?.[pathname] ?? []),
    [pathname, revision],
  );
  const visibleBlocks = effectiveBlocks.filter((block) => block.hidden !== true);

  const persist = (blocks: AdminPageBlock[]) => {
    const config = getDeviceAdminConfig();
    setDeviceAdminConfig({
      ...config,
      enabled: true,
      pageBlocks: {
        ...(config.pageBlocks ?? {}),
        [pathname]: sorted(blocks).map((block, index) => ({ ...block, order: (index + 1) * 10 })),
      },
    });
    setRevision((value) => value + 1);
  };

  const editableBlocks = () => {
    const local = getDeviceAdminConfig().pageBlocks?.[pathname];
    return sorted(local ?? effectiveBlocks);
  };

  const addBlock = () => {
    const blocks = editableBlocks();
    persist([
      ...blocks,
      {
        id: makeBlockId(),
        title: t("New section"),
        body: "",
        order: (blocks.at(-1)?.order ?? 0) + 10,
      },
    ]);
  };

  const patchBlock = (id: string, patch: Partial<AdminPageBlock>) => {
    persist(editableBlocks().map((block) => block.id === id ? { ...block, ...patch, id: block.id } : block));
  };

  const deleteBlock = (id: string) => {
    persist(editableBlocks().filter((block) => block.id !== id));
  };

  const moveBlock = (id: string, delta: -1 | 1) => {
    const blocks = editableBlocks();
    const from = blocks.findIndex((block) => block.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= blocks.length) return;
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    persist(blocks);
  };

  const content = host && pathname !== "/admin" && visibleBlocks.length ? createPortal(
    <div data-bixbo-custom-page-blocks className="mx-auto mt-4 w-full max-w-6xl space-y-3 px-3 pb-2 sm:px-4">
      {visibleBlocks.map((block) => (
        <section key={block.id} className="rounded-3xl bg-surface p-4 ring-1 ring-border/80">
          <h2 className="font-serif text-lg font-bold text-foreground">{block.title}</h2>
          {block.body.trim() ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{block.body}</p> : null}
        </section>
      ))}
    </div>,
    host,
  ) : null;

  if (pathname === "/admin") return content;

  return (
    <>
      {content}
      {adminMode && isAdminOwnerAccount() ? (
        <>
          <div data-bixbo-admin-ui className="fixed bottom-[calc(env(safe-area-inset-bottom)+12.5rem)] right-4 z-[94] lg:bottom-[8rem] lg:right-6">
            <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border">
              {open ? t("Done") : `＋ ${t("Sections")}`}
            </button>
          </div>

          {open ? (
            <div data-bixbo-admin-ui className="fixed inset-0 z-[93] bg-black/20" onClick={() => setOpen(false)}>
              <aside className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[480px] lg:max-h-none lg:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
                <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-serif text-xl font-bold">{t("Custom sections")}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{pathname} · {t("Add your own content blocks without changing app calculations.")}</p>
                    </div>
                    <button type="button" onClick={addBlock} className="rounded-full bg-primary px-3 py-2 text-[10px] font-bold text-primary-foreground">+ {t("Add")}</button>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4">
                  {effectiveBlocks.length ? effectiveBlocks.map((block, index) => (
                    <section key={block.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">
                      <input value={block.title} onChange={(event) => patchBlock(block.id, { title: event.target.value })} className="h-9 w-full rounded-xl bg-tint px-3 text-xs font-bold ring-1 ring-border" />
                      <textarea value={block.body} onChange={(event) => patchBlock(block.id, { body: event.target.value })} rows={3} placeholder={t("Text…")} className="mt-2 w-full resize-y rounded-xl bg-tint px-3 py-2 text-xs ring-1 ring-border" />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <button type="button" disabled={index === 0} onClick={() => moveBlock(block.id, -1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↑</button>
                        <button type="button" disabled={index === effectiveBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>
                        <button type="button" onClick={() => patchBlock(block.id, { hidden: block.hidden !== true })} className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${block.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{block.hidden ? t("Hidden") : t("Shown")}</button>
                        <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">{block.id}</span>
                        <button type="button" onClick={() => deleteBlock(block.id)} className="rounded-full px-3 py-1.5 text-[9px] font-bold text-destructive ring-1 ring-border">{t("Delete")}</button>
                      </div>
                    </section>
                  )) : <p className="rounded-2xl bg-tint p-4 text-xs text-muted-foreground">{t("No custom sections on this screen yet.")}</p>}
                </div>
              </aside>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
