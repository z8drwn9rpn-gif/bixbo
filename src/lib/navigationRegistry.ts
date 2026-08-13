export type NavigationItemId = "home" | "overview" | "log" | "couple" | "notes" | "healthProfile";
export type NavigationSurface = "mobile" | "desktop";

export type NavigationDefinition = {
  id: NavigationItemId;
  to?: string;
  label: string;
  order: number;
  desktopOrder?: number;
  mobile: boolean;
  desktop: boolean;
  action?: "log";
};

export const BIXBO_NAVIGATION: NavigationDefinition[] = [
  { id: "home", to: "/", label: "nav.home", order: 10, desktopOrder: 10, mobile: true, desktop: true },
  { id: "overview", to: "/insights", label: "nav.overview", order: 20, desktopOrder: 20, mobile: true, desktop: true },
  { id: "log", label: "nav.log", order: 30, desktopOrder: 0, mobile: true, desktop: true, action: "log" },
  { id: "couple", to: "/couple", label: "nav.couple", order: 40, desktopOrder: 40, mobile: true, desktop: true },
  { id: "notes", to: "/notes", label: "nav.note", order: 50, desktopOrder: 50, mobile: true, desktop: true },
  { id: "healthProfile", to: "/profile", label: "nav.healthProfile", order: 60, desktopOrder: 60, mobile: false, desktop: true },
];

export function resolvedNavigation(surface: NavigationSurface): NavigationDefinition[] {
  return BIXBO_NAVIGATION
    .filter((item) => (surface === "mobile" ? item.mobile : item.desktop))
    .sort((a, b) => {
      const aOrder = surface === "desktop" ? (a.desktopOrder ?? a.order) : a.order;
      const bOrder = surface === "desktop" ? (b.desktopOrder ?? b.order) : b.order;
      return aOrder - bOrder;
    });
}
