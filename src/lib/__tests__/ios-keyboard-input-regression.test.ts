import { describe, expect, it } from "vitest";
import fs from "node:fs";

const textarea = fs.readFileSync("src/components/ui/textarea.tsx", "utf8");
const input = fs.readFileSync("src/components/ui/input.tsx", "utf8");
const logSheet = fs.readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");
const sheet = fs.readFileSync("src/components/ui/sheet.tsx", "utf8");
const iconKeyboard = fs.readFileSync("src/components/icons/BixboIconKeyboard.tsx", "utf8");
const iosCss = fs.readFileSync("src/ios-touch-stability.css", "utf8");
const hook = fs.readFileSync("src/hooks/useKeyboardViewport.ts", "utf8");
const rootRoute = fs.readFileSync("src/routes/__root.tsx", "utf8");

describe("Textarea iOS input attributes", () => {
  it("disables browser/iOS suggestions by default and keeps sentence capitalisation", () => {
    expect(textarea).toContain('autoComplete="off"');
    expect(textarea).toContain('autoCorrect="off"');
    expect(textarea).toContain("spellCheck={false}");
    expect(textarea).toContain('autoCapitalize="sentences"');
  });

  it("allows call sites to override the defaults via the props spread", () => {
    expect(textarea.indexOf(String.raw`autoComplete="off"`)).toBeLessThan(textarea.lastIndexOf("{...props}"));
  });
});

describe("Textarea iOS caret stability", () => {
  it("keeps keyboard edits as one native DOM value even when emoji are present", () => {
    expect(textarea).toContain("const canonicalValue = controlled ? asText(value) : uncontrolledValue;");
    expect(textarea).toContain("const mirrorActive = !focused");
    expect(textarea).toContain("const next = node.value;");
    expect(textarea).toContain("onChange?.(event)");
    expect(textarea).not.toContain("encodeBixboNativeText");
    expect(textarea).not.toContain("decodeBixboNativeText");
    expect(textarea).not.toContain("normalizeBixboText");
  });

  it("only restores selection programmatically for an explicit BIXBO icon insertion", () => {
    expect(textarea).toContain("BixboInlinePicker");
    expect(textarea).toContain('inputType: "insertText"');
    expect(textarea).toContain("node.setSelectionRange(nextCaret, nextCaret)");
  });
});

describe("Input free-text handling", () => {
  it("only disables autocomplete for free-text types", () => {
    expect(input).toContain('new Set<string>(["text", "search"])');
    expect(input).toContain("type === undefined || FREE_TEXT_TYPES.has(type)");
    expect(input).toContain("autoCorrect: \"off\"");
  });
});

describe("Log sheet keyboard stability", () => {
  it("keeps the full-screen log box independent from VisualViewport animation", () => {
    // LogSheetRoot can keep the legacy class names, but SheetContent must
    // normalize them to a stable inset shell before they reach the DOM.
    expect(logSheet).toContain("useKeyboardViewport(open && Boolean(active))");
    expect(sheet).toContain('className.includes("--bixbo-viewport-height")');
    expect(sheet).toContain('.replace("!top-[var(--bixbo-viewport-offset,0px)]", "!top-0")');
    expect(sheet).toContain('.replace("!h-[var(--bixbo-viewport-height,100svh)]", "!h-auto")');
    expect(sheet).toContain('.replace("!bottom-auto", "!bottom-0")');
    expect(sheet).toContain('data-bixbo-fullscreen-log={fullScreenLog ? "true" : undefined}');
  });

  it("does not subscribe the log shell to keyboard/focus viewport events", () => {
    expect(hook).not.toContain("window.visualViewport");
    expect(hook).not.toContain('addEventListener("resize"');
    expect(hook).not.toContain('addEventListener("scroll"');
    expect(hook).not.toContain('addEventListener("focusin"');
    expect(hook).not.toContain('addEventListener("focusout"');
    expect(hook).not.toContain("scrollIntoView(");
    expect(hook).not.toContain("scrollTop +=");
  });

  it("does not repaint the global icon trigger on every VisualViewport keyboard frame", () => {
    expect(iconKeyboard).toContain("ownsInlineBixboPicker");
    expect(iconKeyboard).toContain("window.requestAnimationFrame(measurePosition)");
    expect(iconKeyboard).not.toContain('visualViewport?.addEventListener("resize"');
    expect(iconKeyboard).not.toContain('visualViewport?.addEventListener("scroll"');
  });

  it("keeps user zoom enabled while preventing automatic input focus zoom with 16px fields", () => {
    expect(rootRoute).not.toContain("maximum-scale=1");
    expect(rootRoute).not.toContain("minimum-scale=1");
    expect(rootRoute).not.toContain("user-scalable=no");
    expect(rootRoute).not.toContain('document.addEventListener("touchmove"');
    expect(rootRoute).not.toContain('document.addEventListener("gesturestart"');
    expect(iosCss).toContain("touch-action: pan-x pan-y pinch-zoom");
    expect(iosCss).toMatch(/input:not\([^}]+textarea,[\s\S]*font-size:\s*16px\s*!important/);
  });
});
