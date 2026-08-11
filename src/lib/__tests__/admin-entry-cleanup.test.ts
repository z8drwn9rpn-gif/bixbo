import { describe, expect, it } from "bun:test";
import { pruneOrphanedAdminFields, type DayLog } from "../storage";

describe("supplementary admin entry cleanup", () => {
  it("removes linked records when their core entry was deleted", () => {
    const log: DayLog = {
      pain: [{ id: "pain-kept", time: "09:00", score: 2, parts: [], quality: [], symptoms: [], note: "" }],
      adminFields: {
        pain: [
          { id: "a", time: "09:00", sourceEntryId: "pain-kept", values: { custom: 2 } },
          { id: "b", time: "10:00", sourceEntryId: "pain-deleted", values: { custom: 8 } },
          { id: "legacy", time: "11:00", values: { custom: 4 } },
        ],
      },
    };
    const cleaned = pruneOrphanedAdminFields(log);
    expect(cleaned.adminFields?.pain.map((entry) => entry.id)).toEqual(["a", "legacy"]);
  });

  it("does not prune day-level or unknown-feature supplementary values", () => {
    const log: DayLog = { adminFields: { period: [{ id: "p", time: "09:00", sourceEntryId: "legacy-day-link", values: { custom: true } }] } };
    expect(pruneOrphanedAdminFields(log).adminFields?.period).toEqual(log.adminFields?.period);
  });
});
