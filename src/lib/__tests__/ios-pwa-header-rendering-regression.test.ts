import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ios-pwa-rendering-fixes.css", "utf8");
const appShellCss = readFileSync("src/app-shell.css", "utf8");
const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
const home = readFileSync("src/features/home/HomePage.tsx", "utf8");

describe("iPhone standalone PWA header rendering", () => {
  it("loads a WebKit standalone-only Home header correction", () => {
    expect(appShellCss).toContain('@import "./ios-pwa-rendering-fixes.css";');
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
    expect(css).toContain("box-shadow: none !important");
    expect(css).toContain("-webkit-font-smoothing: auto !important");
    expect(css).toContain("text-rendering: auto !important");
    expect(css).not.toContain("text-rendering: geometricPrecision");
  });

  it("renders the Home title as real inline vector geometry with no text glyph layer", () => {
    expect(appShell).toContain('isHomeHeader ? (');
    expect(appShell).toContain('<div data-bixbo-app-title className="min-w-0"');
    expect(appShell).toContain('style={{ filter: isHomeHeader ? "none" : BIXBO_MASCOT_FILTER }}');
    expect(appShell).not.toContain("portrait:shadow-[0_0_40px_-24px");
    expect(home).toContain("function BixboHomeWordmark()");
    expect(home).toContain("data-bixbo-home-wordmark");
    expect(home).toContain('aria-label="BIXBO"');
    expect(home).toContain('<BixboHomeWordmark />');
    expect(home).not.toContain('>BIXBO</span>');
    expect(css).toContain("[data-bixbo-home-wordmark]");
    expect(css).not.toContain("mask-image:");
    expect(css).not.toContain("-webkit-mask-image:");
  });
});
