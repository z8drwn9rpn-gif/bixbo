import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useI18n } from "@/hooks/useI18n";
import { DEVICE_ADMIN_CONFIG_CHANGED } from "@/lib/deviceAdminConfig";
import { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";
import {
  NavHomeIcon,
  NavOverviewIcon,
  NavCoupleIcon,
  NavNoteIcon,
  NavLogIcon,
  User,
  type IconProps,
} from "@/components/icons/BixboIcons";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: NavHomeIcon,
  overview: NavOverviewIcon,
  log: NavLogIcon,
  couple: NavCoupleIcon,
  notes: NavNoteIcon,
  healthProfile: User,
};


/** Desktop-only left navigation. Hidden below lg so the mobile UI is untouched. */
export function SideNav({ mascotSrc }: { mascotSrc: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();
  const [navRevision, setNavRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setNavRevision((value) => value + 1);
    window.addEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
    window.addEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    return () => {
      window.removeEventListener(DEVICE_ADMIN_CONFIG_CHANGED, refresh);
      window.removeEventListener(GLOBAL_ADMIN_CONFIG_CHANGED, refresh);
    };
  }, []);
  void navRevision;
  const navItems = resolvedNavigation("desktop");

  const openLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    } else {
      navigate({ to: "/", search: { log: 1 } as never });
    }
  };

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));



  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/70 bg-surface/80 px-3 py-5 backdrop-blur-xl lg:flex">
      <Link to="/" className="mb-6 flex items-center gap-3 px-2">
        <img
          src={mascotSrc}
          alt="BIXBO"
          draggable={false}
          className="h-11 w-auto max-w-[46px] select-none object-contain"
          style={{ filter: "none", opacity: 1, mixBlendMode: "normal" }}
        />
        <span className="font-serif text-2xl font-bold leading-none text-foreground">BIXBO</span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map((navItem) => {
            const Icon = ICONS[navItem.id];
            const label = navItem.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === navItem.id)?.label ?? navItem.id;
            if (navItem.action === "log") {
              return (
                <li key={navItem.id}>
                  <button type="button" onClick={openLog} className="mb-4 flex min-h-[68px] w-full items-center justify-center gap-2.5 rounded-2xl bg-tint px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border/70 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Icon size={50} className="-my-3 shrink-0 drop-shadow-lg" /> <span>{t(label)}</span>
                  </button>
                </li>
              );
            }
            const to = navItem.to ?? "/";
            return (
              <li key={navItem.id}>
                <Link to={to as never} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive(to) ? "bg-tint text-primary shadow-sm" : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"}`}>
                  <Icon size={40} className={`shrink-0 drop-shadow-sm transition-transform ${isActive(to) ? "scale-[1.04]" : ""}`} />
                  <span className="truncate">{t(label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
