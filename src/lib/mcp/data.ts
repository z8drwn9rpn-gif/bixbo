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

const ROW_VERSION = Symbol("bixbo-mcp-row-version");
type VersionedBlob = BixboBlob & { [ROW_VERSION]?: string | null };

function attachRowVersion(blob: BixboBlob, updatedAt: string | null): BixboBlob {
  Object.defineProperty(blob, ROW_VERSION, {
    value: updatedAt,
    configurable: true,
    // MCP write tools update blobs with object spread. Enumerable symbol keys are
    // copied by spread, so the compare-and-swap token survives that immutable
    // update while still being ignored by JSON serialization.
    enumerable: true,
    writable: true,
  });
  return blob;
}

function cleanBlob(blob: BixboBlob): BixboBlob {
  const payload = { ...blob } as VersionedBlob;
  delete payload[ROW_VERSION];
  return payload;
}

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
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ToolError(error.message);

  const blob = ((data?.data as BixboBlob | null) ?? {}) as BixboBlob;
  return attachRowVersion(blob, data?.updated_at ?? null);
}

/**
 * Persist a blob only if the row is still the version that `loadBlob` read.
 *
 * BIXBO's normal app sync already performs a conflict-safe merge. MCP tools,
 * however, read and write the whole JSON document. Without optimistic locking,
 * a simultaneous iPhone/cloud write could be overwritten by an older MCP copy.
 * The database `updated_at` trigger gives us a cheap compare-and-swap token.
 */
export async function saveBlob(ctx: ToolContext, blob: BixboBlob): Promise<void> {
  const userId = requireUser(ctx);
  const supabase = supabaseForUser(ctx);
  const expectedUpdatedAt = (blob as VersionedBlob)[ROW_VERSION] ?? null;
  const payload = cleanBlob(blob);

  if (expectedUpdatedAt) {
    const { data, error } = await supabase
      .from("user_data")
      .update({ data: payload, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("updated_at", expectedUpdatedAt)
      .select("updated_at")
      .maybeSingle();

    if (error) throw new ToolError(error.message);
    if (!data) {
      throw new ToolError(
        "BIXBO data changed on another device while this tool was running. Nothing was overwritten; please retry the action.",
      );
    }

    attachRowVersion(blob, data.updated_at);
    return;
  }

  const { data, error } = await supabase
    .from("user_data")
    .insert({ user_id: userId, data: payload, updated_at: new Date().toISOString() })
    .select("updated_at")
    .maybeSingle();

  if (error) {
    // 23505 means another writer created the row after this tool loaded it.
    if (error.code === "23505") {
      throw new ToolError(
        "BIXBO data changed on another device while this tool was running. Nothing was overwritten; please retry the action.",
      );
    }
    throw new ToolError(error.message);
  }

  attachRowVersion(blob, data?.updated_at ?? null);
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
