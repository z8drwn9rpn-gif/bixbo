import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

import { CustomLogBuilder } from "@/components/CustomLogBuilder";
import { ADMIN_MODE_CHANGED, isGlobalAdminModeActive } from "@/components/GlobalAdminModeController";
import { AdminFeaturesTab } from "@/components/admin/AdminFeaturesTab";
import { AdminFieldsTab, type AdminUnifiedField } from "@/components/admin/AdminFieldsTab";
import { AdminPageTab } from "@/components/admin/AdminPageTab";
import { AdminPublishTab } from "@/components/admin/AdminPublishTab";
import { AdminLayoutDomRuntime, pageFromPath, pageSurface, type EditorTab } from "@/components/admin/AdminEditRuntime";
import { useI18n } from "@/hooks/useI18n";
import {
  BIXBO_LOG_FIELDS,
  BIXBO_REGISTRY,
  getRegistryFeature,
  getRegistryField,
  type AdminConfig,
  type RegistryFeatureId,
  type RegistryFeatureOverride,
  type RegistryFieldDefinition,
  type RegistryFieldOverride,
} from "@/lib/appRegistry";
import {
  withLayoutSectionOverride,
  withoutLayoutSectionOverride,
} from "@/lib/adminLayoutOverrides";
import { ADMIN_CUSTOMIZE_REQUESTED, ADMIN_TOOL_REQUESTED } from "@/lib/adminCustomizeEvents";
import { isAdminOwnerAccount } from "@/lib/deviceAdmin";
import {
  DEVICE_ADMIN_CONFIG_CHANGED,
  getDeviceAdminConfig,
  setDeviceAdminConfig,
} from "@/lib/deviceAdminConfig";
import { publishGlobalAdminConfig } from "@/lib/globalAdminConfig";
import { BIXBO_LAYOUT_SECTIONS, layoutOrder } from "@/lib/layoutRegistry";
import { EMPTY, useBixbo, type BixboData } from "@/lib/storage";

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
    const openCurrentPageEditor = () => {
      if (!adminMode || !page) return;
      if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return;
      setTab("page");
      setOpen(true);
    };
    window.addEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);
    return () => window.removeEventListener(ADMIN_CUSTOMIZE_REQUESTED, openCurrentPageEditor);
  }, [adminMode, page, pathname]);

  useEffect(() => {
    const onTool = (event: Event) => {
      const tool = (event as CustomEvent<{ tool?: string }>).detail?.tool;
      if (!adminMode || !page || (tool !== "page" && tool !== "sections")) return;
      if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return;
      setTab("page");
      setOpen(true);
    };
    window.addEventListener(ADMIN_TOOL_REQUESTED, onTool);
    return () => window.removeEventListener(ADMIN_TOOL_REQUESTED, onTool);
  }, [adminMode, page, pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/patterns")) return;
    const refreshPatternsPage = () => setRevision((value) => value + 1);
    const observer = new MutationObserver(refreshPatternsPage);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["aria-selected"] });
    return () => observer.disconnect();
  }, [pathname]);

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
  const featureIds = features.map((feature) => feature.id);

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

  const patchCustomField = (featureId: RegistryFeatureId, fieldId: string, patch: Partial<RegistryFieldDefinition>) => {
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const customFields = (feature.customFields ?? []).map((field) =>
      field.id === fieldId ? { ...field, ...patch, id: field.id } : field,
    );
    persist({
      ...config,
      enabled: true,
      features: {
        ...(config.features ?? {}),
        [featureId]: { ...feature, customFields },
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
    patchField(featureId, fieldId, {
      options: { [stableValue]: { label, enabled: true, order: Object.keys(options).length + 1000 } },
    });
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
    return values.sort(
      (a, b) => (overrides[a]?.order ?? values.indexOf(a)) - (overrides[b]?.order ?? values.indexOf(b)),
    );
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

  const moveFieldOption = (
    featureId: RegistryFeatureId,
    fieldId: string,
    baseOptions: string[],
    value: string,
    delta: number,
  ) => {
    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);
    const from = values.indexOf(value);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= values.length) return;
    [values[from], values[to]] = [values[to], values[from]];
    writeFieldOptionOrder(featureId, fieldId, values);
  };

  const dropFieldOption = (
    featureId: RegistryFeatureId,
    fieldId: string,
    baseOptions: string[],
    targetValue: string,
  ) => {
    if (!draggedOption || draggedOption.featureId !== featureId || draggedOption.fieldId !== fieldId || draggedOption.value === targetValue) return;
    const values = orderedFieldOptionValues(featureId, fieldId, baseOptions);
    const from = values.indexOf(draggedOption.value);
    const to = values.indexOf(targetValue);
    if (from < 0 || to < 0) return;
    const [item] = values.splice(from, 1);
    values.splice(to, 0, item);
    writeFieldOptionOrder(featureId, fieldId, values);
  };

  const moveDraggedOptionByPointer = (
    event: ReactPointerEvent<HTMLElement>,
    featureId: RegistryFeatureId,
    fieldId: string,
    baseOptions: string[],
  ) => {
    if (!draggedOption) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-option-sort-value]");
    const targetValue = target?.dataset.adminOptionSortValue;
    if (
      targetValue &&
      target?.dataset.adminOptionFeature === featureId &&
      target?.dataset.adminOptionField === fieldId &&
      targetValue !== draggedOption.value
    ) {
      dropFieldOption(featureId, fieldId, baseOptions, targetValue);
    }
  };

  const orderedUnifiedFields = (featureId: RegistryFeatureId): AdminUnifiedField[] => {
    const builtins = (BIXBO_LOG_FIELDS[featureId] ?? []).map((baseField) => ({
      source: "builtin" as const,
      id: baseField.id,
      order: getRegistryField(adminView, featureId, baseField.id)?.order ?? baseField.order,
      baseField,
    }));
    const custom = (localConfig.features?.[featureId]?.customFields ?? []).map((customField) => ({
      source: "custom" as const,
      id: customField.id,
      order: customField.order,
      customField,
    }));
    return [...builtins, ...custom].sort(
      (a, b) => a.order - b.order || (a.source === b.source ? a.id.localeCompare(b.id) : a.source === "builtin" ? -1 : 1),
    );
  };

  const writeUnifiedFieldOrder = (featureId: RegistryFeatureId, ids: string[]) => {
    const config = getDeviceAdminConfig();
    const feature = config.features?.[featureId] ?? {};
    const fields = { ...(feature.fields ?? {}) };
    const customIds = new Set((feature.customFields ?? []).map((field) => field.id));
    const orderById = new Map(ids.map((id, index) => [id, (index + 1) * 10]));

    ids.forEach((fieldId) => {
      if (!customIds.has(fieldId)) {
        fields[fieldId] = { ...(fields[fieldId] ?? {}), order: orderById.get(fieldId) };
      }
    });
    const customFields = (feature.customFields ?? []).map((field) => ({
      ...field,
      order: orderById.get(field.id) ?? field.order,
    }));

    persist({
      ...config,
      enabled: true,
      features: { ...(config.features ?? {}), [featureId]: { ...feature, fields, customFields } },
    });
  };

  const dropUnifiedField = (featureId: RegistryFeatureId, targetId: string) => {
    if (!draggedField || draggedField.featureId !== featureId || draggedField.fieldId === targetId) return;
    const ids = orderedUnifiedFields(featureId).map((field) => field.id);
    const from = ids.indexOf(draggedField.fieldId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    writeUnifiedFieldOrder(featureId, ids);
  };

  const moveDraggedFieldByPointer = (event: ReactPointerEvent<HTMLElement>, featureId: RegistryFeatureId) => {
    if (!draggedField || draggedField.featureId !== featureId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-admin-field-sort-id]");
    const targetId = target?.dataset.adminFieldSortId;
    if (targetId && target?.dataset.adminFieldFeature === featureId && targetId !== draggedField.fieldId) {
      dropUnifiedField(featureId, targetId);
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
        <button
          type="button"
          data-bixbo-admin-open="primary"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg ring-1 ring-primary/30"
        >
          {open ? t("Done") : `✦ ${t("Edit")}`}
        </button>
      </div>

      {open ? (
        <div
          data-bixbo-admin-ui
          data-bixbo-admin-live-editor
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] z-[10010] lg:inset-0 lg:pointer-events-auto lg:bg-black/10"
        >
          <aside
            className="pointer-events-auto relative mx-2 max-h-[48dvh] overflow-y-auto rounded-[28px] bg-background pb-4 shadow-2xl ring-1 ring-border lg:absolute lg:inset-y-4 lg:left-auto lg:right-4 lg:mx-0 lg:w-[460px] lg:max-h-none lg:rounded-[28px] lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold">{t("Admin edit mode")}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t("Device-local draft. Health data and chart calculations are untouched.")}</p>
                </div>
                <button
                  type="button"
                  onClick={undo}
                  disabled={!undoStack.current.length}
                  className="rounded-full bg-tint px-3 py-1.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border disabled:opacity-40"
                >
                  ↶ {t("Undo")}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1 rounded-2xl bg-tint p-1">
                {(["page", "features", "fields", "custom", "publish"] as EditorTab[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-xl px-1 py-2 text-[9px] font-bold ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {t(key === "page" ? "Page" : key === "features" ? "Features" : key === "fields" ? "Fields" : key === "custom" ? "Custom" : "Publish")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              {tab === "page" ? (
                <AdminPageTab
                  page={page}
                  sections={sectionDefinitions}
                  localConfig={localConfig}
                  draggedSection={draggedSection}
                  onPatchSection={patchSection}
                  onMoveSection={moveSection}
                  onDragStart={setDraggedSection}
                  onDragMove={moveDraggedSectionByPointer}
                  onDragEnd={() => setDraggedSection(null)}
                  onResetSection={resetSection}
                  onPersist={persist}
                />
              ) : null}

              {tab === "features" ? (
                <AdminFeaturesTab
                  adminView={adminView}
                  localConfig={localConfig}
                  currentSurface={currentSurface}
                  featureIds={featureIds}
                  draggedFeature={draggedFeature}
                  onPatchFeature={patchFeature}
                  onMoveFeature={moveFeature}
                  onDragStart={setDraggedFeature}
                  onDragMove={moveDraggedFeatureByPointer}
                  onDragEnd={() => setDraggedFeature(null)}
                  onResetFeature={resetFeature}
                />
              ) : null}

              {tab === "fields" ? (
                <AdminFieldsTab
                  adminView={adminView}
                  localConfig={localConfig}
                  orderedUnifiedFields={orderedUnifiedFields}
                  orderedFieldOptionValues={orderedFieldOptionValues}
                  draggedField={draggedField}
                  draggedOption={draggedOption}
                  onPatchCustomField={patchCustomField}
                  onPatchField={patchField}
                  onSetDraggedField={setDraggedField}
                  onMoveDraggedField={moveDraggedFieldByPointer}
                  onSetDraggedOption={setDraggedOption}
                  onMoveDraggedOption={moveDraggedOptionByPointer}
                  onMoveFieldOption={moveFieldOption}
                  onDeleteCustomOption={deleteCustomFieldOption}
                  onAddFieldOption={addFieldOption}
                />
              ) : null}

              {tab === "custom" ? <CustomLogBuilder data={adminView} update={deviceUpdate} /> : null}

              {tab === "publish" ? (
                <AdminPublishTab
                  publishPin={publishPin}
                  publishStatus={publishStatus}
                  publishing={publishing}
                  onPinChange={setPublishPin}
                  onPublish={() => void publish()}
                />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
