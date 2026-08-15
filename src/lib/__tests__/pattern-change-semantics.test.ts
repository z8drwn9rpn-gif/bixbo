import { describe, expect, it } from "bun:test";
import { changeToneFromDelta, changeToneTextClass, outcomeChangeDirection } from "../patternChangeSemantics";

describe("Patterns semantic change tones", () => {
  it("marks symptom reductions green and symptom increases red", () => {
    expect(changeToneFromDelta(-2, "higher-worse")).toBe("good");
    expect(changeToneFromDelta(2, "higher-worse")).toBe("bad");
  });

  it("marks beneficial metric increases green and decreases red", () => {
    expect(changeToneFromDelta(12, "higher-better")).toBe("good");
    expect(changeToneFromDelta(-12, "higher-better")).toBe("bad");
  });

  it("keeps directionally ambiguous metrics neutral", () => {
    expect(changeToneFromDelta(3, "neutral")).toBe("neutral");
    expect(changeToneFromDelta(-3, "neutral")).toBe("neutral");
    expect(outcomeChangeDirection("admin-threshold:pain:custom")).toBe("neutral");
  });

  it("treats built-in trigger outcomes as adverse outcomes", () => {
    expect(outcomeChangeDirection("panic")).toBe("higher-worse");
    expect(outcomeChangeDirection("histamineFlare")).toBe("higher-worse");
    expect(changeToneFromDelta(15, outcomeChangeDirection("panic"))).toBe("bad");
    expect(changeToneFromDelta(-15, outcomeChangeDirection("panic"))).toBe("good");
  });

  it("keeps green/red result text authoritative over surrounding foreground rules", () => {
    expect(changeToneTextClass("good")).toContain("!text-emerald-700");
    expect(changeToneTextClass("bad")).toContain("!text-rose-600");
    expect(changeToneTextClass("neutral")).toContain("text-muted-foreground");
  });
});
