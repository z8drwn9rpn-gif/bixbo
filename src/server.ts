import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com https://appleid.apple.com",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://wgdydwttzsveevkljkmr.supabase.co wss://wgdydwttzsveevkljkmr.supabase.co https://*.supabase.co wss://*.supabase.co",
  "frame-src https://accounts.google.com https://appleid.apple.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

function withSecurityHeaders(response: Response): Response {
  const hardened = new Response(response.body, response);
  hardened.headers.set("X-Content-Type-Options", "nosniff");
  hardened.headers.set("X-Frame-Options", "DENY");
  hardened.headers.set("Referrer-Policy", "no-referrer");
  hardened.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  hardened.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  hardened.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);

  // Never let a browser/PWA keep an old SSR document across deployments. The
  // immutable hashed /assets files are still cached by the static asset layer.
  if ((hardened.headers.get("content-type") ?? "").includes("text/html")) {
    hardened.headers.set("Cache-Control", "no-store, max-age=0");
    hardened.headers.set("Pragma", "no-cache");
  }

  return hardened;
}

function withRequestTrace(response: Response, request: Request, startedAt: number): Response {
  const traced = withSecurityHeaders(response);
  const durationMs = Math.max(0, Date.now() - startedAt);
  traced.headers.append("Server-Timing", `bixbo;dur=${durationMs}`);

  const traceId = request.headers.get("x-bixbo-trace") ?? "";
  if (/^[A-Za-z0-9._-]{1,80}$/.test(traceId)) {
    traced.headers.set("X-Bixbo-Trace", traceId);
  }
  return traced;
}

function missingBuildAssetResponse(request: Request): Response | null {
  let pathname: string;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    return null;
  }

  // Cloudflare serves existing static assets before invoking this Worker. If a
  // hashed asset from an older deployment is gone, however, it falls through to
  // the Worker. Do not SSR that URL as text/html: module scripts reject HTML and
  // Safari reports the misleading MIME-type error seen in the app scanner.
  if (!pathname.startsWith("/assets/")) return null;

  const contentType = pathname.endsWith(".css")
    ? "text/css; charset=utf-8"
    : /\.(?:m?js)$/.test(pathname)
      ? "application/javascript; charset=utf-8"
      : "application/octet-stream";

  return new Response(null, {
    status: 404,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const startedAt = Date.now();
    try {
      const missingAsset = missingBuildAssetResponse(request);
      if (missingAsset) return withRequestTrace(missingAsset, request, startedAt);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withRequestTrace(await normalizeCatastrophicSsrResponse(response), request, startedAt);
    } catch (error) {
      console.error(error);
      return withRequestTrace(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
        startedAt,
      );
    }
  },
};