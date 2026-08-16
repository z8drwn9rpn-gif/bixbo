import { createClient } from "@supabase/supabase-js";
import mcp from "./index";
import { ToolError, toolDescriptors, type ToolContext, type ToolResult } from "./core";
import { supabaseProjectUrl, supabasePublishableKey } from "./supabase";

const CURRENT_PROTOCOL = "2026-07-28";
const LEGACY_PROTOCOL = "2025-11-25";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version, WWW-Authenticate",
};

function headers(extra?: HeadersInit) {
  const result = new Headers(cors);
  result.set("Content-Type", "application/json; charset=utf-8");
  result.set("MCP-Protocol-Version", CURRENT_PROTOCOL);
  if (extra) new Headers(extra).forEach((value, key) => result.set(key, value));
  return result;
}

function response(body: unknown, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: headers(extra) });
}

function rpc(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: unknown, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || null;
}

async function authenticatedContext(request: Request): Promise<ToolContext> {
  const token = bearerToken(request);
  if (!token) throw new ToolError("Not signed in to BIXBO.");
  const key = supabasePublishableKey();
  const client = createClient(supabaseProjectUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new ToolError("The BIXBO session is invalid or expired.");
  const userId = data.user.id;
  return {
    isAuthenticated: () => true,
    getUserId: () => userId,
    getToken: () => token,
  };
}

function resourceMetadata(request: Request) {
  const origin = new URL(request.url).origin;
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [`${supabaseProjectUrl().replace(/\/+$/, "")}/auth/v1`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["authenticated"],
    resource_documentation: `${origin}/privacy`,
  };
}

export function handleProtectedResourceMetadata(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  return response(resourceMetadata(request));
}

export function handleListTools(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  return response({ tools: toolDescriptors(mcp) });
}

async function invoke(toolName: string, args: unknown, request: Request): Promise<ToolResult> {
  const tool = mcp.toolMap.get(toolName);
  if (!tool) throw new ToolError(`Unknown BIXBO tool "${toolName}".`);
  const context = await authenticatedContext(request);
  return tool.invoke(args ?? {}, context);
}

function authFailure(request: Request, id: unknown, message: string) {
  const metadata = `${new URL(request.url).origin}/.well-known/oauth-protected-resource`;
  return response(rpcError(id, -32001, message), 401, {
    "WWW-Authenticate": `Bearer resource_metadata="${metadata}"`,
  });
}

export async function handleInvokeTool(request: Request, toolName: string) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return response({ error: "Request body must be JSON." }, 400);
  }
  try {
    const result = await invoke(toolName, body.arguments ?? body.input ?? body, request);
    return response(result);
  } catch (error) {
    if (error instanceof ToolError && /signed in|session/i.test(error.message)) {
      return authFailure(request, null, error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    return response({ content: [{ type: "text", text: message }], isError: true }, error instanceof ToolError ? 400 : 500);
  }
}

type RpcRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

export async function handleMcp(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method === "GET") return response({ name: mcp.name, title: mcp.title, protocolVersion: CURRENT_PROTOCOL });
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  let body: RpcRequest;
  try {
    body = await request.json() as RpcRequest;
  } catch {
    return response(rpcError(null, -32700, "Parse error"), 400);
  }
  const id = body.id ?? null;
  const method = typeof body.method === "string" ? body.method : "";
  const params = body.params && typeof body.params === "object" ? body.params as Record<string, unknown> : {};

  if (method === "notifications/initialized") return new Response(null, { status: 202, headers: cors });
  if (method === "ping") return response(rpc(id, {}));
  if (method === "initialize") {
    const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : LEGACY_PROTOCOL;
    return response(rpc(id, {
      protocolVersion: requested === CURRENT_PROTOCOL ? CURRENT_PROTOCOL : LEGACY_PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: mcp.name, title: mcp.title, version: mcp.version },
      instructions: mcp.instructions,
    }));
  }
  if (method === "server/discover") {
    return response(rpc(id, {
      protocolVersion: CURRENT_PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: mcp.name, title: mcp.title, version: mcp.version },
      instructions: mcp.instructions,
    }));
  }
  if (method === "tools/list") return response(rpc(id, { tools: toolDescriptors(mcp) }));
  if (method === "tools/call") {
    const name = typeof params.name === "string" ? params.name : "";
    if (!name) return response(rpcError(id, -32602, "Missing tool name."), 400);
    try {
      const result = await invoke(name, params.arguments ?? {}, request);
      return response(rpc(id, result));
    } catch (error) {
      if (error instanceof ToolError && /signed in|session/i.test(error.message)) {
        return authFailure(request, id, error.message);
      }
      const message = error instanceof Error ? error.message : String(error);
      return response(rpc(id, { content: [{ type: "text", text: message }], isError: true }), error instanceof ToolError ? 200 : 500);
    }
  }

  return response(rpcError(id, -32601, `Method not found: ${method || "(empty)"}`), 404);
}
