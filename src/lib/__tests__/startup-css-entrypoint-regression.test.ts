import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("startup stylesheet entrypoint", () => {
  test("preserves the existing stylesheet cascade order in one bundled entry", () => {
    const css = readFileSync("src/app-shell.css", "utf8");
    const imports = [
      '@import "./styles.css";',
      '@import "./theme-system.css";',
      '@import "./calendar-system.css";',
      '@import "./device-rendering-fixes.css";',
    ];

    for (const item of imports) expect(css).toContain(item);
    expect(imports.map((item) => css.indexOf(item))).toEqual([...imports.map((item) => css.indexOf(item))].sort((a, b) => a - b));
  });
});
