import { describe, expect, it } from "vitest";
import fs from "node:fs";

const hook = fs.readFileSync("src/hooks/useKeyboardViewport.ts", "utf8");
const css = fs.readFileSync("src/ios-touch-stability.css", "utf8");

describe("iOS full-screen log document lock", () => {
  it("freezes and restores the background document scroll position", () => {
    expect(hook).toContain('export const LOG_FORM_OPEN_ATTR = "data-bixbo-log-form-open"');
    expect(hook).toContain('body.style.position = "fixed"');
    expect(hook).toContain('body.style.top = `-${scrollY}px`');
    expect(hook).toContain("window.scrollTo(scrollX, scrollY)");
    expect(hook).toContain("window.requestAnimationFrame(() => window.requestAnimationFrame(restoreScroll))");
  });

  it("never lets inner focus correction fall back to document/body scrolling", () => {
    expect(hook).toContain("current === document.body || current === document.documentElement");
    expect(hook).not.toContain("scrollIntoView(");
    expect(hook).not.toContain("window.scrollBy(");
  });

  it("does not chase visualViewport scroll events while iOS pans during focus", () => {
    expect(hook).toContain('viewport.addEventListener("resize", sync)');
    expect(hook).not.toContain('viewport.addEventListener("scroll", sync)');
    expect(hook).toContain("revealFocusedFieldAfterKeyboardSettles");
  });

  it("removes BottomNav from painting while a log form/keyboard is active", () => {
    expect(css).toContain('html[data-bixbo-log-form-open] nav[aria-label="Primary navigation"]');
    expect(css).toContain('html[data-bixbo-keyboard-open] nav[aria-label="Primary navigation"]');
    expect(css).toContain("display: none !important");
    expect(css).toContain("pointer-events: none !important");
  });

  it("keeps scroll chaining inside the log surface", () => {
    expect(css).toContain("[data-bixbo-log-surface]");
    expect(css).toContain("overscroll-behavior-y: contain");
    expect(css).toContain("-webkit-overflow-scrolling: touch");
  });
});
