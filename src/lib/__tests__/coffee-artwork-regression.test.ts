import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Coffee artwork regression", () => {
  it("forces Coffee cards to use the dedicated cup and blocks the legacy recipe pot", () => {
    const css = readFileSync("src/coffee-cup-fix.css", "utf8");
    const cup = readFileSync("public/bixbo-coffee-cup.svg", "utf8");
    const coffee = readFileSync("src/features/notes/CoffeeView.tsx", "utf8");
    const recipes = readFileSync("src/features/notes/RecipesView.tsx", "utf8");

    expect(coffee).toContain('viewBox="0 0 108 82"');
    expect(recipes).toContain('viewBox="0 0 92 72"');
    expect(css).toContain('svg[viewBox="0 0 108 82"]');
    expect(css).toContain('svg[viewBox="0 0 92 72"]');
    expect(css).toContain("article::after");
    expect(css).toContain('/bixbo-coffee-cup.svg?v=20260821-cup3');

    // The Coffee asset is a single-handle cup: no lid handle, no second side handle.
    expect(cup).toContain('M18 30h56v20');
    expect(cup).toContain('M74 36h8');
    expect(cup).not.toContain('M34 20h30');
    expect(cup).not.toContain('M23 34c-8-1');
  });
});
