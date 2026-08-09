import { describe, expect, it } from "bun:test";

import { mergeBixbo } from "../merge";
import { EMPTY, type BixboData } from "../storage";

const clone = (): BixboData => structuredClone(EMPTY);

describe("BIXBO sync regression protection", () => {
  it("seeds a fresh device from legacy cloud Quick Tags instead of tombstoning them", () => {
    const local = clone();
    const remote = clone();
    remote.settings.customQuickTags = [
      { id: "legacy-tag", emoji: "⭐", label: "Legacy", cat: "pain", preset: { score: 3 } },
    ];

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: false });
    expect(merged.settings.customQuickTags?.map((tag) => tag.id)).toContain("legacy-tag");
    expect(merged.deletedIds ?? []).not.toContain("legacy-tag");
  });

  it("keeps an existing device canonical for a remote-only legacy deleted Quick Tag", () => {
    const local = clone();
    const remote = clone();
    remote.settings.customQuickTags = [
      { id: "old-deleted-tag", emoji: "⭐", label: "Old", cat: "pain", preset: { score: 2 } },
    ];

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    expect(merged.settings.customQuickTags ?? []).toHaveLength(0);
    expect(merged.deletedIds ?? []).toContain("old-deleted-tag");
  });

  it("does not resurrect a legacy custom Pain option removed on the current device", () => {
    const local = clone();
    const remote = clone();
    local.custom.bodyParts = ["Back"];
    remote.custom.bodyParts = ["Back", "Old custom spot"];

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    expect(merged.custom.bodyParts).toEqual(["Back"]);
    expect(merged.deletedCustom?.bodyParts ?? []).toContain("Old custom spot");
  });

  it("preserves Health Profile legacy arrays when the other side is empty", () => {
    const local = clone();
    const remote = clone();
    local.profile = { diagnoses: ["PCOS"], allergies: ["Example allergy"] };
    remote.profile = { diagnoses: [], allergies: [] };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    expect(merged.profile?.diagnoses).toContain("PCOS");
    expect(merged.profile?.allergies).toContain("Example allergy");
  });

  it("keeps a deliberately ended pregnancy inactive against stale legacy active cloud data", () => {
    const local = clone();
    const remote = clone();
    local.pregnancy = { ...local.pregnancy!, active: false, endedAt: "2026-08-09" };
    remote.pregnancy = { ...remote.pregnancy!, active: true, lmp: "2026-01-01" };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    expect(merged.pregnancy?.active).toBe(false);
  });

  it("keeps a deliberately ended postpartum state inactive against stale legacy active cloud data", () => {
    const local = clone();
    const remote = clone();
    local.postpartum = { ...local.postpartum!, active: false, endedAt: "2026-08-09" };
    remote.postpartum = { ...remote.postpartum!, active: true, birthDate: "2026-07-01" };

    const merged = mergeBixbo(local, remote, { legacyLocalCanonical: true });
    expect(merged.postpartum?.active).toBe(false);
  });
});
