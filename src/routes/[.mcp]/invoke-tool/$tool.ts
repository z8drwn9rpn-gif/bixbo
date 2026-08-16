import { createFileRoute } from "@tanstack/react-router";
import { handleInvokeTool } from "@/lib/mcp/http";

export const Route = createFileRoute("/.mcp/invoke-tool/$tool")({
  server: { handlers: {
    POST: ({ request, params }) => handleInvokeTool(request, params.tool),
    OPTIONS: ({ request, params }) => handleInvokeTool(request, params.tool),
  } },
});
