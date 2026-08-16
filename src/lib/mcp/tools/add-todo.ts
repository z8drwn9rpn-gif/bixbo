import { defineTool } from "../core";
import { z } from "zod";
import { isoDate, json, loadBlob, newId, saveBlob } from "../data";

export default defineTool({
  name: "add_todo", title: "Add todo", description: "Add a to-do item to a BIXBO calendar day.",
  inputSchema: { text: z.string().trim().min(1).describe("What needs to be done."), date: z.string().optional().describe("Day in YYYY-MM-DD format. Defaults to today.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ text, date }, ctx) => {
    const day = isoDate(date); const blob = await loadBlob(ctx); const todos = { ...(blob.todos ?? {}) };
    const item = { id: newId(), text, done: false }; todos[day] = [...(todos[day] ?? []), item];
    await saveBlob(ctx, { ...blob, todos }); return json({ date: day, added: item, total: todos[day].length });
  },
});
