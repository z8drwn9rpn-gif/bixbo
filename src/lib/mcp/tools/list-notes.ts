import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { json, loadBlob } from "../data";

export default defineTool({
  name: "list_notes",
  title: "List notebook notes",
  description: "List notes from the private BIXBO notebook, optionally filtered by folder or a text query.",
  inputSchema: {
    query: z.string().optional().describe("Case-insensitive text to match in title or content."),
    folderId: z.string().optional().describe("Only return notes in this folder id."),
    limit: z.number().int().min(1).max(100).optional().describe("Max notes to return. Default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, folderId, limit }, ctx) => {
    const blob = await loadBlob(ctx);
    const needle = query?.trim().toLowerCase();
    const notes = (blob.notebook ?? [])
      .filter((n) => !n.archived)
      .filter((n) => (folderId ? n.folderId === folderId : true))
      .filter((n) =>
        needle ? `${n.title} ${n.content}`.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
      .slice(0, limit ?? 20)
      .map((n) => ({
        id: n.id,
        folderId: n.folderId,
        title: n.title,
        content: n.content,
        updatedAt: new Date(n.updatedAt ?? n.createdAt).toISOString(),
      }));

    return json({ folders: blob.folders ?? [], count: notes.length, notes });
  },
});
