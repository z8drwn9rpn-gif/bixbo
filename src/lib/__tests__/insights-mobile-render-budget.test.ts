import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Insights mobile interaction budget", () => {
  test("does not defer dashboard card layout into scroll or tap interactions", () => {
    const css = readFileSync("src/features/insights/insights-3d.css", "utf8");

    expect(css).not.toContain("content-visibility: auto");
    expect(css).not.toContain("contain-intrinsic-size: auto 420px");
  });
});
