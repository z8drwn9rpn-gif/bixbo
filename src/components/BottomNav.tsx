import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { useI18n } from "@/hooks/useI18n";
import { NavHomeIcon, NavOverviewIcon, NavCoupleIcon, NavNoteIcon, NavLogIcon, type IconProps } from "@/components/icons/BixboIcons";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
};

const items: NavItem[] = [
  { to: "/", label: "nav.home", icon: NavHomeIcon },
  { to: "/insights", label: "nav.overview", icon: NavOverviewIcon },
  { to: "/couple", label: "nav.couple", icon: NavCoupleIcon },
  { to: "/notes", label: "nav.note", icon: NavNoteIcon },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();

  const openLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    } else {
      navigate({ to: "/", search: { log: 1 } as never });
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[560px] px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden landscape:max-w-none">
      <ul className="mx-auto flex items-stretch justify-around gap-0.5 rounded-[30px] bg-tint/95 px-2 pt-2.5 pb-2.5 ring-1 ring-border/60 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(38,48,23,0.35)] lg:max-w-3xl">

        {items.slice(0, 2).map(({ to, label, icon: Icon }) => {
          const active =
            to === "/insights"
              ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
              : to === "/"
                ? pathname === "/"
                : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex min-h-14 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={42} className={`shrink-0 drop-shadow-sm transition-transform ${active ? "scale-[1.04]" : ""}`} />
                <span className="mt-0.5 max-w-full truncate text-center leading-none">{t(label)}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={openLog}
            className="flex min-h-14 w-full -translate-y-1 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-semibold text-primary transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("nav.log")}
          >
            <NavLogIcon size={62} className="drop-shadow-lg transition-transform active:scale-95" />
            <span className="-mt-0.5 leading-none">{t("nav.log")}</span>
          </button>
        </li>

        {items.slice(2).map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex min-h-14 flex-col items-center justify-center gap-0 rounded-2xl px-1.5 py-1 text-[11.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
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
