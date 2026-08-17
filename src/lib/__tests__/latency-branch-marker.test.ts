import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("latency fix wiring", () => {
  test("keeps the fast app shell stylesheet active", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect(root).toContain('import appCss from "../app-shell.css?url"');
  });
});
