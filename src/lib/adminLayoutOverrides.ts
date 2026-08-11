import { BIXBO_LAYOUT_SECTIONS, type LayoutPageId } from "./layoutRegistry";
import { getDeviceAdminConfig } from "./deviceAdminConfig";
import { getCachedGlobalAdminConfig } from "./globalAdminConfig";
import type { AdminConfig } from "./appRegistry";

export interface LayoutSectionOverride {
  label?: string;
  hidden?: boolean;
}

export type LayoutSectionOverrides = Partial<
  Record<LayoutPageId, Record<string, LayoutSectionOverride>>
>;

type ExtendedAdminConfig = AdminConfig & {
  layoutSections?: LayoutSectionOverrides;
};

export function layoutSectionOverridesFromConfig(config?: AdminConfig): LayoutSectionOverrides {
  return ((config as ExtendedAdminConfig | undefined)?.layoutSections ?? {}) as LayoutSectionOverrides;
}

export function mergeLayoutSectionOverrides(
  globalConfig: AdminConfig = {},
  localConfig: AdminConfig = {},
): LayoutSectionOverrides {
  const globalSections = layoutSectionOverridesFromConfig(globalConfig);
  const localSections = layoutSectionOverridesFromConfig(localConfig);
  const pages = new Set<LayoutPageId>([
    ...(Object.keys(globalSections) as LayoutPageId[]),
    ...(Object.keys(localSections) as LayoutPageId[]),
  ]);
  const merged: LayoutSectionOverrides = {};

  pages.forEach((page) => {
    const globalPage = globalSections[page] ?? {};
    const localPage = localSections[page] ?? {};
    const sectionIds = new Set([...Object.keys(globalPage), ...Object.keys(localPage)]);
    const pageResult: Record<string, LayoutSectionOverride> = {};
    sectionIds.forEach((sectionId) => {
      pageResult[sectionId] = {
        ...(globalPage[sectionId] ?? {}),
        ...(localPage[sectionId] ?? {}),
      };
    });
    if (Object.keys(pageResult).length) merged[page] = pageResult;
  });

  return merged;
}

export function getEffectiveLayoutSectionOverrides(): LayoutSectionOverrides {
  if (typeof window === "undefined") return {};
  return mergeLayoutSectionOverrides(getCachedGlobalAdminConfig(), getDeviceAdminConfig());
}

export function getEffectiveLayoutSectionOverride(
  page: LayoutPageId,
  sectionId: string,
): LayoutSectionOverride {
  return getEffectiveLayoutSectionOverrides()[page]?.[sectionId] ?? {};
}

export function getBaseLayoutSectionLabel(page: LayoutPageId, sectionId: string): string {
  return BIXBO_LAYOUT_SECTIONS[page]?.find((section) => section.id === sectionId)?.label ?? sectionId;
}

export function getEffectiveLayoutSectionLabel(page: LayoutPageId, sectionId: string): string {
  return getEffectiveLayoutSectionOverride(page, sectionId).label?.trim() || getBaseLayoutSectionLabel(page, sectionId);
}

export function isEffectiveLayoutSectionVisible(page: LayoutPageId, sectionId: string): boolean {
  return getEffectiveLayoutSectionOverride(page, sectionId).hidden !== true;
}

export function withLayoutSectionOverride(
  config: AdminConfig,
  page: LayoutPageId,
  sectionId: string,
  patch: LayoutSectionOverride,
): AdminConfig {
  const current = layoutSectionOverridesFromConfig(config);
  const next: ExtendedAdminConfig = {
    ...config,
    enabled: true,
    layoutSections: {
      ...current,
      [page]: {
        ...(current[page] ?? {}),
        [sectionId]: {
          ...(current[page]?.[sectionId] ?? {}),
          ...patch,
        },
      },
    },
  };
  return next;
}

export function withoutLayoutSectionOverride(
  config: AdminConfig,
  page: LayoutPageId,
  sectionId: string,
): AdminConfig {
  const current = layoutSectionOverridesFromConfig(config);
  const pageSections = { ...(current[page] ?? {}) };
  delete pageSections[sectionId];
  const layoutSections: LayoutSectionOverrides = { ...current };
  if (Object.keys(pageSections).length) layoutSections[page] = pageSections;
  else delete layoutSections[page];
  return { ...(config as ExtendedAdminConfig), layoutSections } as AdminConfig;
}

export function withoutPageLayoutOverrides(config: AdminConfig, page: LayoutPageId): AdminConfig {
  const current = layoutSectionOverridesFromConfig(config);
  const layoutSections: LayoutSectionOverrides = { ...current };
  delete layoutSections[page];
  const layoutOrder = { ...(config.layoutOrder ?? {}) };
  delete layoutOrder[page];
  return { ...(config as ExtendedAdminConfig), layoutSections, layoutOrder } as AdminConfig;
}
