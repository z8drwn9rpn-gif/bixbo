import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useI18n } from "@/hooks/useI18n";
import { NavHomeIcon, NavOverviewIcon, NavCoupleIcon, NavNoteIcon, NavLogIcon, type IconProps } from "@/components/icons/BixboIcons";
import { DEVICE_ADMIN_CONFIG_CHANGED } from "@/lib/deviceAdminConfig";
import { GLOBAL_ADMIN_CONFIG_CHANGED } from "@/lib/globalAdminConfig";
import { BIXBO_NAVIGATION, resolvedNavigation, type NavigationItemId } from "@/lib/navigationRegistry";

const ICONS: Record<NavigationItemId, ComponentType<IconProps>> = {
  home: NavHomeIcon,
  overview: NavOverviewIcon,
  log: NavLogIcon,
  couple: NavCoupleIcon,
  notes: NavNoteIcon,
  healthProfile: NavHomeIcon,
};


export function BottomNav() {
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
  const items = resolvedNavigation("mobile");

  const openLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    } else {
      navigate({ to: "/", search: { log: 1 } as never });
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 lg:hidden z-40 mx-auto w-full max-w-[560px] border-t border-border/80 bg-surface/95 backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.22)] landscape:max-w-none">
      <ul className="mx-auto flex items-stretch justify-around gap-0.5 px-2 pt-2.5 pb-2.5 lg:max-w-3xl">
        {items.map((item) => {
          const Icon = ICONS[item.id];
          const label = item.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === item.id)?.label ?? item.id;
          if (item.action === "log") {
            return (
              <li key={item.id} className="flex-1">
                <button type="button" onClick={openLog} className="flex min-h-14 w-full -translate-y-1 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-semibold text-primary transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t(label)}>
                  <Icon size={62} className="drop-shadow-lg transition-transform active:scale-95" />
                  <span className="-mt-0.5 max-w-full truncate leading-none">{t(label)}</span>
                </button>
              </li>
            );
          }
          const to = item.to ?? "/";
          const active = item.id === "overview"
            ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
            : to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={item.id} className="flex-1">
              <Link to={to as never} className={`flex min-h-14 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon size={42} className={`shrink-0 drop-shadow-sm transition-transform ${active ? "scale-[1.04]" : ""}`} />
                <span className="mt-0.5 max-w-full truncate text-center leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
