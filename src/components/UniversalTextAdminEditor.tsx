import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { useI18n } from "@/hooks/useI18n";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { DEVICE_ADMIN_CONFIG_CHANGED, getDeviceAdminConfig, setDeviceAdminConfig } from "@/lib/deviceAdminConfig";
import { getEffectiveAdminConfig } from "@/lib/effectiveAdminConfig";
import type { AdminConfig } from "@/lib/appRegistry";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";

type TextOverride = { label?: string; hidden?: boolean };
type TextItem = { key: string; original: string; label: string; hidden: boolean; tag: string };

function isBixboBrand(value: string) {
  return /^BIXBO(?:\s|$|—|-)/i.test(value.trim());
}

function editableText(value: string) {
  const text = value.trim();
  if (text.length < 2 || text.length > 100) return false;
  if (isBixboBrand(text)) return false;
  return /[A-Za-zÀ-ž]/.test(text);
}

function textElements(pathname: string): HTMLElement[] {
  if (typeof document === "undefined") return [];
  const all = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,span,button,label,a"))
    .filter((element) => !element.closest("[data-bixbo-admin-ui]"))
    .filter((element) => !element.closest("[data-bixbo-admin-mode-toolbar]"))
    .filter((element) => !element.closest("nav"))
    .filter((element) => element.children.length === 0)
    .filter((element) => editableText(element.dataset.bixboTextOriginal ?? element.textContent ?? ""));

  const occurrences = new Map<string, number>();
  all.forEach((element) => {
    const original = (element.dataset.bixboTextOriginal ?? element.textContent ?? "").trim();
    const base = `${element.tagName.toLowerCase()}::${original}`;
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    if (!element.dataset.bixboTextKey) {
      element.dataset.bixboTextKey = `${pathname}::${element.tagName.toLowerCase()}::${encodeURIComponent(original)}::${occurrence}`;
    }
  });
  return all;
}

function applyTextOverrides(pathname: string) {
  const overrides = getEffectiveAdminConfig().textOverrides ?? {};
  const activeKeys = new Set<string>();

  textElements(pathname).forEach((element) => {
    const key = element.dataset.bixboTextKey;
    if (!key) return;
    activeKeys.add(key);
    const original = (element.dataset.bixboTextOriginal ?? element.textContent ?? "").trim();
    if (isBixboBrand(original)) return;
    const override = overrides[key];

    if (override?.label?.trim()) {
      if (!element.dataset.bixboTextOriginal) element.dataset.bixboTextOriginal = original;
      if (element.textContent !== override.label.trim()) element.textContent = override.label.trim();
    } else if (element.dataset.bixboTextOriginal) {
      if (element.textContent !== element.dataset.bixboTextOriginal) element.textContent = element.dataset.bixboTextOriginal;
      delete element.dataset.bixboTextOriginal;
    }

    if (override?.hidden) {
      if (element.dataset.bixboTextOriginalDisplay === undefined) element.dataset.bixboTextOriginalDisplay = element.style.display;
      if (element.style.display !== "none") element.style.display = "none";
    } else if (element.dataset.bixboTextOriginalDisplay !== undefined) {
      element.style.display = element.dataset.bixboTextOriginalDisplay;
      delete element.dataset.bixboTextOriginalDisplay;
    }
  });

  document.querySelectorAll<HTMLElement>("[data-bixbo-text-key]").forEach((element) => {
    const key = element.dataset.bixboTextKey;
    if (!key || activeKeys.has(key) || !key.startsWith(`${pathname}::`)) return;
    if (element.dataset.bixboTextOriginal) {
      element.textContent = element.dataset.bixboTextOriginal;
      delete element.dataset.bixboTextOriginal;
    }
    if (element.dataset.bixboTextOriginalDisplay !== undefined) {
      element.style.display = element.dataset.bixboTextOriginalDisplay;
      delete element.dataset.bixboTextOriginalDisplay;
    }
  });
}

function currentTextItems(pathname: string): TextItem[] {
  const overrides = getEffectiveAdminConfig().textOverrides ?? {};
  return textElements(pathname).map((element) => {
    const key = element.dataset.bixboTextKey ?? "";
    const original = (element.dataset.bixboTextOriginal ?? element.textContent ?? "").trim();
    const override = overrides[key];
    return {
      key,
      original,
      label: override?.label ?? original,
      hidden: override?.hidden === true,
      tag: element.tagName.toLowerCase(),
    };
  }).filter((item) => item.key && !isBixboBrand(item.original));
}

export function UniversalTextAdminEditor() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);

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
    let queued = false;
    const apply = () => {
      queued = false;
      applyTextOverrides(pathname);
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
  }, [pathname, revision]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, adminMode]);

  const items = useMemo(() => currentTextItems(pathname), [pathname, revision, open]);

  const write = (key: string, patch: TextOverride) => {
    const config = getDeviceAdminConfig();
    const current = config.textOverrides?.[key] ?? {};
    setDeviceAdminConfig({
      ...config,
      enabled: true,
      textOverrides: {
        ...(config.textOverrides ?? {}),
        [key]: { ...current, ...patch },
      },
    });
    setRevision((value) => value + 1);
  };

  const reset = (key: string) => {
    const config = getDeviceAdminConfig();
    const next = { ...(config.textOverrides ?? {}) };
    delete next[key];
    setDeviceAdminConfig({ ...config, textOverrides: next });
    setRevision((value) => value + 1);
  };

  if (!adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  return (
    <>
      <div data-bixbo-admin-ui className="fixed bottom-[calc(env(safe-area-inset-bottom)+9rem)] left-4 z-[93] lg:bottom-[4.5rem] lg:left-[16rem]">
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-lg ring-1 ring-border">
          {open ? t("Done") : `Aa ${t("Text")}`}
        </button>
      </div>

      {open ? (
        <div data-bixbo-admin-ui className="fixed inset-0 z-[92] bg-black/20" onClick={() => setOpen(false)}>
          <aside className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-64 lg:right-auto lg:w-[480px] lg:max-h-none lg:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
              <p className="font-serif text-xl font-bold">{t("Visible text & labels")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename or hide visible labels on this screen. Dynamic values may appear only while they are visible.")}</p>
            </div>
            <div className="space-y-2 px-4 py-4">
              {items.map((item) => {
                const hasOverride = Boolean(getEffectiveAdminConfig().textOverrides?.[item.key]);
                return (
                  <section key={item.key} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">
                    <div className="flex items-center gap-2">
                      <input value={item.label} onChange={(event) => write(item.key, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
                      <button type="button" onClick={() => write(item.key, { hidden: !item.hidden })} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${item.hidden ? "bg-tint text-muted-foreground ring-1 ring-border" : "bg-primary text-primary-foreground"}`}>{item.hidden ? t("Hidden") : t("Shown")}</button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[8px] text-muted-foreground">{item.tag} · {item.original}</span>
                      {hasOverride ? <button type="button" onClick={() => reset(item.key)} className="rounded-full bg-tint px-3 py-1 text-[9px] font-semibold ring-1 ring-border">{t("Reset")}</button> : null}
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
