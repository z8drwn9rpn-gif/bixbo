import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";

import { useI18n } from "@/hooks/useI18n";
import {
  getEffectiveLayoutSectionLabel,
  getEffectiveLayoutSectionOverride,
  isEffectiveLayoutSectionVisible,
  layoutSectionOverridesFromConfig,
  withLayoutSectionOverride,
  withoutLayoutSectionOverride,
  withoutPageLayoutOverrides,
} from "@/lib/adminLayoutOverrides";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import {
  DEVICE_ADMIN_CONFIG_CHANGED,
  getDeviceAdminConfig,
  setDeviceAdminConfig,
} from "@/lib/deviceAdminConfig";
import { BIXBO_LAYOUT_SECTIONS, layoutOrder, type LayoutPageId } from "@/lib/layoutRegistry";
import { EMPTY, useBixbo, type BixboData } from "@/lib/storage";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";

const COUPLE_PAGES: LayoutPageId[] = ["couple.overview", "couple.compare", "couple.health"];

function activeCouplePage(): LayoutPageId {
  if (typeof document === "undefined") return "couple.overview";
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("nav button[aria-pressed]"));
  const activeIndex = buttons.findIndex((button) => button.getAttribute("aria-pressed") === "true");
  return COUPLE_PAGES[activeIndex] ?? "couple.overview";
}

function CoupleLayoutDomRuntime({ page, revision }: { page: LayoutPageId; revision: number }) {
  useEffect(() => {
    let disposed = false;
    let scheduled = false;
    const changed = new Set<HTMLElement>();

    const restore = () => {
      changed.forEach((element) => {
        const display = element.dataset.bixboCoupleAdminOriginalDisplay;
        if (display !== undefined) {
          element.style.display = display;
          delete element.dataset.bixboCoupleAdminOriginalDisplay;
        }
        const text = element.dataset.bixboCoupleAdminOriginalText;
        if (text !== undefined && element.children.length === 0) {
          element.textContent = text;
          delete element.dataset.bixboCoupleAdminOriginalText;
        }
      });
      changed.clear();
    };

    const apply = () => {
      scheduled = false;
      if (disposed) return;
      restore();

      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,span,button,label"),
      ).filter((element) => !element.closest("[data-bixbo-couple-admin-ui]"));

      (BIXBO_LAYOUT_SECTIONS[page] ?? []).forEach((section) => {
        const override = getEffectiveLayoutSectionOverride(page, section.id);
        if (!override.label && override.hidden !== true) return;

        const labelElement = candidates.find(
          (element) => element.children.length === 0 && element.textContent?.trim() === section.label.trim(),
        );
        if (!labelElement) return;

        if (override.label?.trim() && override.label.trim() !== section.label.trim()) {
          labelElement.dataset.bixboCoupleAdminOriginalText = labelElement.textContent ?? section.label;
          labelElement.textContent = override.label.trim();
          changed.add(labelElement);
        }

        if (override.hidden === true) {
          const container = labelElement.closest<HTMLElement>("section") ?? labelElement.parentElement;
          if (container && !container.closest("[data-bixbo-couple-admin-ui]")) {
            container.dataset.bixboCoupleAdminOriginalDisplay = container.style.display;
            container.style.display = "none";
            changed.add(container);
          }
        }
      });
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };

    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer.disconnect();
      restore();
    };
  }, [page, revision]);

  return null;
}

export function CoupleAdminEditOverlay() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [page, setPage] = useState<LayoutPageId>("couple.overview");
  const [revision, setRevision] = useState(0);
  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());
  const [open, setOpen] = useState(false);
  const undoStack = useRef<string[]>([]);

  useEffect(() => {
    if (!pathname.startsWith("/couple")) return;
    const syncPage = () => setPage(activeCouplePage());
    syncPage();
    document.addEventListener("click", syncPage);
    const observer = new MutationObserver(syncPage);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["aria-pressed"] });
    return () => {
      document.removeEventListener("click", syncPage);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const syncAdminMode = () => setAdminMode(isGlobalAdminModeActive());
    window.addEventListener(ADMIN_MODE_CHANGED, syncAdminMode);
    return () => window.removeEventListener(ADMIN_MODE_CHANGED, syncAdminMode);
  }, []);

  useEffect(() => {
    if (!adminMode) setOpen(false);
  }, [adminMode]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
    return () => window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, page]);

  const localConfig = typeof window === "undefined" ? {} : getDeviceAdminConfig();
  const adminView: BixboData = { ...view, settings: { ...view.settings, adminConfig: localConfig } };
  const sections = useMemo(
    () => [...(BIXBO_LAYOUT_SECTIONS[page] ?? [])].sort(
      (a, b) => layoutOrder(adminView, page, a.id, a.order) - layoutOrder(adminView, page, b.id, b.order),
    ),
    [adminView, page, revision],
  );

  const persist = (next: ReturnType<typeof getDeviceAdminConfig>, snapshot = true) => {
    if (snapshot) undoStack.current.push(JSON.stringify(getDeviceAdminConfig()));
    setDeviceAdminConfig(next);
    setRevision((value) => value + 1);
    void router.invalidate();
  };

  const writeOrder = (ids: string[]) => {
    const config = getDeviceAdminConfig();
    persist({ ...config, enabled: true, layoutOrder: { ...(config.layoutOrder ?? {}), [page]: ids } });
  };

  const moveSection = (sectionId: string, delta: number) => {
    const ids = sections.map((section) => section.id);
    const index = ids.indexOf(sectionId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    writeOrder(ids);
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    try {
      persist(JSON.parse(previous), false);
    } catch {
      // Admin layout snapshots only. Couple health data is never touched.
    }
  };

  if (!pathname.startsWith("/couple") || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  return (
    <>
      <CoupleLayoutDomRuntime page={page} revision={revision} />

      <div data-bixbo-couple-admin-ui className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-[90] lg:bottom-6 lg:right-6">
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg ring-1 ring-primary/30">
          {open ? t("Done") : `✦ ${t("Edit")}`}
        </button>
      </div>

      {open ? (
        <div data-bixbo-couple-admin-ui className="fixed inset-0 z-[89] bg-black/20 lg:bg-black/10" onClick={() => setOpen(false)}>
          <aside className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[460px] lg:max-h-none lg:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold">{t("Couple edit mode")}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{page.replace("couple.", "")} · {t("Layout only. Couple calculations stay untouched.")}</p>
                </div>
                <button type="button" onClick={undo} disabled={!undoStack.current.length} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border disabled:opacity-40">↶ {t("Undo")}</button>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
                <p className="text-sm font-bold">{t("Current Couple tab")}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename, hide or reorder sections on the active Overview, Compare or Health tab.")}</p>
              </section>

              {sections.map((section, index) => {
                const label = getEffectiveLayoutSectionLabel(page, section.id);
                const visible = isEffectiveLayoutSectionVisible(page, section.id);
                const localOverride = layoutSectionOverridesFromConfig(localConfig)[page]?.[section.id];
                return (
                  <section key={section.id} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                      <input value={label} onChange={(event) => persist(withLayoutSectionOverride(getDeviceAdminConfig(), page, section.id, { label: event.target.value }))} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
                      <button type="button" onClick={() => persist(withLayoutSectionOverride(getDeviceAdminConfig(), page, section.id, { hidden: visible }))} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${visible ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>{visible ? t("Shown") : t("Hidden")}</button>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button type="button" disabled={index === 0} onClick={() => moveSection(section.id, -1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↑</button>
                      <button type="button" disabled={index === sections.length - 1} onClick={() => moveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>
                      <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>
                      {localOverride ? <button type="button" onClick={() => persist(withoutLayoutSectionOverride(getDeviceAdminConfig(), page, section.id))} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}
                    </div>
                  </section>
                );
              })}

              <button type="button" onClick={() => persist(withoutPageLayoutOverrides(getDeviceAdminConfig(), page))} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Reset current Couple tab")}</button>
              <Link to="/admin" className="block rounded-xl bg-primary px-3 py-2.5 text-center text-xs font-semibold text-primary-foreground">{t("Open full Admin for features, fields and custom logs")}</Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
