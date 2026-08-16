import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

describe("Playwright CI lifecycle", () => {
  it("runs every browser project in a fresh Playwright process", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("playwright test --project=desktop");
    expect(workflow).toContain("playwright test --project=mobile");
    expect(workflow).toContain("playwright test --project=webkit-mobile");
    expect(workflow).not.toContain("run: bun run e2e\n");
  });
});
