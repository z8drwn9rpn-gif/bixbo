import fs from "node:fs";
import { describe, expect, it } from "vitest";

const iosCss = fs.readFileSync("src/ios-touch-stability.css", "utf8");
const keyboardViewport = fs.readFileSync("src/hooks/useKeyboardViewport.ts", "utf8");
const painWizard = fs.readFileSync("src/features/logging/PainWizard.tsx", "utf8");

describe("Pain mobile/iOS layout stability", () => {
  it("keeps the standard Pain action bar sticky directly in source", () => {
    expect(painWizard).toContain('className="sticky top-0 z-30 -mx-5 h-[60px]');
    expect(painWizard).not.toContain('className="fixed inset-x-0 z-30 h-[60px]');
    expect(iosCss).not.toContain('> div > div.fixed.inset-x-0');
  });

  it("uses an unclipped horizontal Next/Save pill directly in source", () => {
    expect(painWizard).toContain('className="inline-flex h-10 min-w-[104px]');
    expect(painWizard).not.toContain('flex h-[52px] min-w-[64px] flex-col');
  });

  it("keeps quick Add symptoms action in flow without a duplicate top spacer", () => {
    expect(painWizard).toContain('px-1 pb-3 pt-3');
    expect(painWizard).not.toContain('pt-[68px]');
    expect(painWizard).toContain('<SheetFooter className="sticky top-0 order-first');
    expect(painWizard).not.toContain('style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}');
  });

  it("never scrolls a focused log field backwards toward the top", () => {
    expect(keyboardViewport).toContain("focusedScrollFloor");
    expect(keyboardViewport).toContain(
      "if (container.scrollTop < focusedScrollFloor) container.scrollTop = focusedScrollFloor",
    );
    expect(keyboardViewport).not.toContain("container.scrollTop -= topLimit - rect.top");
  });
});
