import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  NavHomeIcon,
  NavOverviewIcon,
  NavCoupleIcon,
  NavNoteIcon,
  NavLogIcon,
  User,
  type IconProps,
} from "@/components/icons/BixboIcons";

const main = [
  { to: "/", label: "Home", icon: NavHomeIcon },
  { to: "/insights", label: "Overview", icon: NavOverviewIcon },
  { to: "/couple", label: "Couple", icon: NavCoupleIcon },
  { to: "/notes", label: "Note", icon: NavNoteIcon },
] as const;

const secondary = [
  { to: "/profile", label: "Health profile", icon: User },
] as const;

/** Desktop-only left navigation. Hidden below lg so the mobile UI is untouched. */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const openLog = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("bixbo:open-log"));
    } else {
      navigate({ to: "/", search: { log: 1 } as never });
    }
  };

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const item = (to: string, label: string, Icon: ComponentType<IconProps>) => (
    <li key={to}>
      <Link
        to={to as never}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive(to)
            ? "bg-tint text-primary shadow-sm"
            : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        }`}
      >
        <Icon size={40} className={`shrink-0 drop-shadow-sm transition-transform ${isActive(to) ? "scale-[1.04]" : ""}`} />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/70 bg-surface/80 px-3 py-5 backdrop-blur-xl lg:flex">
      <Link to="/" className="mb-6 flex items-center gap-3 px-2">
        <img
          src="/bixbo-mascot.png?v=20260810a"
          alt="BIXBO"
          draggable={false}
          className="h-11 w-auto max-w-[46px] select-none object-contain"
          style={{ filter: "none", opacity: 1, mixBlendMode: "normal" }}
        />
        <span className="font-serif text-2xl font-bold leading-none text-foreground">BIXBO</span>
      </Link>

      <button
        type="button"
        onClick={openLog}
        className="mb-5 flex min-h-[68px] items-center justify-center gap-2.5 rounded-2xl bg-tint px-4 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border/70 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <NavLogIcon size={50} className="-my-3 shrink-0 drop-shadow-lg" /> <span>Log</span>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">{main.map((i) => item(i.to, i.label, i.icon))}</ul>
        <div className="my-4 border-t border-border/70" />
        <ul className="flex flex-col gap-1">{secondary.map((i) => item(i.to, i.label, i.icon))}</ul>
      </nav>
    </aside>
  );
}
