import { describe, expect, it } from "vitest";
import fs from "node:fs";

const iosCss = fs.readFileSync("src/ios-touch-stability.css", "utf8");
const keyboardViewport = fs.readFileSync("src/hooks/useKeyboardViewport.ts", "utf8");
const painWizard = fs.readFileSync("src/features/logging/PainWizard.tsx", "utf8");

describe("Pain mobile/iOS layout stability", () => {
  it("keeps the standard Pain action bar sticky inside the Pain scroll surface", () => {
    expect(iosCss).toContain('[data-bixbo-log-surface="pain"] {');
    expect(iosCss).toContain("padding-top: 0 !important");
    expect(iosCss).toContain('[data-bixbo-log-surface="pain"] > div > div.fixed.inset-x-0');
    expect(iosCss).toContain("position: sticky !important");
    expect(iosCss).toContain("top: 0 !important");
  });

  it("normalizes standard Next/Save into an unclipped horizontal pill", () => {
    expect(painWizard).toContain('className="flex h-[52px] min-w-[64px] flex-col');
    expect(iosCss).toContain('div.fixed.inset-x-0:not(.mt-6) > button:last-child');
    expect(iosCss).toContain("min-width: 6.5rem !important");
    expect(iosCss).toContain("flex-direction: row !important");
    expect(iosCss).toContain("border-radius: 9999px !important");
  });

  it("moves quick Add symptoms action bar into flow and removes the duplicate top spacer", () => {
    expect(painWizard).toContain('px-1 pb-3 pt-[68px]');
    expect(painWizard).toContain('SheetFooter className="fixed inset-x-0');
    expect(iosCss).toContain('div.fixed.mt-6');
    expect(iosCss).toContain("order: -1");
    expect(iosCss).toContain(':has(> div.fixed.mt-6) > div:first-child');
    expect(iosCss).toContain("padding-top: 0.75rem !important");
  });

  it("never scrolls a focused log field backwards toward the top", () => {
    expect(keyboardViewport).toContain("container.scrollTop += rect.bottom - bottomLimit");
    expect(keyboardViewport).not.toContain("container.scrollTop -=");
    expect(keyboardViewport).not.toContain("rect.top < topLimit");
  });
});
