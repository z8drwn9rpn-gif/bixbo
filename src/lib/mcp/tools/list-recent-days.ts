import { defineTool } from "../core";
import { z } from "zod";
import { json, loadBlob, noteText } from "../data";

export default defineTool({
  name: "list_recent_days", title: "List recent days",
  description: "Summarise the most recent BIXBO days that have any diary activity (pain, period, notes, todos).",
  inputSchema: { days: z.number().int().min(1).max(90).optional().describe("How many recent logged days to return. Default 14.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const limit = days ?? 14;
    const blob = await loadBlob(ctx);
    const dates = new Set<string>([...Object.keys(blob.dayLogs ?? {}), ...Object.keys(blob.dayNotes ?? {}), ...Object.keys(blob.todos ?? {})]);
    const items = [...dates].sort((a, b) => b.localeCompare(a)).slice(0, limit).map((date) => {
      const log = (blob.dayLogs?.[date] ?? {}) as Record<string, unknown>;
      const pain = Array.isArray(log.pain) ? (log.pain as Array<{ level?: number }>) : [];
      const todos = blob.todos?.[date] ?? [];
      return { date, painLevels: pain.map((p) => p.level).filter((l) => typeof l === "number"), period: typeof log.period === "string" ? log.period : undefined, temperature: log.temperature, weight: log.weight, sleepHours: log.sleepHours, notes: (blob.dayNotes?.[date] ?? []).map(noteText), openTodos: todos.filter((t) => !t.done).map((t) => t.text) };
    });
    return json({ count: items.length, days: items });
  },
});
