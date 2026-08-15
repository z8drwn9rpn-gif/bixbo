import { describe, expect, it } from "vitest";
import fs from "node:fs";

import { changeToneFromDelta, changeToneTextClass } from "@/lib/patternChangeSemantics";

const patternsPart1 = fs.readFileSync("src/features/patterns/PatternsContentViewPart1.tsx", "utf8");
const authSource = fs.readFileSync("src/routes/auth.tsx", "utf8");

describe("Patterns semantic presentation", () => {
  it("treats decreases in adverse symptoms as good and increases as bad", () => {
    expect(changeToneFromDelta(-4, "higher-worse")).toBe("good");
    expect(changeToneFromDelta(17, "higher-worse")).toBe("bad");
    expect(changeToneFromDelta(5, "higher-better")).toBe("good");
    expect(changeToneFromDelta(-5, "higher-better")).toBe("bad");
    expect(changeToneFromDelta(0, "higher-worse")).toBe("neutral");
  });

  it("keeps improvement and worsening text colors explicit", () => {
    expect(changeToneTextClass("good")).toContain("!text-emerald-700");
    expect(changeToneTextClass("bad")).toContain("!text-rose-600");
  });

  it("retains explanations for every monthly section", () => {
    expect(patternsPart1).toContain('subtitle="Monthly frequency and intensity comparison"');
    expect(patternsPart1).toContain('subtitle="Hot flashes, headaches and pressure"');
    expect(patternsPart1).toContain('subtitle="Sleep, weight, medication and workouts"');
    expect(patternsPart1).toContain('subtitle="PCOS and histamine changes"');
  });
});

describe("Google OAuth callback feedback", () => {
  it("does not silently discard provider callback errors", () => {
    expect(authSource).toContain("search.error_description");
    expect(authSource).toContain("search.error_code");
    expect(authSource).toContain("callbackErrorMessage");
    expect(authSource).toContain("OAuth client configuration was rejected");
  });
});
