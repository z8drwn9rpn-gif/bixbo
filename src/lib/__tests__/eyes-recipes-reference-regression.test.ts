import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const read = (path: string) => readFileSync(path, "utf8");

describe("approved Eyes and Recipes UI contracts", () => {
  it("keeps the Eyes pain controls inside Pain Episodes", () => {
    const eyes = read("src/features/logging/EyesForm.tsx");
    const field = read("src/features/logging/EyesEpisodeField.tsx");
    expect(field).toContain('label="Eyes?"');
    expect(field).toContain("Yes — log it");
    expect(eyes).toContain('label="Pain intensity"');
    expect(eyes).toContain("How intense is the pain?");
    expect(eyes).toContain('label: "No pain"');
    expect(eyes).toContain('label: "Feeling something there"');
    expect(eyes).toContain('label: "Severe pain"');
    expect(eyes).toContain('label="Pain with eye movement"');
    expect(eyes).toContain("Does it hurt when you move your eyes?");
    expect(eyes).toContain("!embedded ? (");
  });

  it("keeps Recipes paper-card first while retaining on-demand search", () => {
    const recipes = read("src/features/notes/RecipesView.tsx");
    const notes = read("src/routes/notes.tsx");
    expect(notes).toContain('{ key: "recipes" as const, label: "Recipes" }');
    expect(recipes).toContain("RecipePotSketch");
    expect(recipes).toContain("RecipeSpoonSketch");
    expect(recipes).toContain("grid-cols-[0.9fr_1.1fr]");
    expect(recipes).toContain("touchStart.current");
    expect(recipes).toContain('t("New recipe")');
    expect(recipes).toContain("searchOpen");
    expect(recipes).toContain('aria-expanded={searchOpen}');
    expect(recipes).toContain('t("Search")');
  });
});
