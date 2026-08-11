import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";

describe("HAK custom sections", () => {
  it("lets local HAK custom blocks replace the published array while keeping item overrides merged", () => {
    const merged = mergeAdminConfigs(
      { hak: { items: { sex: { label: "Global sex" } }, blocks: [{ id: "g", title: "G", body: "", order: 10, placement: "top" }] } },
      { hak: { items: { protection: { hidden: true } }, blocks: [{ id: "l", title: "L", body: "", order: 10, placement: "bottom" }] } },
    );
    expect(merged.hak?.blocks?.map((block) => block.id)).toEqual(["l"]);
    expect(merged.hak?.items?.sex?.label).toBe("Global sex");
    expect(merged.hak?.items?.protection?.hidden).toBe(true);
  });
});
