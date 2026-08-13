import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIXBO — Calendar & daily overview" },
      { name: "description", content: "Track pain, panic attacks, cycle, meds, food and more — all on one calm calendar." },
      { property: "og:title", content: "BIXBO — Calendar & daily overview" },
      { property: "og:description", content: "Track pain, panic attacks, cycle, meds, food and more." },
    ],
  }),
  component: HomePage,
});
