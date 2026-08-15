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
    expect(hook).toContain("window.requestAnimationFrame(() => window.requestAnimationFrame(finishRestore))");
  });

  it("never lets inner focus correction fall back to document/body scrolling", () => {
    expect(hook).toContain("current === document.body || current === document.documentElement");
    expect(hook).not.toContain("scrollIntoView(");
    expect(hook).not.toContain("window.scrollBy(");
  });

  it("uses visualViewport scroll only for sheet geometry, never for focused-field scrolling", () => {
    expect(hook).toContain('viewport.addEventListener("scroll", syncViewportGeometry)');
    const geometryStart = hook.indexOf("const syncViewportGeometry = () => {");
    const geometryEnd = hook.indexOf("const scheduleFocusedReveal = () => {");
    expect(geometryStart).toBeGreaterThan(-1);
    expect(geometryEnd).toBeGreaterThan(geometryStart);
    const geometryBlock = hook.slice(geometryStart, geometryEnd);
    expect(geometryBlock).toContain("applyKeyboardViewportVars(readKeyboardViewportMetrics())");
    expect(geometryBlock).not.toContain("keepFocusedFieldVisible");
    expect(hook).toContain("scheduleFocusedReveal");
  });

  it("keeps BottomNav hidden until document scroll restoration settles", () => {
    expect(hook).toContain("lockToken");
    expect(hook).toContain("root.getAttribute(LOG_FORM_OPEN_ATTR) === lockToken");
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
