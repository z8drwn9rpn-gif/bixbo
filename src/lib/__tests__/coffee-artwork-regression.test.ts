import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vintage Recipes and Coffee artwork regression", () => {
  it("renders dedicated vintage artwork and blocks legacy inline sketches", () => {
    const css = readFileSync("src/coffee-cup-fix.css", "utf8");
    const cup = readFileSync("public/bixbo-vintage-coffee-cup.svg", "utf8");
    const pot = readFileSync("public/bixbo-vintage-recipe-pot.svg", "utf8");
    const runtime = readFileSync("public/bixbo-offline-runtime.js", "utf8");
    const coffee = readFileSync("src/features/notes/CoffeeView.tsx", "utf8");
    const recipes = readFileSync("src/features/notes/RecipesView.tsx", "utf8");

    expect(coffee).toContain('viewBox="0 0 108 82"');
    expect(recipes).toContain('viewBox="0 0 92 72"');

    expect(css).toContain('svg[viewBox="0 0 108 82"]');
    expect(css).toContain('svg[viewBox="0 0 92 72"]');
    expect(css).toContain('/bixbo-vintage-coffee-cup.svg?v=20260821-vintage1');
    expect(css).toContain('/bixbo-vintage-recipe-pot.svg?v=20260821-vintage1');

    expect(cup).toContain('id="vintage-coffee-cup"');
    expect(cup).toContain('id="cup-botanical"');
    expect(pot).toContain('id="vintage-recipe-pot"');
    expect(pot).toContain('id="pot-botanical"');

    expect(runtime).toContain('const BIXBO_RUNTIME_CACHE_PREFIX = "bixbo-runtime-"');
    expect(runtime).toContain('BIXBO_RUNTIME_CACHE_PREFIX}v3');
    expect(runtime).toContain('/bixbo-vintage-coffee-cup.svg');
    expect(runtime).toContain('/bixbo-vintage-recipe-pot.svg');
  });
});
