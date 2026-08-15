import { describe, expect, it } from "vitest";
import fs from "node:fs";

import { applyKeyboardViewportVars, readKeyboardViewportMetrics } from "@/hooks/useKeyboardViewport";

const textarea = fs.readFileSync("src/components/ui/textarea.tsx", "utf8");
const input = fs.readFileSync("src/components/ui/input.tsx", "utf8");
const logSheet = fs.readFileSync("src/features/logging/LogSheetRoot.tsx", "utf8");
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
  it("does not rewrite DOM value/selection for plain text keystrokes", () => {
    expect(textarea).toContain("if (canonical === rawNative && encoded === rawNative) {");
    const fastPath = textarea.slice(
      textarea.indexOf("if (canonical === rawNative && encoded === rawNative) {"),
      textarea.indexOf("const encodedStart"),
    );
    expect(fastPath).not.toContain("setNativeTextareaValue");
    expect(fastPath).not.toContain("setSelectionRange");
    expect(fastPath).toContain("onChange?.(event)");
  });

  it("keeps BIXBO glyph encoding + caret restoration for emoji content", () => {
    expect(textarea).toContain("encodeBixboNativeText");
    expect(textarea).toContain("node.setSelectionRange(encodedStart, encodedEnd)");
    expect(textarea).toContain("BixboInlinePicker");
  });
});

describe("Input free-text handling", () => {
  it("only disables autocomplete for free-text types", () => {
    expect(input).toContain('new Set<string>(["text", "search"])');
    expect(input).toContain("type === undefined || FREE_TEXT_TYPES.has(type)");
    expect(input).toContain("autoCorrect: \"off\"");
  });
});

describe("Log sheet keyboard viewport", () => {
  it("uses the visual viewport variables for the active full-screen sheet", () => {
    expect(logSheet).toContain("useKeyboardViewport(open && Boolean(active))");
    expect(logSheet).toContain("!h-[var(--bixbo-viewport-height,100svh)]");
    expect(logSheet).toContain("!top-[var(--bixbo-viewport-offset,0px)]");
  });

  it("never fakes, hides or fights the native iOS accessory/focus behavior", () => {
    expect(iosCss).toContain("--bixbo-keyboard-inset");
    expect(hook).not.toContain("scrollIntoView(");
    expect(hook).not.toContain("findScrollContainer");
    expect(hook).not.toContain("scrollTop +=");
    expect(logSheet).not.toContain("scrollIntoView(");
  });

  it("keeps user zoom enabled while preventing automatic input focus zoom with 16px fields", () => {
    expect(rootRoute).not.toContain("maximum-scale=1");
    expect(rootRoute).not.toContain("minimum-scale=1");
    expect(rootRoute).not.toContain("user-scalable=no");
    expect(rootRoute).not.toContain('document.addEventListener("touchmove"');
    expect(rootRoute).not.toContain('document.addEventListener("gesturestart"');
    expect(iosCss).toMatch(/input:not\([^}]+textarea,[\s\S]*font-size:\s*16px\s*!important/);
  });
});

describe("Keyboard viewport helpers", () => {
  it("returns null and no-ops without a VisualViewport capable window", () => {
    expect(readKeyboardViewportMetrics()).toBeNull();
    expect(() => applyKeyboardViewportVars(null, null)).not.toThrow();
  });

  it("writes viewport variables onto the provided root element", () => {
    const styles = new Map<string, string>();
    const attributes = new Map<string, string>();
    const root = {
      style: {
        setProperty: (name: string, value: string) => styles.set(name, value),
        removeProperty: (name: string) => styles.delete(name),
      },
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    } as unknown as HTMLElement;

    applyKeyboardViewportVars({ height: 420, offsetTop: 0, keyboardInset: 336 }, root);
    expect(styles.get("--bixbo-viewport-height")).toBe("420px");
    expect(styles.get("--bixbo-keyboard-inset")).toBe("336px");
    expect(attributes.get("data-bixbo-keyboard-open")).toBe("true");

    applyKeyboardViewportVars({ height: 756, offsetTop: 0, keyboardInset: 0 }, root);
    expect(attributes.has("data-bixbo-keyboard-open")).toBe(false);
  });
});
