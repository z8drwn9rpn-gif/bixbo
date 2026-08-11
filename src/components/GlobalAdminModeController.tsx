import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { useI18n } from "@/hooks/useI18n";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { requestAdminCustomizeCurrentPage } from "@/lib/adminCustomizeEvents";

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

  return (
    <>
      <style>{`
        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-admin-ui],
        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-couple-admin-ui],
        html:not([data-bixbo-admin-mode="1"]) [data-bixbo-hak-admin-ui] {
          display: none !important;
        }
      `}</style>

      {owner && active ? (
        <div
          data-bixbo-admin-mode-toolbar
          className="fixed left-1/2 top-[max(.6rem,env(safe-area-inset-top))] z-[10020] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-3 py-2 text-background shadow-xl ring-1 ring-background/20"
        >
          <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em]">✦ {t("Admin mode")}</span>
          <button
            type="button"
            onClick={() => {
              requestAdminCustomizeCurrentPage();
              window.setTimeout(() => {
                const panelAlreadyOpen = document.querySelector(
                  '[data-bixbo-admin-ui] aside, [data-bixbo-couple-admin-ui] aside, [data-bixbo-hak-admin-ui] aside',
                );
                if (panelAlreadyOpen) return;
                document.querySelector<HTMLButtonElement>('[data-bixbo-admin-page-opener]')?.click();
              }, 80);
            }}
            className="rounded-full bg-background/15 px-2.5 py-1 text-[9px] font-bold"
          >
            {t("Customize")}
          </button>
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
