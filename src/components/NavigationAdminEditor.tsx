import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useI18n } from "@/hooks/useI18n";
import type { AdminConfig } from "@/lib/appRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { DEVICE_ADMIN_CONFIG_CHANGED, getDeviceAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";
import { BIXBO_NAVIGATION, navigationItemOverrides, type NavigationItemId } from "@/lib/navigationRegistry";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";

type NavAdminConfig = AdminConfig & {
  navigation?: {
    items?: Record<string, { label?: string; hidden?: boolean; order?: number }>;
  };
};

export function NavigationAdminEditor() {
  const { t } = useI18n();
  const [active, setActive] = useState(() => isGlobalAdminModeActive());
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [draggedItem, setDraggedItem] = useState<NavigationItemId | null>(null);
  void revision;

  useEffect(() => {
    const sync = () => {
      setActive(isGlobalAdminModeActive());
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
    if (!active) setOpen(false);
  }, [active]);

  const items = useMemo(() => {
    const overrides = navigationItemOverrides();
    return BIXBO_NAVIGATION.map((item) => ({ ...item, ...(overrides[item.id] ?? {}) }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [revision]);

  const write = (id: NavigationItemId, patch: { label?: string; hidden?: boolean; order?: number }) => {
    const config = getDeviceAdminConfig() as NavAdminConfig;
    const current = config.navigation?.items?.[id] ?? {};
    setDeviceAdminConfig({
      ...config,
      enabled: true,
      navigation: {
        ...(config.navigation ?? {}),
        items: {
          ...(config.navigation?.items ?? {}),
          [id]: { ...current, ...patch },
        },
      },
    } as AdminConfig);
    setRevision((value) => value + 1);
  };

  const move = (id: NavigationItemId, delta: number) => {
    const ordered = [...items];
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const config = getDeviceAdminConfig() as NavAdminConfig;
    const nextItems = { ...(config.navigation?.items ?? {}) };
    ordered.forEach((item, orderIndex) => {
      nextItems[item.id] = { ...(nextItems[item.id] ?? {}), order: (orderIndex + 1) * 10 };
    });
    setDeviceAdminConfig({
      ...config,
      enabled: true,
      navigation: { ...(config.navigation ?? {}), items: nextItems },
    } as AdminConfig);
    setRevision((value) => value + 1);
  };

  const dropItem = (targetId: NavigationItemId) => {
    if (!draggedItem || draggedItem === targetId) return;
    const ordered = [...items];
    const from = ordered.findIndex((item) => item.id === draggedItem);
    const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    const config = getDeviceAdminConfig() as NavAdminConfig;
    const nextItems = { ...(config.navigation?.items ?? {}) };
    ordered.forEach((navItem, orderIndex) => {
      nextItems[navItem.id] = { ...(nextItems[navItem.id] ?? {}), order: (orderIndex + 1) * 10 };
    });
    setDeviceAdminConfig({ ...config, enabled: true, navigation: { ...(config.navigation ?? {}), items: nextItems } } as AdminConfig);
    setRevision((value) => value + 1);
  };

  const moveDraggedItemByPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (!draggedItem) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-nav-sort-id]");
    const targetId = target?.dataset.adminNavSortId as NavigationItemId | undefined;
    if (targetId && targetId !== draggedItem) dropItem(targetId);
  };

  const resetItem = (id: NavigationItemId) => {
    const config = getDeviceAdminConfig() as NavAdminConfig;
    const nextItems = { ...(config.navigation?.items ?? {}) };
    delete nextItems[id];
    setDeviceAdminConfig({ ...config, navigation: { ...(config.navigation ?? {}), items: nextItems } } as AdminConfig);
    setRevision((value) => value + 1);
  };

  if (!active || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  return (
    <>
      <div data-bixbo-admin-ui className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 z-[92] lg:bottom-6 lg:left-[16rem]">
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background shadow-lg ring-1 ring-border">
          {open ? t("Done") : `☰ ${t("Navigation")}`}
        </button>
      </div>

      {open ? (
        <div data-bixbo-admin-ui className="fixed inset-0 z-[91] bg-black/20" onClick={() => setOpen(false)}>
          <aside className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-64 lg:right-auto lg:w-[430px] lg:max-h-none lg:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
              <p className="font-serif text-xl font-bold">{t("Navigation")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename, hide or reorder navigation. BIXBO branding is locked.")}</p>
            </div>
            <div className="space-y-2 px-4 py-4">
              {items.map((item, index) => {
                const override = navigationItemOverrides()[item.id];
                const hidden = override?.hidden === true;
                const defaultItem = BIXBO_NAVIGATION.find((candidate) => candidate.id === item.id)!;
                return (
                  <section key={item.id} data-admin-nav-sort-id={item.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedItem === item.id ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                      <input value={override?.label ?? t(defaultItem.label)} onChange={(event) => write(item.id, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
                      <button type="button" onClick={() => write(item.id, { hidden: !hidden })} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{hidden ? t("Hidden") : t("Shown")}</button>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button type="button" disabled={index === 0} onClick={() => move(item.id, -1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↑</button>
                      <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>
                      <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedItem(item.id); }} onPointerMove={moveDraggedItemByPointer} onPointerUp={() => setDraggedItem(null)} onPointerCancel={() => setDraggedItem(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                      <span className="min-w-0 flex-1 truncate text-[8px] text-muted-foreground">ID: {item.id}</span>
                      {Boolean((getDeviceAdminConfig() as NavAdminConfig).navigation?.items?.[item.id]) ? <button type="button" onClick={() => resetItem(item.id)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold ring-1 ring-border">{t("Reset")}</button> : null}
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
