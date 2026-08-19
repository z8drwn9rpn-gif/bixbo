import { Link } from "@tanstack/react-router";
import { useProfilePageModel } from "./useProfilePageModel";
import { ProfilePageSpecialViews } from "./ProfilePageSpecialViews";

export function ProfilePage() {
  const model = useProfilePageModel();

  return (
    <div className="relative">
      <ProfilePageSpecialViews model={model} />
      {model.healthView === "hub" ? (
        <div className="fixed right-4 top-[max(0.65rem,env(safe-area-inset-top))] z-40 flex items-center gap-2 lg:right-8">
          <Link
            to="/meds"
            aria-label="Manage medications"
            className="inline-flex min-h-9 items-center rounded-full border border-border/80 bg-surface/95 px-3 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Manage meds
          </Link>
          <Link
            to="/diagnostics"
            aria-label="App diagnostics"
            className="inline-flex min-h-9 items-center rounded-full border border-border/80 bg-surface/95 px-3 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            App scan
          </Link>
        </div>
      ) : null}
    </div>
  );
}
