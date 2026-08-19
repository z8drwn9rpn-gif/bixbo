import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ios-pwa-rendering-fixes.css", "utf8");
const appShell = readFileSync("src/app-shell.css", "utf8");

describe("iPhone standalone PWA header rendering", () => {
  it("loads a WebKit standalone-only Home header correction", () => {
    expect(appShell).toContain('@import "./ios-pwa-rendering-fixes.css";');
    expect(css).toContain("@supports (-webkit-touch-callout: none)");
    expect(css).toContain("@media (display-mode: standalone)");
    expect(css).toContain('header[data-bixbo-app-header][data-bixbo-home-header="true"]');
  });

  it("keeps the Home title out of rasterizing compositor effects", () => {
    expect(css).toContain("-webkit-backdrop-filter: none !important");
    expect(css).toContain("backdrop-filter: none !important");
    expect(css).toContain("transform: none !important");
    expect(css).toContain("will-change: auto !important");
    expect(css).toContain("contain: none !important");
    expect(css).toContain("overflow: visible !important");
    expect(css).toContain("text-shadow: none !important");
    expect(css).toContain("-webkit-font-smoothing: antialiased !important");
  });
});
