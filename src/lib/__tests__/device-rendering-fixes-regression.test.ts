import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/device-rendering-fixes.css", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");
const appShell = readFileSync("src/app-shell.css", "utf8");
const appShellComponent = readFileSync("src/components/AppShell.tsx", "utf8");
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

  it("keeps the Home BIXBO title and profile greeting sharp on WebKit", () => {
    expect(css).toContain('h1[data-bixbo-app-title] [data-bixbo-display-title]');
    expect(css).toContain('h1[data-bixbo-app-title] [data-bixbo-display-title] + a');
    expect(css).toContain("text-shadow: none !important");
    expect(css).toContain("-webkit-text-stroke: 0 !important");
    expect(css).toContain("filter: none !important");
    expect(appShellComponent).toContain("data-bixbo-app-header");
    expect(appShellComponent).toContain('big ? "bg-background" : "bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/82"');
    expect(appShellComponent).toContain('textShadow: big ? "none" : BIXBO_ROUNDED_DISPLAY_SHADOW');
  });

  it("keeps the Home header out of the standalone iOS PWA compositor path", () => {
    expect(root).toContain('root.dataset.bixboPwaMode = standalone ? "standalone" : "browser"');
    expect(appShellComponent).toContain('const isHomeHeader = pathname === "/" && title !== undefined');
    expect(appShellComponent).toContain('data-bixbo-home-header={isHomeHeader ? "true" : undefined}');
    expect(root).toContain('html[data-bixbo-pwa-mode="standalone"] header[data-bixbo-app-header][data-bixbo-home-header="true"]');
    expect(root).not.toContain(':has(h1[data-bixbo-app-title] [data-bixbo-display-title])');
    expect(root).toContain("position: relative !important");
    expect(root).toContain("-webkit-backdrop-filter: none !important");
    expect(root).toContain("will-change: auto !important");
    expect(root).toContain("-webkit-font-smoothing: auto !important");
  });
});
