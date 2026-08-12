import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { isoDate, json, loadBlob, newId, saveBlob } from "../data";

export default defineTool({
  name: "add_day_note",
  title: "Add day note",
  description: "Append a short note to a BIXBO calendar day.",
  inputSchema: {
    text: z.string().trim().min(1).describe("Note text."),
    date: z.string().optional().describe("Day in YYYY-MM-DD format. Defaults to today."),
    time: z.string().optional().describe("Optional HH:MM time label."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ text, date, time }, ctx) => {
    const day = isoDate(date);
    const blob = await loadBlob(ctx);
    const dayNotes = { ...(blob.dayNotes ?? {}) };
    const entry = { id: newId(), text, ...(time ? { time } : {}) };
    dayNotes[day] = [...(dayNotes[day] ?? []), entry];
    await saveBlob(ctx, { ...blob, dayNotes });
    return json({ date: day, added: entry, total: dayNotes[day].length });
  },
});
