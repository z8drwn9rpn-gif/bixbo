import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { isoDate, json, loadBlob, noteText } from "../data";

export default defineTool({
  name: "get_day_log",
  title: "Get day log",
  description: "Read the BIXBO diary entry for one day: symptoms, notes, todos and taken medications.",
  inputSchema: {
    date: z.string().optional().describe("Day in YYYY-MM-DD format. Defaults to today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    const day = isoDate(date);
    const blob = await loadBlob(ctx);
    const medsById = new Map((blob.meds ?? []).map((m) => [m.id, m.name]));
    const takenIds = Object.entries(blob.medLog?.[day] ?? {})
      .filter(([, taken]) => taken)
      .map(([id]) => medsById.get(id) ?? id);

    return json({
      date: day,
      log: blob.dayLogs?.[day] ?? {},
      notes: (blob.dayNotes?.[day] ?? []).map(noteText),
      todos: blob.todos?.[day] ?? [],
      medsTaken: takenIds,
    });
  },
});
