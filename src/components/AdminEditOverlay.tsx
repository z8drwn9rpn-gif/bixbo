import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";

import { CustomLogBuilder } from "@/components/CustomLogBuilder";
import { CoreFeatureCustomFieldBuilder } from "@/components/CoreFeatureCustomFieldBuilder";
import { useI18n } from "@/hooks/useI18n";
import {
  BIXBO_LOG_FIELDS,
  BIXBO_REGISTRY,
  getRegistryFeature,
  getRegistryField,
  isRegistryFeatureEnabled,
  isRegistryOptionEnabled,
  isRegistrySurfaceEnabled,
  registryOptionLabel,
  type AdminConfig,
  type RegistryFeatureId,
  type RegistryFeatureOverride,
  type RegistryFieldOverride,
  type RegistrySurface,
} from "@/lib/appRegistry";
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
import { publishGlobalAdminConfig } from "@/lib/globalAdminConfig";
import { BIXBO_LAYOUT_SECTIONS, layoutOrder, type LayoutPageId } from "@/lib/layoutRegistry";
import { EMPTY, useBixbo, type BixboData } from "@/lib/storage";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";

const SURFACES: { id: RegistrySurface; label: string }[] = [
  { id: "log", label: "Log" },
  { id: "quickLog", label: "Quick Log" },
  { id: "calendar", label: "Calendar" },
  { id: "heatmap", label: "Heatmap" },
  { id: "monthly", label: "Monthly" },
  { id: "patterns", label: "Patterns" },
];

const ICONS = ["🔥", "⚡", "✨", "🫐", "❤️", "♨️", "🍽️", "💩", "🧘🏼‍♀️", "🌡️", "💊", "📅", "✅", "📝", "🤱", "🤕", "🥵", "🌙"];

type EditorTab = "page" | "features" | "fields" | "custom" | "publish";

function pageFromPath(pathname: string): LayoutPageId | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/patterns")) return "patterns.monthly";
  return null;
}

function pageSurface(page: LayoutPageId | null): RegistrySurface {
  if (page === "home") return "calendar";
  if (page === "insights") return "heatmap";
  return "patterns";
}

function AdminLayoutDomRuntime({ page, revision }: { page: LayoutPageId; revision: number }) {
  useEffect(() => {
    let disposed = false;
    let scheduled = false;
    const changed = new Set<HTMLElement>();

    const restore = () => {
      changed.forEach((element) => {
        const display = element.dataset.bixboAdminOriginalDisplay;
        if (display !== undefined) {
          element.style.display = display;
          delete element.dataset.bixboAdminOriginalDisplay;
        }
        const text = element.dataset.bixboAdminOriginalText;
        if (text !== undefined && element.children.length === 0) {
          element.textContent = text;
          delete element.dataset.bixboAdminOriginalText;
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
      ).filter((element) => !element.closest("[data-bixbo-admin-ui]"));

      (BIXBO_LAYOUT_SECTIONS[page] ?? []).forEach((section) => {
        const override = getEffectiveLayoutSectionOverride(page, section.id);
        if (!override.label && override.hidden !== true) return;

        const labelElement = candidates.find(
          (element) => element.children.length === 0 && element.textContent?.trim() === section.label.trim(),
        );
        if (!labelElement) return;

        if (override.label?.trim() && override.label.trim() !== section.label.trim()) {
          labelElement.dataset.bixboAdminOriginalText = labelElement.textContent ?? section.label;
          labelElement.textContent = override.label.trim();
          changed.add(labelElement);
        }

        if (override.hidden === true) {
          const container = labelElement.closest<HTMLElement>("section") ?? labelElement.parentElement;
          if (container && !container.closest("[data-bixbo-admin-ui]")) {
            container.dataset.bixboAdminOriginalDisplay = container.style.display;
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

export function AdminEditOverlay() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const page = pageFromPath(pathname);
  const { data, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [revision, setRevision] = useState(0);
  const [adminMode, setAdminMode] = useState(() => isGlobalAdminModeActive());
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EditorTab>("page");
  const [publishPin, setPublishPin] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [draggedFeature, setDraggedFeature] = useState<RegistryFeatureId | null>(null);
  const [draggedOption, setDraggedOption] = useState<{ featureId: RegistryFeatureId; fieldId: string; value: string } | null>(null);
  const [draggedField, setDraggedField] = useState<{ featureId: RegistryFeatureId; fieldId: string } | null>(null);
  const undoStack = useRef<string[]>([]);

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
    setTab("page");
  }, [pathname]);

  const localConfig = typeof window === "undefined" ? {} : getDeviceAdminConfig();
  const adminView: BixboData = { ...view, settings: { ...view.settings, adminConfig: localConfig } };
  const currentSurface = pageSurface(page);
  const sectionDefinitions = page
    ? [...(BIXBO_LAYOUT_SECTIONS[page] ?? [])].sort(
        (a, b) => layoutOrder(adminView, page, a.id, a.order) - layoutOrder(adminView, page, b.id, b.order),
      )
    : [];
  const features = BIXBO_REGISTRY.map((base) => getRegistryFeature(adminView, base.id)).sort(
    (a, b) => a.order - b.order,
  );

  const persist = (next: AdminConfig, snapshot = true) => {
    if (snapshot) undoStack.current.push(JSON.stringify(getDeviceAdminConfig()));
    setDeviceAdminConfig(next);
    setRevision((value) => value + 1);
    void router.invalidate();
  };

  const deviceUpdate = (recipe: (current: BixboData) => BixboData) => {
    const current: BixboData = { ...view, settings: { ...view.settings, adminConfig: getDeviceAdminConfig() } };
    persist(recipe(current).settings.adminConfig ?? {});
  };

  const patchFeature = (id: RegistryFeatureId, patch: RegistryFeatureOverride) => {
    const config = getDeviceAdminConfig();
    const existing = config.features?.[id] ?? {};
    persist({
      ...config,
      enabled: true,
      features: {
        ...(config.features ?? {}),
        [id]: {
          ...existing,
          ...patch,
          surfaces: patch.surfaces ? { ...(existing.surfaces ?? {}), ...patch.surfaces } : existing.surfaces,
        },
      },
    });
  };

  const patchField = (featureId: RegistryFeatureId, fieldId: string, patch: RegistryFieldOverride) => {
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const existing = feature.fields?.[fieldId] ?? {};
    persist({
      ...config,
      enabled: true,
      features: {
        ...(config.features ?? {}),
        [featureId]: {
          ...feature,
          fields: {
            ...(feature.fields ?? {}),
            [fieldId]: {
              ...existing,
              ...patch,
              scale: patch.scale ? { ...(existing.scale ?? {}), ...patch.scale } : existing.scale,
              options: patch.options ? { ...(existing.options ?? {}), ...patch.options } : existing.options,
            },
          },
        },
      },
    });
  };

  const resetFeature = (id: RegistryFeatureId) => {
    const config = getDeviceAdminConfig();
    const featuresCopy = { ...(config.features ?? {}) };
    delete featuresCopy[id];
    persist({ ...config, features: featuresCopy });
  };

  const writeFeatureOrder = (ids: RegistryFeatureId[]) => {
    const config = getDeviceAdminConfig();
    const featureOverrides = { ...(config.features ?? {}) };
    ids.forEach((id, index) => {
      featureOverrides[id] = { ...(featureOverrides[id] ?? {}), order: (index + 1) * 10 };
    });
    persist({ ...config, enabled: true, features: featureOverrides });
  };

  const moveFeature = (featureId: RegistryFeatureId, delta: number) => {
    const ids = features.map((feature) => feature.id);
    const from = ids.indexOf(featureId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    writeFeatureOrder(ids);
  };

  const dropFeature = (targetId: RegistryFeatureId) => {
    if (!draggedFeature || draggedFeature === targetId) return;
    const ids = features.map((feature) => feature.id);
    const from = ids.indexOf(draggedFeature);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeFeatureOrder(ids);
  };

  const moveDraggedFeatureByPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (!draggedFeature) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-feature-sort-id]");
    const targetId = target?.dataset.adminFeatureSortId as RegistryFeatureId | undefined;
    if (targetId && targetId !== draggedFeature) dropFeature(targetId);
  };

  const addFieldOption = (featureId: RegistryFeatureId, fieldId: string) => {
    const label = window.prompt(t("New option name"))?.trim();
    if (!label) return;
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const field = feature.fields?.[fieldId] ?? {};
    const options = field.options ?? {};
    const stableValue = `custom:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    patchField(featureId, fieldId, { options: { [stableValue]: { label, enabled: true, order: Object.keys(options).length + 1000 } } });
  };

  const deleteCustomFieldOption = (featureId: RegistryFeatureId, fieldId: string, value: string) => {
    if (!value.startsWith("custom:")) return;
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const field = feature.fields?.[fieldId] ?? {};
    const options = { ...(field.options ?? {}) };
    delete options[value];
    persist({
      ...config,
      enabled: true,
      features: {
        ...(config.features ?? {}),
        [featureId]: {
          ...feature,
          fields: { ...(feature.fields ?? {}), [fieldId]: { ...field, options } },
        },
      },
    });
  };

  const orderedFieldOptionValues = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => {
    const overrides = getDeviceAdminConfig().features?.[featureId]?.fields?.[fieldId]?.options ?? {};
    const values = [...new Set([...baseOptions, ...Object.keys(overrides)])];
    return values.sort((a, b) => (overrides[a]?.order ?? values.indexOf(a)) - (overrides[b]?.order ?? values.indexOf(b)));
  };

  const writeFieldOptionOrder = (featureId: RegistryFeatureId, fieldId: string, values: string[]) => {
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const field = feature.fields?.[fieldId] ?? {};
    const options = { ...(field.options ?? {}) };
    values.forEach((option, index) => {
      options[option] = { ...(options[option] ?? {}), order: (index + 1) * 10 };
    });
    patchField(featureId, fieldId, { options });
  };

  const moveFieldOption = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], value: string, delta: number) => {
    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);
    const from = values.indexOf(value);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= values.length) return;
    [values[from], values[to]] = [values[to], values[from]];
    writeFieldOptionOrder(featureId, fieldId, values);
  };

  const dropFieldOption = (featureId: RegistryFeatureId, fieldId: string, baseOptions: string[], targetValue: string) => {
    if (!draggedOption || draggedOption.featureId !== featureId || draggedOption.fieldId !== fieldId || draggedOption.value === targetValue) return;
    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);
    const from = values.indexOf(draggedOption.value);
    const to = values.indexOf(targetValue);
    if (from < 0 || to < 0) return;
    const [item] = values.splice(from, 1);
    values.splice(to, 0, item);
    writeFieldOptionOrder(featureId, fieldId, values);
  };

  const moveDraggedOptionByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId, fieldId: string, baseOptions: string[]) => {
    if (!draggedOption) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-option-sort-value]");
    const targetValue = target?.dataset.adminOptionSortValue;
    if (targetValue && target?.dataset.adminOptionFeature === featureId && target?.dataset.adminOptionField === fieldId && targetValue !== draggedOption.value) {
      dropFieldOption(featureId, fieldId, baseOptions, targetValue);
    }
  };

  const orderedBuiltinFields = (featureId: RegistryFeatureId) =>
    [...(BIXBO_LOG_FIELDS[featureId] ?? [])].sort((a, b) =>
      (getRegistryField(adminView, featureId, a.id)?.order ?? a.order) -
      (getRegistryField(adminView, featureId, b.id)?.order ?? b.order),
    );

  const writeBuiltinFieldOrder = (featureId: RegistryFeatureId, ids: string[]) => {
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const fields = { ...(feature.fields ?? {}) };
    ids.forEach((fieldId, index) => {
      fields[fieldId] = { ...(fields[fieldId] ?? {}), order: (index + 1) * 10 };
    });
    persist({
      ...config,
      enabled: true,
      features: { ...(config.features ?? {}), [featureId]: { ...feature, fields } },
    });
  };

  const dropBuiltinField = (featureId: RegistryFeatureId, targetId: string) => {
    if (!draggedField || draggedField.featureId !== featureId || draggedField.fieldId === targetId) return;
    const ids = orderedBuiltinFields(featureId).map((field) => field.id);
    const from = ids.indexOf(draggedField.fieldId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeBuiltinFieldOrder(featureId, ids);
  };

  const moveDraggedFieldByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId) => {
    if (!draggedField || draggedField.featureId !== featureId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-field-sort-id]");
    const targetId = target?.dataset.adminFieldSortId;
    if (targetId && target?.dataset.adminFieldFeature === featureId && targetId !== draggedField.fieldId) {
      dropBuiltinField(featureId, targetId);
    }
  };

  const writeOrder = (ids: string[]) => {
    if (!page) return;
    const config = getDeviceAdminConfig();
    persist({ ...config, enabled: true, layoutOrder: { ...(config.layoutOrder ?? {}), [page]: ids } });
  };

  const moveSection = (sectionId: string, delta: number) => {
    const ids = sectionDefinitions.map((section) => section.id);
    const index = ids.indexOf(sectionId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    writeOrder(ids);
  };

  const dropSection = (targetId: string) => {
    if (!draggedSection || draggedSection === targetId) return;
    const ids = sectionDefinitions.map((section) => section.id);
    const from = ids.indexOf(draggedSection);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeOrder(ids);
  };

  const moveDraggedSectionByPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (!draggedSection) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-section-sort-id]");
    const targetId = target?.dataset.adminSectionSortId;
    if (targetId && targetId !== draggedSection) dropSection(targetId);
  };

  const patchSection = (sectionId: string, patch: { label?: string; hidden?: boolean }) => {
    if (!page) return;
    persist(withLayoutSectionOverride(getDeviceAdminConfig(), page, sectionId, patch));
  };

  const resetSection = (sectionId: string) => {
    if (!page) return;
    persist(withoutLayoutSectionOverride(getDeviceAdminConfig(), page, sectionId));
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    try {
      persist(JSON.parse(previous) as AdminConfig, false);
    } catch {
      // Admin-config snapshots only; health data is never touched.
    }
  };

  const publish = async () => {
    if (publishPin.length !== 4) return;
    setPublishing(true);
    setPublishStatus("");
    try {
      const version = await publishGlobalAdminConfig(getDeviceAdminConfig(), publishPin);
      setPublishStatus(`${t("Published globally")} · v${version}`);
      setPublishPin("");
    } catch (error) {
      console.error("inlineAdmin publish", error);
      setPublishStatus(t("Global publish failed. Check the PIN and connection."));
    } finally {
      setPublishing(false);
    }
  };

  if (!page || !adminMode || typeof window === "undefined" || !isAdminOwnerAccount()) return null;

  return (
    <>
      <AdminLayoutDomRuntime page={page} revision={revision} />

      <div data-bixbo-admin-ui className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-[90] lg:bottom-6 lg:right-6">
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg ring-1 ring-primary/30">
          {open ? t("Done") : `✦ ${t("Edit")}`}
        </button>
      </div>

      {open ? (
        <div data-bixbo-admin-ui className="fixed inset-0 z-[89] bg-black/20 lg:bg-black/10" onClick={() => setOpen(false)}>
          <aside className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ring-1 ring-border lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[460px] lg:max-h-none lg:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold">{t("Admin edit mode")}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t("Device-local draft. Health data and chart calculations are untouched.")}</p>
                </div>
                <button type="button" onClick={undo} disabled={!undoStack.current.length} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border disabled:opacity-40">↶ {t("Undo")}</button>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1 rounded-2xl bg-tint p-1">
                {(["page", "features", "fields", "custom", "publish"] as EditorTab[]).map((key) => (
                  <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-xl px-1 py-2 text-[9px] font-bold ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {t(key === "page" ? "Page" : key === "features" ? "Features" : key === "fields" ? "Fields" : key === "custom" ? "Custom" : "Publish")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              {tab === "page" ? (
                <>
                  <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
                    <p className="text-sm font-bold">{t("Current page layout")}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("Rename, hide or reorder whole sections. Stable section IDs never change.")}</p>
                  </section>
                  {sectionDefinitions.map((section, index) => {
                    const label = getEffectiveLayoutSectionLabel(page, section.id);
                    const visible = isEffectiveLayoutSectionVisible(page, section.id);
                    const localOverride = layoutSectionOverridesFromConfig(localConfig)[page]?.[section.id];
                    return (
                      <section key={section.id} data-admin-section-sort-id={section.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedSection === section.id ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-tint text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                          <input value={label} onChange={(event) => patchSection(section.id, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-semibold ring-1 ring-border" />
                          <button type="button" onClick={() => patchSection(section.id, { hidden: visible })} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${visible ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>{visible ? t("Shown") : t("Hidden")}</button>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button type="button" disabled={index === 0} onClick={() => moveSection(section.id, -1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↑</button>
                          <button type="button" disabled={index === sectionDefinitions.length - 1} onClick={() => moveSection(section.id, 1)} className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold ring-1 ring-border disabled:opacity-30">↓</button>
                          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedSection(section.id); }} onPointerMove={moveDraggedSectionByPointer} onPointerUp={() => setDraggedSection(null)} onPointerCancel={() => setDraggedSection(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                          <span className="min-w-0 flex-1 truncate text-[9px] text-muted-foreground">ID: {section.id}</span>
                          {localOverride ? <button type="button" onClick={() => resetSection(section.id)} className="rounded-full bg-tint px-3 py-1.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}
                        </div>
                      </section>
                    );
                  })}
                  <button type="button" onClick={() => persist(withoutPageLayoutOverrides(getDeviceAdminConfig(), page))} className="w-full rounded-2xl bg-tint px-4 py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Reset current page customizations")}</button>
                </>
              ) : null}

              {tab === "features" ? (
                <>
                  <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
                    <p className="text-sm font-bold">{t("Features & surfaces")}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("Core features can be hidden but are never deleted. Current page surface is highlighted.")}</p>
                  </section>
                  {features.map((feature, featureIndex) => {
                    const local = localConfig.features?.[feature.id];
                    const enabled = isRegistryFeatureEnabled(adminView, feature.id);
                    return (
                      <section key={feature.id} data-admin-feature-sort-id={feature.id} className={`rounded-2xl bg-surface p-3 ring-1 ring-border/80 ${draggedFeature === feature.id ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-2">
                          <select value={feature.icon} onChange={(event) => patchFeature(feature.id, { icon: event.target.value })} className="h-9 w-14 rounded-xl bg-tint px-1 text-lg ring-1 ring-border">
                            {[...new Set([feature.icon, ...ICONS])].map((icon) => <option key={icon}>{icon}</option>)}
                          </select>
                          <input value={feature.label} onChange={(event) => patchFeature(feature.id, { label: event.target.value })} className="h-9 min-w-0 flex-1 rounded-xl bg-tint px-3 text-xs font-bold ring-1 ring-border" />
                          <input type="color" value={feature.color} onChange={(event) => patchFeature(feature.id, { color: event.target.value })} className="h-9 w-10 rounded-xl bg-tint p-1 ring-1 ring-border" />
                          <button type="button" onClick={() => patchFeature(feature.id, { enabled: !enabled })} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${enabled ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground ring-1 ring-border"}`}>{enabled ? t("On") : t("Hidden")}</button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <button type="button" disabled={featureIndex === 0} onClick={() => moveFeature(feature.id, -1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move up")} ${feature.label}`}>↑</button>
                          <button type="button" disabled={featureIndex === features.length - 1} onClick={() => moveFeature(feature.id, 1)} className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-semibold ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${feature.label}`}>↓</button>
                          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedFeature(feature.id); }} onPointerMove={moveDraggedFeatureByPointer} onPointerUp={() => setDraggedFeature(null)} onPointerCancel={() => setDraggedFeature(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center gap-1 rounded-full bg-tint px-2.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                          {SURFACES.map((surface) => {
                            const protectedPeriodHeatmap = feature.id === "period" && surface.id === "heatmap";
                            const on = isRegistrySurfaceEnabled(adminView, feature.id, surface.id);
                            return <button key={surface.id} type="button" disabled={protectedPeriodHeatmap} title={protectedPeriodHeatmap ? t("Period is a required Heatmap metric") : undefined} onClick={() => patchFeature(feature.id, { surfaces: { [surface.id]: !on } })} className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ring-1 ${on ? "bg-primary/10 text-primary ring-primary/25" : "bg-tint text-muted-foreground ring-border"} ${surface.id === currentSurface ? "outline outline-1 outline-primary/50" : ""} disabled:cursor-default disabled:opacity-100`}>{protectedPeriodHeatmap ? `${surface.label} · ${t("Required")}` : surface.label}</button>;
                          })}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">ID: {feature.id}</span>
                          {local ? <button type="button" onClick={() => resetFeature(feature.id)} className="rounded-full bg-tint px-3 py-1 text-[9px] font-semibold text-muted-foreground ring-1 ring-border">{t("Reset")}</button> : null}
                        </div>
                      </section>
                    );
                  })}
                </>
              ) : null}

              {tab === "fields" ? (
                <>
                  <section className="rounded-3xl bg-primary/10 p-4 ring-1 ring-primary/20">
                    <p className="text-sm font-bold">{t("Log fields, choices & scales")}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("Historical values keep their stable field IDs.")}</p>
                  </section>
                  {(Object.keys(BIXBO_LOG_FIELDS) as RegistryFeatureId[]).map((featureId) => {
                    const feature = getRegistryFeature(adminView, featureId);
                    return (
                      <section key={featureId} className="rounded-2xl bg-surface p-3 ring-1 ring-border/80">
                        <p className="text-xs font-bold">{feature.icon} {feature.label}</p>
                        <div className="mt-2 space-y-2">
                          {orderedBuiltinFields(featureId).map((baseField) => {
                            const field = getRegistryField(adminView, featureId, baseField.id) ?? baseField;
                            const localField = localConfig.features?.[featureId]?.fields?.[baseField.id];
                            const optionValues = orderedFieldOptionValues(featureId, baseField.id, baseField.options ?? []);
                            return (
                              <div key={baseField.id} data-admin-field-sort-id={baseField.id} data-admin-field-feature={featureId} className={`rounded-xl bg-tint p-2 ring-1 ring-border/70 ${draggedField?.featureId === featureId && draggedField.fieldId === baseField.id ? "opacity-60" : ""}`}>
                                <div className="flex items-center gap-2">
                                  {(featureId === "pain" || featureId === "panic" || featureId === "tetany" || featureId === "bowel") ? (
                                    <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedField({ featureId, fieldId: baseField.id }); }} onPointerMove={(event) => moveDraggedFieldByPointer(event, featureId)} onPointerUp={() => setDraggedField(null)} onPointerCancel={() => setDraggedField(null)} style={{ touchAction: "none" }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-background px-2 text-[9px] font-semibold text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}><span className="text-sm">⋮⋮</span>{t("Drag")}</button>
                                  ) : null}
                                  <input value={field.label} onChange={(event) => patchField(featureId, baseField.id, { label: event.target.value })} className="h-8 min-w-0 flex-1 rounded-lg bg-background px-2 text-[11px] font-semibold ring-1 ring-border" />
                                  <button type="button" onClick={() => patchField(featureId, baseField.id, { enabled: field.enabled === false })} className="rounded-full bg-background px-2 py-1 text-[9px] ring-1 ring-border">{field.enabled === false ? t("Hidden") : t("Shown")}</button>
                                </div>
                                {field.scale ? (
                                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                                    {(["min", "max", "step"] as const).map((key) => (
                                      <label key={key} className="text-[8px] text-muted-foreground">{key}
                                        <input type="number" step="0.5" value={field.scale?.[key] ?? ""} onChange={(event) => patchField(featureId, baseField.id, { scale: { [key]: Number(event.target.value) } })} className="mt-1 h-7 w-full rounded-lg bg-background px-2 text-[10px] ring-1 ring-border" />
                                      </label>
                                    ))}
                                  </div>
                                ) : null}
                                {baseField.kind === "chips" ? (
                                  <div className="mt-2 space-y-1">
                                    {optionValues.map((option, optionIndex) => {
                                      const override = localField?.options?.[option];
                                      const shown = isRegistryOptionEnabled(adminView, featureId, baseField.id, option);
                                      const label = registryOptionLabel(adminView, featureId, baseField.id, option);
                                      const custom = option.startsWith("custom:");
                                      return (
                                        <div key={option} data-admin-option-sort-value={option} data-admin-option-feature={featureId} data-admin-option-field={baseField.id} className={`flex items-center gap-1.5 ${draggedOption?.featureId === featureId && draggedOption.fieldId === baseField.id && draggedOption.value === option ? "opacity-60" : ""}`}>
                                          <button type="button" disabled={optionIndex === 0} onClick={() => moveFieldOption(featureId, baseField.id, baseField.options ?? [], option, -1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move up")} ${label}`}>↑</button>
                                          <button type="button" disabled={optionIndex === optionValues.length - 1} onClick={() => moveFieldOption(featureId, baseField.id, baseField.options ?? [], option, 1)} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border disabled:opacity-25" aria-label={`${t("Move down")} ${label}`}>↓</button>
                                          <button type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDraggedOption({ featureId, fieldId: baseField.id, value: option }); }} onPointerMove={(event) => moveDraggedOptionByPointer(event, featureId, baseField.id, baseField.options ?? [])} onPointerUp={() => setDraggedOption(null)} onPointerCancel={() => setDraggedOption(null)} style={{ touchAction: "none" }} className="inline-flex h-7 items-center rounded-full bg-background px-2 text-[8px] text-muted-foreground ring-1 ring-border cursor-grab active:cursor-grabbing" aria-label={t("Drag to reorder")}>⋮⋮</button>
                                          <input value={label} onChange={(event) => patchField(featureId, baseField.id, { options: { [option]: { ...override, label: event.target.value, order: override?.order ?? (optionIndex + 1) * 10 } } })} className="h-7 min-w-0 flex-1 rounded-lg bg-background px-2 text-[10px] ring-1 ring-border" />
                                          {custom ? (
                                            <button type="button" onClick={() => deleteCustomFieldOption(featureId, baseField.id, option)} className="rounded-full bg-background px-2 py-1 text-[8px] font-semibold text-destructive ring-1 ring-border">{t("Delete")}</button>
                                          ) : (
                                            <button type="button" onClick={() => patchField(featureId, baseField.id, { options: { [option]: { ...override, enabled: !shown, order: override?.order ?? optionIndex } } })} className="rounded-full bg-background px-2 py-1 text-[8px] ring-1 ring-border">{shown ? t("On") : t("Hidden")}</button>
                                          )}
                                        </div>
                                      );
                                    })}
                                    <button type="button" onClick={() => addFieldOption(featureId, baseField.id)} className="mt-1 w-full rounded-lg border border-dashed border-primary/40 bg-background px-2 py-1.5 text-[9px] font-bold text-primary">+ {t("Add custom")}</button>
                                  </div>
                                ) : null}
                                <p className="mt-1 text-[8px] text-muted-foreground">Field ID: {baseField.id}</p>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                  <CoreFeatureCustomFieldBuilder data={adminView} />
                </>
              ) : null}

              {tab === "custom" ? <CustomLogBuilder data={adminView} update={deviceUpdate} /> : null}

              {tab === "publish" ? (
                <section className="rounded-3xl bg-surface p-4 ring-1 ring-border/80">
                  <p className="font-serif text-lg font-bold">{t("Publish admin configuration")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("Your edits stay device-local until you explicitly publish them globally.")}</p>
                  <div className="mt-3 flex gap-2">
                    <input type="password" inputMode="numeric" maxLength={4} value={publishPin} onChange={(event) => setPublishPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={t("Admin PIN")} className="h-10 min-w-0 flex-1 rounded-xl bg-tint px-3 text-center font-bold tracking-[0.35em] ring-1 ring-border" />
                    <button type="button" disabled={publishing || publishPin.length !== 4} onClick={() => void publish()} className="rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-40">{publishing ? t("Publishing…") : t("Publish globally")}</button>
                  </div>
                  {publishStatus ? <p className="mt-2 text-xs font-semibold text-primary">{publishStatus}</p> : null}
                  <Link to="/admin" className="mt-4 block rounded-xl bg-tint px-3 py-2 text-center text-xs font-semibold text-muted-foreground ring-1 ring-border">{t("Open full Admin page")}</Link>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
