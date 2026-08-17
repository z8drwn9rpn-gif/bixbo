import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/device-rendering-fixes.css", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");
const appShell = readFileSync("src/app-shell.css", "utf8");
const quickTags = readFileSync("src/components/QuickTags.tsx", "utf8");

describe("cross-device rendering fixes", () => {
  it("keeps PDF preview as a light-only rendering island for Samsung dark mode", () => {
    expect(root).toContain('import appCss from "../app-shell.css?url"');
    expect(appShell).toContain('@import "./device-rendering-fixes.css";');
    expect(css).toContain("color-scheme: only light !important");
    expect(css).toContain('html[data-browser="samsung-internet"] .modal .pdf-sheet');
    expect(css).toContain("-webkit-text-fill-color: #20261d !important");
  });

  it("keeps iOS dark calendar date faces dark for legacy empty period values", () => {
    expect(css).toContain('.dark .bixbo-calendar .bixbo-calendar-date-face[data-bixbo-period-level=""]');
    expect(css).toContain("background-color: #171a14 !important");
    expect(css).toContain("-webkit-appearance: none");
    expect(css).toContain("-webkit-text-fill-color: #f6f4ee !important");
  });

  it("restores the four Quick Log pain colour orbs without relying on icon migration", () => {
    expect(quickTags).toContain("data-bixbo-quick-tag={tag.key}");
    expect(css).toContain('button[data-bixbo-quick-tag="pain-0"]::before');
    expect(css).toContain('button[data-bixbo-quick-tag="pain-1"]::before');
    expect(css).toContain('button[data-bixbo-quick-tag="pain-2"]::before');
    expect(css).toContain('button[data-bixbo-quick-tag="pain-3"]::before');
    expect(css).toContain("#72c64a");
    expect(css).toContain("#dfd11f");
    expect(css).toContain("#f5a20b");
    expect(css).toContain("#ef4444");
  });
});
