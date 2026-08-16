import { createFileRoute } from "@tanstack/react-router";
import { handleMcp } from "@/lib/mcp/http";

export const Route = createFileRoute("/mcp" as never)({
  server: {
    handlers: {
      GET: ({ request }) => handleMcp(request),
      POST: ({ request }) => handleMcp(request),
      OPTIONS: ({ request }) => handleMcp(request),
    },
  },
});
