import { useEffect } from "react";
import {
  getEffectiveLayoutSectionOverride,
} from "@/lib/adminLayoutOverrides";
import { BIXBO_LAYOUT_SECTIONS, type LayoutPageId } from "@/lib/layoutRegistry";
import type { RegistryFeatureId, RegistrySurface } from "@/lib/appRegistry";

export const ADMIN_SURFACES: { id: RegistrySurface; label: string }[] = [
  { id: "log", label: "Log" },
  { id: "quickLog", label: "Quick Log" },
  { id: "calendar", label: "Calendar" },
  { id: "heatmap", label: "Heatmap" },
  { id: "monthly", label: "Monthly" },
  { id: "patterns", label: "Patterns" },
];

export const ADMIN_ICONS = ["🔥", "⚡", "✨", "🫐", "❤️", "♨️", "🍽️", "💩", "🧘🏼‍♀️", "🌡️", "💊", "📅", "✅", "📝", "🤱", "🤕", "🥵", "🌙"];
export type EditorTab = "page" | "features" | "fields" | "custom" | "publish";

const REQUIRED_CORE_FIELDS = new Set<string>(["event:title", "task:title", "note:text"]);
export function isRequiredCoreField(featureId: RegistryFeatureId, fieldId: string): boolean {
  return REQUIRED_CORE_FIELDS.has(`${featureId}:${fieldId}`);
}

function activePatternsPage(): LayoutPageId {
  if (typeof document === "undefined") return "patterns.monthly";
  const selected = document.querySelector<HTMLElement>('[data-bixbo-pattern-tab][aria-selected="true"]');
  const tab = selected?.dataset.bixboPatternTab;
  if (tab === "cycle" || tab === "monthly" || tab === "treatment" || tab === "triggers") {
    return `patterns.${tab}` as LayoutPageId;
  }
  return "patterns.monthly";
}

export function pageFromPath(pathname: string): LayoutPageId | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/patterns")) return activePatternsPage();
  return null;
}

export function pageSurface(page: LayoutPageId | null): RegistrySurface {
  if (page === "home") return "calendar";
  if (page === "insights") return "heatmap";
  return "patterns";
}

export function AdminLayoutDomRuntime({ page, revision }: { page: LayoutPageId; revision: number }) {
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
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,span,button,label"))
        .filter((element) => !element.closest("[data-bixbo-admin-ui]"));

      (BIXBO_LAYOUT_SECTIONS[page] ?? []).forEach((section) => {
        const override = getEffectiveLayoutSectionOverride(page, section.id);
        if (!override.label && override.hidden !== true) return;
        const labelElement = candidates.find((element) => element.children.length === 0 && element.textContent?.trim() === section.label.trim());
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
