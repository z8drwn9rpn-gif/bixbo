import { createFileRoute } from "@tanstack/react-router";
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
  component: CouplePage,
});
