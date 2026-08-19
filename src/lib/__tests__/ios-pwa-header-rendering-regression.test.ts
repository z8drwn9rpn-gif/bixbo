import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ios-pwa-rendering-fixes.css", "utf8");
const appShellCss = readFileSync("src/app-shell.css", "utf8");
const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");

describe("iPhone standalone PWA Home rendering", () => {
  it("loads a WebKit standalone-only Home paint-island correction", () => {
    expect(appShellCss).toContain('@import "./ios-pwa-rendering-fixes.css";');
    expect(css).toContain("@supports (-webkit-touch-callout: none)");
    expect(css).toContain("@media (display-mode: standalone)");
    expect(css).toContain("[data-bixbo-home-paint-island]");
    expect(css).not.toContain('header[data-bixbo-app-header][data-bixbo-home-header="true"]');
  });

  it("keeps the Home title out of rasterizing compositor effects", () => {
    expect(css).toContain("position: relative !important");
    expect(css).toContain("z-index: auto !important");
    expect(css).toContain("-webkit-backdrop-filter: none !important");
    expect(css).toContain("backdrop-filter: none !important");
    expect(css).toContain("transform: none !important");
    expect(css).toContain("will-change: auto !important");
    expect(css).toContain("contain: none !important");
    expect(css).toContain("isolation: isolate !important");
    expect(css).toContain("mix-blend-mode: normal !important");
    expect(css).toContain("overflow: visible !important");
    expect(css).toContain("text-shadow: none !important");
    expect(css).toContain("box-shadow: none !important");
    expect(css).toContain("-webkit-font-smoothing: auto !important");
    expect(css).toContain("text-rendering: auto !important");
    expect(css).not.toContain("text-rendering: geometricPrecision");
  });

  it("renders Home outside the header compositor with real inline vector geometry", () => {
    expect(appShell).toContain("data-bixbo-home-paint-island");
    expect(appShell).toContain('role="banner"');
    expect(appShell).toContain('<div data-bixbo-app-title className="min-w-0"');
    expect(appShell).not.toContain("data-bixbo-home-header");
    expect(appShell).toContain('style={{ filter: "none", transform: "none" }}');
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

  it("keeps Home below iOS live-activity material without a large top gap", () => {
    expect(root).toContain('{ name: "apple-mobile-web-app-status-bar-style", content: "default" }');
    expect(root).not.toContain('content: "black-translucent"');
    expect(root).toContain('[data-bixbo-home-paint-island]');
    expect(css).toContain("padding-top: calc(max(0.5rem, env(safe-area-inset-top)) + 1.25rem) !important");
    expect(css).not.toContain("+ 2.75rem");
  });

  it("opts the complete Home subtree out of backdrop filtering", () => {
    expect(css).toContain("[data-bixbo-home-paint-island] *::before");
    expect(css).toContain("[data-bixbo-home-paint-island] *::after");
    expect(css).toContain("isolation: isolate !important");
  });
});
