import { describe, expect, it } from "vitest";
import fs from "node:fs";

const rootSource = fs.readFileSync("src/routes/__root.tsx", "utf8");
const touchCss = fs.readFileSync("src/ios-touch-stability.css", "utf8");
const textareaSource = fs.readFileSync("src/components/ui/textarea.tsx", "utf8");
const themeSource = fs.readFileSync("src/lib/theme.ts", "utf8");

describe("mobile touch and text editing regressions", () => {
  it("keeps page zoom locked without JS gesture interception and avoids iOS focus zoom", () => {
    expect(rootSource).toContain(
      'content: "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"',
    );
    expect(rootSource).toContain("maximum-scale=1");
    expect(rootSource).toContain("minimum-scale=1");
    expect(rootSource).toContain("user-scalable=no");
    expect(rootSource).not.toContain("preventPinchTouch");
    expect(rootSource).not.toContain("preventGesture");
    expect(rootSource).not.toContain('document.addEventListener("gesturestart"');
    expect(rootSource).not.toContain('document.addEventListener("touchmove"');
    expect(touchCss).toContain("touch-action: pan-x pan-y;");
    expect(touchCss).not.toContain("touch-action: pan-x pan-y pinch-zoom");
    expect(touchCss).toMatch(/textarea,[\s\S]*select \{[\s\S]*font-size:\s*16px\s*!important/);
  });

  it("keeps BIXBO browser chrome and Samsung backing canvas explicit before paint", () => {
    expect(rootSource).toContain('<meta name="color-scheme" content="light dark" />');
    expect(rootSource).toContain('<meta name="theme-color" content="#FBF7F3" />');
    expect(rootSource).toContain('root.style.colorScheme = isDark ? "dark" : "only light"');
    expect(rootSource).toContain('colorSchemeMeta.setAttribute("content", isDark ? "dark" : "only light")');
    expect(rootSource).toContain('const canvas = isDark ? "#171A14" : "#FBF7F3"');
    expect(rootSource).toContain('root.style.setProperty("background-color", canvas, "important")');
    expect(rootSource).toContain("SamsungBrowser");

    expect(themeSource).toContain('root.style.colorScheme = isDark ? "dark" : "only light"');
    expect(themeSource).toContain('colorSchemeMeta?.setAttribute("content", isDark ? "dark" : "only light")');
    expect(themeSource).toContain('const LIGHT_THEME_COLOR = "#FBF7F3"');
    expect(themeSource).toContain('const DARK_THEME_COLOR = "#171A14"');
    expect(themeSource).toContain('root.style.setProperty("background-color", canvas, "important")');
    expect(themeSource).toContain('document.body.style.setProperty("background-color", canvas, "important")');
  });

  it("preserves native single-touch text selection and scoped chart handling", () => {
    expect(touchCss).toContain(".recharts-wrapper");
    expect(touchCss).toContain("touch-action: pan-y");
    expect(touchCss).toContain("-webkit-user-select: text");
    expect(touchCss).toContain("-webkit-touch-callout: default");
    expect(touchCss).toContain("touch-action: auto");
  });

  it("never rewrites the active textarea DOM value or selection during keyboard edits", () => {
    expect(textareaSource).toContain("const next = node.value;");
    expect(textareaSource).toContain("onChange?.(event);");
    expect(textareaSource).not.toContain("encodeBixboNativeText");
    expect(textareaSource).not.toContain("decodeBixboNativeText");
    expect(textareaSource).not.toContain("normalizeBixboText");
    expect(textareaSource).toContain("const mirrorActive = !focused");
  });
});
