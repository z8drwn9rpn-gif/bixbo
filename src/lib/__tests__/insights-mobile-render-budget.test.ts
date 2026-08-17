import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Insights mobile render budget", () => {
  test("lets Safari skip layout and paint for offscreen dashboard cards", () => {
    const css = readFileSync("src/features/insights/insights-3d.css", "utf8");

    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain('[data-bixbo-insights-dashboard="true"] > [data-bixbo-jump-label]');
    expect(css).toContain("content-visibility: auto");
    expect(css).toContain("contain-intrinsic-size: auto 420px");
  });
});
