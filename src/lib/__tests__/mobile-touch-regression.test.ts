import { describe, expect, it } from "vitest";
import fs from "node:fs";

const rootSource = fs.readFileSync("src/routes/__root.tsx", "utf8");
const touchCss = fs.readFileSync("src/ios-touch-stability.css", "utf8");
const textareaSource = fs.readFileSync("src/components/ui/textarea.tsx", "utf8");
const themeSource = fs.readFileSync("src/lib/theme.ts", "utf8");

describe("mobile touch and text editing regressions", () => {
  it("locks browser zoom globally while limiting the JS blocker to multi-touch pinch gestures", () => {
    expect(rootSource).toContain(
      'content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"',
    );
    expect(rootSource).toContain("if (event.touches.length > 1) event.preventDefault();");
    expect(rootSource).toContain('document.addEventListener("touchmove", preventPinchTouch, { passive: false })');
    expect(rootSource).toContain('document.addEventListener("gesturestart", preventGesture, { passive: false })');
    expect(rootSource).toContain('document.addEventListener("gesturechange", preventGesture, { passive: false })');
    expect(touchCss).toContain("touch-action: pan-x pan-y");
  });

  it("keeps BIXBO browser chrome explicit before paint with the global zoom lock", () => {
    expect(rootSource).toContain('<meta name="color-scheme" content="light dark" />');
    expect(rootSource).toContain('<meta name="theme-color" content="#FBF7F3" />');
    expect(rootSource).toContain('root.style.colorScheme = isDark ? "dark" : "only light"');
    expect(rootSource).toContain('choice === "light" ? "only light" : "light dark"');
    expect(themeSource).toContain('root.style.colorScheme = isDark ? "dark" : "only light"');
    expect(themeSource).toContain('theme === "light" ? "only light" : "light dark"');
    expect(themeSource).toContain('const DARK_THEME_COLOR = "#171A14"');
  });

  it("preserves native single-touch text selection and scoped chart handling", () => {
    expect(touchCss).toContain(".recharts-wrapper");
    expect(touchCss).toContain("touch-action: pan-y");
    expect(touchCss).toContain("-webkit-user-select: text");
    expect(touchCss).toContain("-webkit-touch-callout: default");
    expect(touchCss).toContain("touch-action: auto");
  });

  it("does not rewrite plain textarea DOM value or selection on every keystroke", () => {
    expect(textareaSource).toContain("if (canonical === rawNative && encoded === rawNative)");
    expect(textareaSource).toContain("onChange?.(event);");
    expect(textareaSource).toContain("return;");
  });
});
