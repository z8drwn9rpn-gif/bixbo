import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, StickyNote, Activity, Users, Plus, Brain, Pill, User, Settings } from "lucide-react";

const main = [
  { to: "/", label: "Home", icon: Home },
  { to: "/insights", label: "Insights", icon: Activity },
  { to: "/patterns", label: "Patterns", icon: Brain },
  { to: "/couple", label: "Bixbo couple", icon: Users },
  { to: "/notes", label: "Bixbo Note", icon: StickyNote },
  { to: "/meds", label: "Medications", icon: Pill },
] as const;

const secondary = [
  { to: "/profile", label: "Health profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
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

  const item = (to: string, label: string, Icon: typeof Home) => (
    <li key={to}>
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive(to)
            ? "bg-tint text-primary shadow-sm"
            : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        }`}
      >
        <Icon className={`h-5 w-5 ${isActive(to) ? "stroke-[2.4]" : ""}`} />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/70 bg-surface/80 px-3 py-5 backdrop-blur-xl lg:flex">
      <Link to="/" className="mb-6 flex items-center gap-3 px-2">
        <img
          src="/bixbo-mascot.png"
          alt="BIXBO"
          draggable={false}
          className="h-11 w-auto max-w-[46px] select-none object-contain"
          style={{ filter: "none", opacity: 1, mixBlendMode: "normal" }}
        />
        <span className="font-serif text-2xl font-bold leading-none text-foreground">BIXBO</span>
      </Link>

      <button
        onClick={openLog}
        className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" strokeWidth={2.8} /> Log
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-1">{main.map((i) => item(i.to, i.label, i.icon))}</ul>
        <div className="my-4 border-t border-border/70" />
        <ul className="flex flex-col gap-1">{secondary.map((i) => item(i.to, i.label, i.icon))}</ul>
      </nav>
    </aside>
  );
}
