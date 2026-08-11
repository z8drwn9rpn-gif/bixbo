import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/hooks/useI18n";
import { getRegistryFeature } from "@/lib/appRegistry";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import { EMPTY, useBixbo } from "@/lib/storage";

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

function readConfig(): HakConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HakConfig) : {};
  } catch {
    return {};
  }
}

function writeConfig(config: HakConfig) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("bixbo:hak-admin-change"));
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [config, setConfig] = useState<HakConfig>(() => readConfig());
  const [revision, setRevision] = useState(0);

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
    const refresh = () => {
      setConfig(readConfig());
      setRevision((value) => value + 1);
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("bixbo:hak-admin-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("bixbo:hak-admin-change", refresh);
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

  if (!hakOpen || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  return (
    <>
      <div data-bixbo-hak-admin-ui data-bixbo-admin-ui className="fixed right-4 top-[max(4.1rem,calc(env(safe-area-inset-top)+3.1rem))] z-[9980]">
        <button
          type="button"
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
              <p className="font-serif text-xl font-bold">HAK · {t("Admin edit mode")}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename or hide HAK labels without changing pill calculations or saved health data.")}</p>
            </div>

            <div className="space-y-2 px-4 py-4">
              {definitions.map((definition) => {
                const override = config[definition.id] ?? {};
                const label = override.label ?? definition.defaultLabel;
                const hidden = override.hidden === true;
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
                      <button type="button" onClick={() => reset(definition.id)} className="text-[9px] font-semibold text-primary">{t("Reset")}</button>
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
