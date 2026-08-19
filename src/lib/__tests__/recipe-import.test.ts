import { describe, expect, test } from "bun:test";
import { parseRecipeNote } from "@/features/notes/RecipesView";

describe("recipe note import", () => {
  test("splits categories, keeps source text, and marks placeholders as drafts", () => {
    const source = `
BAKING

Banánový chlieb
- 2 banány
- 300 g múky

POSTUP:
1. Banány rozpuč.
2. Peč 40 minút.

Deň a Noc
— recept čoskoro —

COOKING

Lasagna Soup
- 1 kg mleté mäso
- paradajky

POSTUP:
1. Uvar základ.
2. Pridaj cestoviny.
`;

    const recipes = parseRecipeNote(source);

    expect(recipes.map((recipe) => recipe.title)).toEqual([
      "Banánový chlieb",
      "Deň a Noc",
      "Lasagna Soup",
    ]);
    expect(recipes[0].recipe.category).toBe("baking");
    expect(recipes[0].recipe.status).toBe("ready");
    expect(recipes[0].recipe.sourceText).toContain("2 banány");
    expect(recipes[1].recipe.status).toBe("draft");
    expect(recipes[2].recipe.category).toBe("cooking");
  });

  test("flags the known oil mismatch for review instead of guessing", () => {
    const source = `BAKING\n\nMrkvový Koláč\n- 90 g slnečnicového oleja\n\nPOSTUP:\n1. Prilej kokosový olej.`;
    const [recipe] = parseRecipeNote(source);
    expect(recipe.recipe.status).toBe("needs-review");
    expect(recipe.recipe.sourceText).toContain("slnečnicového oleja");
    expect(recipe.recipe.sourceText).toContain("kokosový olej");
  });
});
