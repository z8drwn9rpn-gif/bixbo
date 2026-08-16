import { describe, expect, it } from "vitest";
import fs from "node:fs";

const hook = fs.readFileSync("src/hooks/useKeyboardViewport.ts", "utf8");
const css = fs.readFileSync("src/mobile-stability.css", "utf8");
const sheet = fs.readFileSync("src/components/ui/sheet.tsx", "utf8");

describe("iOS full-screen log document lock", () => {
  it("locks background overflow without turning the body into a fixed layer", () => {
    expect(hook).toContain('export const LOG_FORM_OPEN_ATTR = "data-bixbo-log-form-open"');
    expect(hook).toContain('root.style.overflow = "hidden"');
    expect(hook).toContain('body.style.overflow = "hidden"');
    expect(hook).toContain('root.style.overscrollBehavior = "none"');
    expect(hook).toContain('body.style.overscrollBehavior = "none"');
    expect(hook).not.toContain('body.style.position = "fixed"');
    expect(hook).not.toContain("body.style.top =");
    expect(hook).not.toContain("window.scrollTo(");
  });

  it("does not fight native iOS focus scrolling or viewport panning", () => {
    expect(hook).not.toContain("scrollIntoView(");
    expect(hook).not.toContain("window.scrollBy(");
    expect(hook).not.toContain("scrollTop +=");
    expect(hook).not.toContain("keepFocusedFieldVisible");
    expect(hook).not.toContain("findScrollContainer");
    expect(hook).not.toContain("visualViewport");
    expect(hook).not.toContain("requestAnimationFrame");
  });

  it("normalizes legacy viewport-sized log classes to a stable inset shell", () => {
    expect(sheet).toContain('const viewportDrivenLog =');
    expect(sheet).toContain('.replace("!bottom-auto", "!bottom-0")');
    expect(sheet).toContain('.replace("!top-[var(--bixbo-viewport-offset,0px)]", "!top-0")');
    expect(sheet).toContain('.replace("!h-[var(--bixbo-viewport-height,100svh)]", "!h-auto")');
    expect(sheet).toContain('.replace("!max-h-[var(--bixbo-viewport-height,100svh)]", "!max-h-none")');
    expect(sheet).toContain("!backdrop-blur-none");
  });

  it("keeps the lock ref-counted and restores original overflow styles", () => {
    expect(hook).toContain("let documentLockCount = 0");
    expect(hook).toContain("let documentLockSnapshot");
    expect(hook).toContain("documentLockCount += 1");
    expect(hook).toContain("documentLockCount = Math.max(0, documentLockCount - 1)");
    expect(hook).toContain("root.removeAttribute(LOG_FORM_OPEN_ATTR)");
  });

  it("keeps BottomNav hidden and scroll chaining inside the active log surface", () => {
    expect(css).toContain('html[data-bixbo-log-form-open] nav[aria-label="Primary navigation"]');
    expect(css).toContain("display: none !important");
    expect(css).toContain("[data-bixbo-log-surface]");
    expect(css).toContain("isolation: isolate");
    expect(css).toContain("overscroll-behavior-y: contain");
    expect(css).toContain("overflow-anchor: none");
    const logSurfaceRule = css.match(/\[data-bixbo-log-surface\]\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(logSurfaceRule).not.toContain("-webkit-overflow-scrolling: touch");
  });
});
