import { defineTool } from "../core";
import { z } from "zod";
import { isoDate, json, loadBlob } from "../data";

export default defineTool({
  name: "list_medications", title: "List medications", description: "List the BIXBO medication schedule and which doses were marked as taken on a day.",
  inputSchema: { date: z.string().optional().describe("Day in YYYY-MM-DD format for the taken/missed status. Defaults to today.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    const day = isoDate(date); const blob = await loadBlob(ctx); const taken = blob.medLog?.[day] ?? {};
    const meds = (blob.meds ?? []).map((m) => ({ id: m.id, name: m.name, dose: m.dose, times: m.times ?? [], asNeeded: Boolean(m.asNeeded), takenToday: Boolean(taken[m.id]) }));
    return json({ date: day, count: meds.length, medications: meds });
  },
});
