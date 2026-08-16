import { describe, expect, it } from "vitest";
import { countNoBowelMovements } from "../domain/bowel";
import type { DayLog } from "../storage";

describe("Bowel period summary", () => {
  it("counts only explicit no-bowel-movement records inside the visible range", () => {
    const dayLogs: Record<string, DayLog> = {
      "2026-08-14": {
        bowel: [
          { id: "none-1", time: "09:00", bristol: -1 },
          { id: "type-0", time: "12:00", bristol: 0 },
        ],
      },
      "2026-08-15": {
        bowel: [
          { id: "urinary", time: "10:00", bristol: -2, urinaryOnly: true, urinary: ["Frequent"] },
          { id: "none-2", time: "18:00", bristol: -1 },
        ],
      },
      "2026-08-16": {
        bowel: [{ id: "outside-range", time: "08:00", bristol: -1 }],
      },
    };

    expect(countNoBowelMovements(["2026-08-14", "2026-08-15"], dayLogs)).toBe(2);
  });
});
