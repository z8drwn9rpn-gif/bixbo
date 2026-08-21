import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mentalForm = readFileSync("src/features/logging/MentalWellbeingForm.tsx", "utf8");

describe("Mental wellbeing swipe navigation contract", () => {
  it("supports horizontal finger swipes between the two mental distress pages", () => {
    expect(mentalForm).toContain('import { useRef, useState } from "react"');
    expect(mentalForm).toContain("const swipeStartRef = useRef");
    expect(mentalForm).toContain("onTouchStart={handleTouchStart}");
    expect(mentalForm).toContain("onTouchEnd={handleTouchEnd}");
    expect(mentalForm).toContain("onTouchCancel={handleTouchCancel}");
    expect(mentalForm).toContain("if (dx < 0 && step === 1) setStep(2)");
    expect(mentalForm).toContain("if (dx > 0 && step === 2) setStep(1)");
  });

  it("keeps vertical scrolling and interactive controls safe while swiping", () => {
    expect(mentalForm).toContain("touch-pan-y");
    expect(mentalForm).toContain('input,textarea,select,[role="slider"],[data-mental-swipe-block]');
    expect(mentalForm).toContain("onClickCapture={handleClickCapture}");
    expect(mentalForm).toContain("Math.abs(dx) < 55");
    expect(mentalForm).toContain("Math.abs(dx) <= Math.abs(dy)");
  });
});
