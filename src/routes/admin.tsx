import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
  component: RemovedAdminRoute,
});

function RemovedAdminRoute() {
  return null;
}
