import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";

describe("admin custom page blocks", () => {
  it("uses local route blocks while preserving unrelated global routes", () => {
    const merged = mergeAdminConfigs(
      { pageBlocks: { "/a": [{ id: "global", title: "A", body: "", order: 10 }], "/b": [{ id: "b", title: "B", body: "", order: 10 }] } },
      { pageBlocks: { "/a": [{ id: "local", title: "Local A", body: "Text", order: 10 }] } },
    );
    expect(merged.pageBlocks?.["/a"]?.map((block) => block.id)).toEqual(["local"]);
    expect(merged.pageBlocks?.["/b"]?.map((block) => block.id)).toEqual(["b"]);
  });
});
