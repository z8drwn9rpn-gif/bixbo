import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, StickyNote, Activity, Users, Plus, Brain } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/insights", label: "Insights", icon: Activity },
  { to: "/patterns", label: "Patterns", icon: Brain },
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
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[560px] border-t border-border/80 bg-surface/95 backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.22)] landscape:max-w-none">
      <ul className="flex items-stretch justify-around gap-1 px-2 pt-2 pb-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${active ? "stroke-[2.4] scale-110" : ""}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            onClick={openLog}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold text-primary transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Log"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5" strokeWidth={2.8} />
            </span>
            <span>Log</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
