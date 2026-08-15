import { describe, expect, it } from "vitest";
import fs from "node:fs";

import { changeToneFromDelta, changeToneTextClass } from "@/lib/patternChangeSemantics";

const patternsPart1 = fs.readFileSync("src/features/patterns/PatternsContentViewPart1.tsx", "utf8");
const patternsCss = fs.readFileSync("src/patterns-restore.css", "utf8");
const rootSource = fs.readFileSync("src/routes/__root.tsx", "utf8");
const authSource = fs.readFileSync("src/routes/auth.tsx", "utf8");

describe("Patterns restored presentation", () => {
  it("keeps adverse metrics green when they decrease and red when they increase", () => {
    expect(changeToneFromDelta(-4, "higher-worse")).toBe("good");
    expect(changeToneFromDelta(17, "higher-worse")).toBe("bad");
    expect(changeToneFromDelta(5, "higher-better")).toBe("good");
    expect(changeToneFromDelta(-5, "higher-better")).toBe("bad");
    expect(changeToneFromDelta(0, "higher-worse")).toBe("neutral");
  });

  it("uses explicit semantic classes that cannot be erased by theme ordering", () => {
    expect(changeToneTextClass("good")).toContain("bixbo-pattern-tone-good");
    expect(changeToneTextClass("bad")).toContain("bixbo-pattern-tone-bad");
    expect(patternsCss).toContain(".bixbo-pattern-tone-good");
    expect(patternsCss).toContain("#15803d !important");
    expect(patternsCss).toContain(".bixbo-pattern-tone-bad");
    expect(patternsCss).toContain("#e11d48 !important");
    expect(rootSource).toContain('import patternsRestoreCss from "../patterns-restore.css?url"');
    expect(rootSource).toContain('{ rel: "stylesheet", href: patternsRestoreCss }');
  });

  it("retains the explanatory text for every monthly accordion", () => {
    expect(patternsPart1).toContain('title="Panic & tetany"\n              subtitle="Monthly frequency and intensity comparison"');
    expect(patternsPart1).toContain('<CollapsibleSection title="Symptoms" subtitle="Hot flashes, headaches and pressure"');
    expect(patternsPart1).toContain('title="Lifestyle & routines"\n              subtitle="Sleep, weight, medication and workouts"');
    expect(patternsPart1).toContain('title="Hormones"\n              subtitle="PCOS and histamine changes"');
    expect(patternsCss).toContain("section > button[aria-expanded] > div > h2");
    expect(patternsCss).toContain("section > button[aria-expanded] > div > p");
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
