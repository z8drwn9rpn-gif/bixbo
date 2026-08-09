import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
  head: () => ({
    meta: [
      { title: "BIXBO — Health" },
      {
        name: "description",
        content: "Health profile, preferences, privacy, backup and app settings in BIXBO.",
      },
      { property: "og:title", content: "BIXBO — Health" },
      {
        property: "og:description",
        content: "Health profile and app preferences in one place.",
      },
    ],
  }),
  component: SettingsRedirectPage,
});

function SettingsRedirectPage() {
  return null;
}
