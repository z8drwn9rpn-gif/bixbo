export const ADMIN_CUSTOMIZE_REQUESTED = "bixbo:admin-customize-requested";

export function requestAdminCustomizeCurrentPage() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_CUSTOMIZE_REQUESTED));
}
