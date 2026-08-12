import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { json, loadBlob, newId, saveBlob } from "../data";

export default defineTool({
  name: "create_note",
  title: "Create notebook note",
  description: "Create a new note in the private BIXBO notebook.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Note title."),
    content: z.string().optional().describe("Note body text."),
    folderId: z.string().optional().describe("Folder id from list_notes. Defaults to 'general'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content, folderId }, ctx) => {
    const blob = await loadBlob(ctx);
    const folders = blob.folders ?? [];
    const folder = folderId && folders.some((f) => f.id === folderId) ? folderId : folders[0]?.id ?? "general";
    const note = {
      id: newId(),
      folderId: folder,
      title,
      content: content ?? "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveBlob(ctx, { ...blob, notebook: [note, ...(blob.notebook ?? [])] });
    return json({ created: note });
  },
});
