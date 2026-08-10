import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { NavHomeIcon, NavOverviewIcon, NavCoupleIcon, NavNoteIcon, NavLogIcon, type IconProps } from "@/components/icons/BixboIcons";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
};

const items: NavItem[] = [
  { to: "/", label: "Home", icon: NavHomeIcon },
  { to: "/insights", label: "Overview", icon: NavOverviewIcon },
  { to: "/couple", label: "Couple", icon: NavCoupleIcon },
  { to: "/notes", label: "Note", icon: NavNoteIcon },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const openLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    } else {
      navigate({ to: "/", search: { log: 1 } as never });
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 lg:hidden z-40 mx-auto w-full max-w-[560px] border-t border-border/80 bg-surface/95 backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.22)] landscape:max-w-none">
      <ul className="mx-auto flex items-stretch justify-around gap-1 px-2 pt-2 pb-2 lg:max-w-3xl">

        {items.slice(0, 2).map(({ to, label, icon: Icon }) => {
          const active =
            label === "Overview"
              ? pathname.startsWith("/insights") || pathname.startsWith("/patterns")
              : to === "/"
                ? pathname === "/"
                : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={30} className={`transition-transform ${active ? "scale-110" : ""}`} />
                <span className="max-w-full truncate text-center leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            onClick={openLog}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-primary transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Log"
          >
            <NavLogIcon size={48} className="drop-shadow-md transition-transform active:scale-95" />
            <span>Log</span>
          </button>
        </li>

        {items.slice(2).map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to as never}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={30} className={`transition-transform ${active ? "scale-110" : ""}`} />
                <span className="max-w-full truncate text-center leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
