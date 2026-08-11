import { describe, expect, it } from "bun:test";
import type { CustomLogEntry } from "../storage";

describe("supplementary core entry links", () => {
  it("keeps legacy records compatible and supports linked edits", () => {
    const legacy: CustomLogEntry = { id: "a", time: "09:00", values: { score: 3 } };
    const linked: CustomLogEntry = { id: "b", time: "09:00", values: { score: 4 }, sourceEntryId: "pain-1" };

    expect(legacy.sourceEntryId).toBeUndefined();
    expect(linked.sourceEntryId).toBe("pain-1");
  });
});
