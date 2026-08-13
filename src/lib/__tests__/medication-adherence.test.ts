import { describe, expect, it } from "bun:test";

import { resolveScheduledDose, summarizeMedicationAdherence } from "../medicationAdherence";
import type { Med } from "../storage";

const med: Med = {
  id: "evening",
  name: "Omega-3 2x, Iron",
  times: ["18:00"],
};

describe("grouped scheduled medication adherence", () => {
  it("counts only the selected item in a partially taken group", () => {
    const medLog = { "2026-08-12": { "evening@18:00": true } };
    const medLogItems = { "2026-08-12": { "evening@18:00": ["Iron"] } };
    const now = new Date("2026-08-13T12:00:00");

    const state = resolveScheduledDose(med, "2026-08-12", "18:00", medLog, medLogItems, now);
    expect(state.selectedItems).toEqual(["Iron"]);
    expect(state.missedItems).toEqual(["Omega-3 2x"]);

    expect(summarizeMedicationAdherence(med, ["2026-08-12"], medLog, medLogItems, now)).toEqual({
      taken: 1,
      expected: 2,
      pct: 50,
    });
  });

  it("keeps old whole-group taken records backward compatible", () => {
    const medLog = { "2026-08-12": { "evening@18:00": true } };
    const now = new Date("2026-08-13T12:00:00");
    const state = resolveScheduledDose(med, "2026-08-12", "18:00", medLog, {}, now);
    expect(state.selectedItems).toEqual(["Omega-3 2x", "Iron"]);
  });

  it("excludes a not-yet-due dose today", () => {
    const now = new Date("2026-08-12T12:00:00");
    expect(summarizeMedicationAdherence(med, ["2026-08-12"], {}, {}, now)).toBeNull();
  });
});


it("domain meds facade preserves partial grouped doses", async () => {
  const { resolveScheduledDose: resolveFromDomain } = await import("../domain/meds");
  const domainMed: Med = { id: "supplements", name: "Omega-3 2x, Iron", times: ["15:00"] };
  const state = resolveFromDomain(
    domainMed,
    "2026-08-12",
    "15:00",
    { "2026-08-12": { "supplements@15:00": true } },
    { "2026-08-12": { "supplements@15:00": ["Iron"] } },
    new Date("2026-08-13T12:00:00"),
  );
  expect(state.allItems).toEqual(["Omega-3 2x", "Iron"]);
  expect(state.selectedItems).toEqual(["Iron"]);
  expect(state.missedItems).toEqual(["Omega-3 2x"]);
});
