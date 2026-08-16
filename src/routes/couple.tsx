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

  return <CouplePage onOpenSettings={openSettings} />;
}
