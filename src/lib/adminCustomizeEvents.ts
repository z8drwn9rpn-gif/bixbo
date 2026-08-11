export const ADMIN_CUSTOMIZE_REQUESTED = "bixbo:admin-customize-requested";

function desiredAdminEditor(): "primary" | "couple" | "hak" | "universal" {
  if (typeof window === "undefined" || typeof document === "undefined") return "universal";
  const pathname = window.location.pathname;
  if (pathname === "/" && document.querySelector("[data-bixbo-hak-root]")) return "hak";
  if (pathname.startsWith("/couple")) return "couple";
  if (pathname === "/" || pathname.startsWith("/insights") || pathname.startsWith("/patterns")) return "primary";
  return "universal";
}

export function requestAdminCustomizeCurrentPage() {
  if (typeof window === "undefined") return;

  const target = desiredAdminEditor();
  const trigger = document.querySelector<HTMLButtonElement>(`[data-bixbo-admin-open="${target}"]`);
  if (trigger) {
    trigger.click();
    return;
  }

  // Fallback for an editor that mounted between pointer-down and click.
  window.dispatchEvent(new CustomEvent(ADMIN_CUSTOMIZE_REQUESTED, { detail: { target } }));
}
