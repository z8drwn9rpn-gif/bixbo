import { createFileRoute } from "@tanstack/react-router";
import { handleListTools } from "@/lib/mcp/http";

export const Route = createFileRoute("/.mcp/list-tools")({
  server: { handlers: {
    GET: ({ request }) => handleListTools(request),
    POST: ({ request }) => handleListTools(request),
    OPTIONS: ({ request }) => handleListTools(request),
  } },
});
