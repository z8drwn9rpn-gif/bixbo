import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

describe("Playwright CI lifecycle", () => {
  it("keeps WebKit in a separate Playwright process with a fresh Wrangler server", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

    expect(workflow).toContain("playwright test --project=desktop --project=mobile");
    expect(workflow).toContain("playwright test --project=webkit-mobile");
    expect(workflow.indexOf("playwright test --project=webkit-mobile")).toBeGreaterThan(
      workflow.indexOf("playwright test --project=desktop --project=mobile"),
    );
    expect(workflow).not.toContain("run: bun run e2e\n");
  });
});
