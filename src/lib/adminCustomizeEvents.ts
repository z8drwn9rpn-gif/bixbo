export const ADMIN_CUSTOMIZE_REQUESTED = "bixbo:admin-customize-requested";

function visibleButton(selector: string): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
  return buttons.find((button) => {
    if (button.closest("[data-bixbo-admin-mode-toolbar]")) return false;
    const style = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }) ?? null;
}

export function requestAdminCustomizeCurrentPage() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.dispatchEvent(new CustomEvent(ADMIN_CUSTOMIZE_REQUESTED));

  window.requestAnimationFrame(() => {
    const pathname = window.location.pathname;
    const button = pathname.startsWith("/couple")
      ? visibleButton('[data-bixbo-couple-admin-ui].fixed > button')
      : visibleButton('[data-bixbo-admin-ui].fixed > button');

    button?.click();
  });
}
