import { describe, expect, it } from "vitest";
import fs from "node:fs";

const rootSource = fs.readFileSync("src/routes/__root.tsx", "utf8");
const touchCss = fs.readFileSync("src/ios-touch-stability.css", "utf8");
const textareaSource = fs.readFileSync("src/components/ui/textarea.tsx", "utf8");
const themeSource = fs.readFileSync("src/lib/theme.ts", "utf8");

describe("mobile touch and text editing regressions", () => {
  it("does not disable browser zoom or install document-wide gesture blockers", () => {
    expect(rootSource).toContain('content: "width=device-width, initial-scale=1, viewport-fit=cover"');
    expect(rootSource).not.toContain("user-scalable=no");
    expect(rootSource).not.toContain("maximum-scale=1");
    expect(rootSource).not.toContain('document.addEventListener("touchmove"');
    expect(rootSource).not.toContain('document.addEventListener("gesturestart"');
  });

  it("keeps BIXBO browser chrome explicit before paint without disabling page zoom", () => {
    expect(rootSource).toContain('<meta name="color-scheme" content="light dark" />');
    expect(rootSource).toContain('<meta name="theme-color" content="#FBF7F3" />');
    expect(rootSource).toContain('root.style.colorScheme = isDark ? "dark" : "only light"');
    expect(rootSource).toContain('choice === "light" ? "only light" : "light dark"');
    expect(themeSource).toContain('root.style.colorScheme = isDark ? "dark" : "only light"');
    expect(themeSource).toContain('theme === "light" ? "only light" : "light dark"');
    expect(themeSource).toContain('const DARK_THEME_COLOR = "#171A14"');
  });

  it("keeps chart touch handling scoped while preserving native text selection", () => {
    expect(touchCss).toContain(".recharts-wrapper");
    expect(touchCss).toContain("touch-action: pan-y");
    expect(touchCss).toContain("-webkit-user-select: text");
    expect(touchCss).toContain("-webkit-touch-callout: default");
    expect(touchCss).not.toContain("#app,");
  });

  it("does not rewrite plain textarea DOM value or selection on every keystroke", () => {
    expect(textareaSource).toContain("if (canonical === rawNative && encoded === rawNative)");
    expect(textareaSource).toContain("onChange?.(event);");
    expect(textareaSource).toContain("return;");
  });
});
