import { createFileRoute, Link } from "@tanstack/react-router";
import { CouplePage } from "@/features/couple/CouplePage";

export const Route = createFileRoute("/couple")({
  head: () => ({
    meta: [
      { title: "Bixbo Couple" },
      {
        name: "description",
        content: "Share and compare pain, tetany, panic and medication patterns with your partner.",
      },
      { property: "og:title", content: "Bixbo Couple" },
      {
        property: "og:description",
        content: "Private partner sharing for selected health categories.",
      },
    ],
  }),
  component: CoupleRoutePage,
});

function CoupleRoutePage() {
  return (
    <>
      <CouplePage />
      <Link
        to="/settings"
        className="fixed right-4 z-40 rounded-full bg-surface/95 px-3 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        aria-label="Couple settings"
      >
        Settings
      </Link>
    </>
  );
}
