import { Link } from "@tanstack/react-router";
import { useProfilePageModel } from "./useProfilePageModel";
import { ProfilePageSpecialViews } from "./ProfilePageSpecialViews";

export function ProfilePage() {
  const model = useProfilePageModel();

  return (
    <div className="relative">
      <ProfilePageSpecialViews model={model} />
      {model.healthView === "hub" ? (
        <Link
          to="/diagnostics"
          aria-label="App diagnostics"
          className="fixed right-4 top-[max(0.65rem,env(safe-area-inset-top))] z-40 inline-flex min-h-9 items-center rounded-full border border-border/80 bg-surface/95 px-3 text-xs font-bold text-primary shadow-sm backdrop-blur-md transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:right-8"
        >
          App scan
        </Link>
      ) : null}
    </div>
  );
}
