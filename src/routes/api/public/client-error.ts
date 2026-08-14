import { createFileRoute } from "@tanstack/react-router";

const MAX_BODY_BYTES = 2_048;
const ALLOWED_SOURCES = new Set(["window-error", "unhandled-rejection", "route-error"]);

type ClientErrorEnvelope = {
  source?: unknown;
  name?: unknown;
  path?: unknown;
  build?: unknown;
};

function cleanToken(value: unknown, max = 120): string {
  return typeof value === "string" ? value.replace(/[\r\n\t]/g, " ").slice(0, max) : "";
}

async function handle(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: ClientErrorEnvelope;
  try {
    body = await request.json() as ClientErrorEnvelope;
  } catch {
    return new Response(null, { status: 400 });
  }

  const source = cleanToken(body.source, 32);
  if (!ALLOWED_SOURCES.has(source)) return new Response(null, { status: 400 });

  const name = cleanToken(body.name, 80) || "Error";
  const path = cleanToken(body.path, 160).split("?")[0].split("#")[0] || "/";
  const build = cleanToken(body.build, 64);

  // Deliberately do not accept error messages, stacks, health values, note text,
  // user IDs, emails, query strings or arbitrary metadata. Cloudflare Worker
  // observability receives only this coarse crash fingerprint.
  console.error("BIXBO_CLIENT_ERROR", { source, name, path, build });
  return new Response(null, { status: 204 });
}

export const Route = createFileRoute("/api/public/client-error")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
