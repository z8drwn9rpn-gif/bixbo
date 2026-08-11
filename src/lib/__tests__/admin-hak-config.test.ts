import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";

describe("HAK admin config merge", () => {
  it("merges HAK items by stable ID and lets local overrides win", () => {
    const merged = mergeAdminConfigs(
      { hak: { items: { protection: { label: "Protection", hidden: false }, sex: { label: "Sex" } } } },
      { hak: { items: { protection: { label: "Protected", hidden: true } } } },
    );
    expect(merged.hak?.items?.protection).toEqual({ label: "Protected", hidden: true });
    expect(merged.hak?.items?.sex).toEqual({ label: "Sex" });
  });
});
