import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CouplePage } from "@/features/couple/CouplePage";
import { CoupleSettings } from "@/features/couple/CoupleSettings";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  if (settingsOpen) return <CoupleSettings onBack={() => setSettingsOpen(false)} />;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openSettings}
        aria-label="Couple settings"
        className="fixed right-4 top-[max(12px,env(safe-area-inset-top))] z-50 inline-flex min-h-9 items-center justify-center rounded-full border border-border/80 bg-background/90 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md lg:right-8"
      >
        Settings
      </button>
      <CouplePage onOpenSettings={openSettings} />
    </div>
  );
}
