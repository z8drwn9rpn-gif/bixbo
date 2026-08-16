import { createFileRoute } from "@tanstack/react-router";
import { handleProtectedResourceMetadata } from "@/lib/mcp/http";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: { handlers: {
    GET: ({ request }) => handleProtectedResourceMetadata(request),
    OPTIONS: ({ request }) => handleProtectedResourceMetadata(request),
  } },
});
