import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

/** Loose view of the app's stored diary blob — MCP only touches a few fields. */
export type BixboBlob = {
  dayLogs?: Record<string, Record<string, unknown>>;
  dayNotes?: Record<string, Array<{ id?: string; text: string; time?: string } | string>>;
  todos?: Record<string, Array<{ id: string; text: string; done: boolean }>>;
  meds?: Array<{ id: string; name: string; dose?: string; times?: string[]; asNeeded?: boolean; note?: string }>;
  medLog?: Record<string, Record<string, boolean>>;
  folders?: Array<{ id: string; name: string; icon?: string }>;
  notebook?: Array<{
    id: string;
    folderId: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt?: number;
    pinned?: boolean;
    archived?: boolean;
  }>;
  [key: string]: unknown;
};

export function requireUser(ctx: ToolContext): string {
  if (!ctx.isAuthenticated()) throw new ToolError("Not signed in to BIXBO.");
  const userId = ctx.getUserId();
  if (!userId) throw new ToolError("Could not resolve the signed-in BIXBO user.");
  return userId;
}

export async function loadBlob(ctx: ToolContext): Promise<BixboBlob> {
  const userId = requireUser(ctx);
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ToolError(error.message);
  return ((data?.data as BixboBlob | null) ?? {}) as BixboBlob;
}

export async function saveBlob(ctx: ToolContext, blob: BixboBlob): Promise<void> {
  const userId = requireUser(ctx);
  const supabase = supabaseForUser(ctx);
  const { error } = await supabase
    .from("user_data")
    .upsert({ user_id: userId, data: blob, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new ToolError(error.message);
}

export function isoDate(value?: string): string {
  const date = value?.trim() ? value.trim() : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ToolError(`Invalid date "${date}" — use YYYY-MM-DD.`);
  return date;
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `mcp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function noteText(entry: { text: string } | string): string {
  return typeof entry === "string" ? entry : entry.text;
}

export function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}
