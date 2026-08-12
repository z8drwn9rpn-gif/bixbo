import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { useI18n } from "@/hooks/useI18n";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { requestAdminCustomizeCurrentPage, requestAdminTool } from "@/lib/adminCustomizeEvents";

export const ADMIN_UNLOCK_KEY = "bixbo-admin-unlocked";
export const ADMIN_MODE_CHANGED = "bixbo:admin-mode-changed";

export function isGlobalAdminModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGlobalAdminModeActive(active: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (active) window.sessionStorage.setItem(ADMIN_UNLOCK_KEY, "1");
    else window.sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  } catch {
    // Session-only editor state. App data is never touched.
  }
  window.dispatchEvent(new CustomEvent(ADMIN_MODE_CHANGED, { detail: { active } }));
}

/**
 * One global Admin Mode for the whole app.
 * Existing admin overlays remain mounted so saved customization keeps applying,
 * but their controls are visible only while this session mode is active.
 */
export function GlobalAdminModeController() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [active, setActive] = useState(() => isGlobalAdminModeActive());

  useEffect(() => {
    const sync = () => setActive(isGlobalAdminModeActive());
    sync();
    const timer = window.setInterval(sync, 300);
    window.addEventListener(ADMIN_MODE_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ADMIN_MODE_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (active && isAdminOwnerAccount()) document.documentElement.dataset.bixboAdminMode = "1";
    else delete document.documentElement.dataset.bixboAdminMode;
    return () => {
      delete document.documentElement.dataset.bixboAdminMode;
    };
  }, [active]);

  const owner = typeof window !== "undefined" && isAdminOwnerAccount();

  const clickAdminTrigger = (name: string): boolean => {
    if (typeof document === "undefined") return false;
    const button = document.querySelector<HTMLButtonElement>(`[data-bixbo-admin-open="${name}"]`);
    if (!button) return false;
    button.click();
    return true;
  };

  const openAdminTool = (tool: "text" | "sections" | "navigation") => {
    if (tool === "navigation") {
      if (!clickAdminTrigger("navigation")) requestAdminCustomizeCurrentPage();
      return;
    }

    if (tool === "text") {
      if (!clickAdminTrigger("text")) requestAdminCustomizeCurrentPage();
      return;
    }

    // There is no standalone `sections` trigger. Sections live in the page
    // editor: primary on Home/Insights/Patterns, universal on other pages,
    // and the request helper selects Couple/HAK editors where appropriate.
    const specialized =
      pathname === "/" || pathname.startsWith("/insights") || pathname.startsWith("/patterns");
    if (!clickAdminTrigger(specialized ? "primary" : "universal")) {
      requestAdminCustomizeCurrentPage();
    }
  };

  useEffect(() => {
    if (!active || !owner || typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => requestAdminCustomizeCurrentPage());
    return () => window.cancelAnimationFrame(frame);
  }, [active, owner, pathname]);

  return (
    <>
      <style>{`
        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-admin-ui],
        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-couple-admin-ui],
        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-hak-admin-ui] {
          display: none !important;
        }
        html[data-bixbo-admin-mode="1"] [data-bixbo-admin-open] {
          display: none !important;
        }
      `}</style>

      {owner && active ? (
        <div
          data-bixbo-admin-mode-toolbar
          className="fixed left-1/2 top-[max(.55rem,env(safe-area-inset-top))] z-[10020] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-2.5 py-2 text-background shadow-xl ring-1 ring-background/20"
        >
          <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em]">✦ {t("Admin mode")}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => requestAdminTool("page")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Page")}</button>
            <button type="button" onClick={() => requestAdminTool("text")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Text")}</button>
            <button type="button" onClick={() => requestAdminTool("sections")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Sections")}</button>
            <button type="button" onClick={() => requestAdminTool("navigation")} className="rounded-full bg-background/15 px-2 py-1 text-[9px] font-bold">{t("Nav")}</button>
          </div>
          <button
            type="button"
            onClick={() => {
              setGlobalAdminModeActive(false);
              setActive(false);
            }}
            className="rounded-full bg-background px-2.5 py-1 text-[9px] font-black text-foreground"
          >
            {t("Exit")}
          </button>
        </div>
      ) : null}
    </>
  );
}
