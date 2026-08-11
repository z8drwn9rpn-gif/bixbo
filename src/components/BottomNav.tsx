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
    <nav
      className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-[#cbd3a7]/90 bg-[#edf0c8] pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden dark:border-border/70 dark:bg-[#303827]"
      style={{
        boxShadow:
          "0 -10px 28px -18px rgba(52,67,28,.55), inset 0 1px 0 rgba(255,255,255,.78), inset 0 12px 26px rgba(255,255,255,.18)",
      }}
    >
      <ul className="mx-auto flex min-h-[92px] w-full items-end justify-around gap-0 px-2 pb-2 pt-2 sm:px-4 landscape:min-h-[82px] landscape:py-1.5">
        {items.map((item) => {
          const Icon = ICONS[item.id];
          const label = item.label ?? BIXBO_NAVIGATION.find((candidate) => candidate.id === item.id)?.label ?? item.id;

          if (item.action === "log") {
            return (
              <li key={item.id} className="flex min-w-0 flex-1 justify-center">
                <button
                  type="button"
                  onClick={openLog}
                  className="flex min-h-[78px] w-full flex-col items-center justify-end gap-0 px-1 pb-0.5 text-[11px] font-semibold text-[#435225] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:text-[#dce7b8] landscape:min-h-[68px]"
                  aria-label={t(label)}
                >
                  <Icon
                    size={68}
                    className="-mb-1 shrink-0 drop-shadow-[0_7px_8px_rgba(59,74,31,0.28)] landscape:h-[58px] landscape:w-[58px]"
                  />
                  <span className="max-w-full truncate text-center leading-none">{t(label)}</span>
                </button>
              </li>
            );
          }

          const to = item.to ?? "/";
          const active =
            item.id === "overview"
              ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
              : to === "/"
                ? pathname === "/"
                : pathname.startsWith(to);

          return (
            <li key={item.id} className="flex min-w-0 flex-1 justify-center">
              <Link
                to={to as never}
                className={`flex min-h-[78px] w-full flex-col items-center justify-end gap-0 px-1 pb-0.5 text-[11px] font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] landscape:min-h-[68px] ${
                  active
                    ? "text-[#3f4f22] dark:text-[#e3edc4]"
                    : "text-[#4c5a30]/88 hover:text-[#34411f] dark:text-[#bdc99e] dark:hover:text-[#e3edc4]"
                }`}
              >
                <Icon
                  size={50}
                  className={`mb-0.5 shrink-0 drop-shadow-[0_6px_7px_rgba(59,74,31,0.24)] transition-transform landscape:h-[44px] landscape:w-[44px] ${
                    active ? "scale-[1.05]" : ""
                  }`}
                />
                <span className="max-w-full truncate text-center leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
