import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, StickyNote, Activity, Users, Plus } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/insights", label: "Insights", icon: Activity },
  { to: "/couple", label: "Couple", icon: Users },
  { to: "/notes", label: "Notes", icon: StickyNote },
] as const;

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
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[560px] -translate-x-1/2 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] landscape:max-w-none"
      style={{ willChange: "transform", transform: "translate3d(-50%, 0, 0)" }}
    >
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            onClick={openLog}
            className="flex w-full flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold text-primary hover:text-foreground"
            aria-label="Log"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow">
              <Plus className="h-5 w-5" strokeWidth={2.8} />
            </span>
            <span>Log</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
