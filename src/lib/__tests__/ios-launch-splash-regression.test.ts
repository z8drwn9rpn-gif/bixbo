import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA launch presentation", () => {
  it("hands off from the BIXBO launch overlay immediately after the first painted frames", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(existsSync("public/apple-launch-bixbo.png")).toBe(true);
    expect(existsSync("public/bixbo-mascot-user.png")).toBe(true);
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain('href: "/apple-touch-icon.png"');
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_CSS");
    expect(root).toContain('id="bixbo-ios-launch-splash"');
    expect(root).toContain('src="/bixbo-mascot-user.png?v=20260816-launch6"');
    expect(root).toContain('window.navigator.standalone === true');
    expect(root).toContain('(display-mode: standalone)');
    expect(root).toContain('root.dataset.bixboPwaLaunch = "visible"');
    expect(root).toContain('document.visibilityState === "hidden"');
    expect(root).toContain('window.addEventListener("pageshow", handOffAfterFirstVisiblePaint, { once: true })');
    expect(root).toContain("window.requestAnimationFrame(() => {");
    expect(root).toContain("}, 80);");
    expect(root).toContain("}, 700);");
    expect(root).not.toContain("beginVisibleSecond");
    expect(root).not.toContain('}, 1000);');
    expect(root).toContain('root.dataset.bixboPwaLaunch = "hidden"');
    expect(root).not.toContain("sessionStorage");
    expect(root).not.toContain("bixbo-ios-launch-splash-hide");
  });
});
