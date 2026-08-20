import type {} from "./types";

export type RecipeCategory = "baking" | "cooking" | "spreads" | "other";
export type RecipeStatus = "ready" | "draft" | "needs-review";

export interface RecipeSection {
  title?: string;
  items: string[];
}

export interface RecipeData {
  category: RecipeCategory;
  ingredientSections: RecipeSection[];
  method: string[];
  notes?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  temperatureC?: number;
  portions?: string;
  favorite?: boolean;
  status?: RecipeStatus;
  sourceNoteId?: string;
  /** Verbatim source block retained so every imported card can be audited. */
  sourceText?: string;
  /** Source lines the conservative importer could not classify safely. */
  unassignedText?: string[];
}

declare module "./types" {
  interface Note {
    /** Recipes and coffee cards share the synced notebook store but render in dedicated views. */
    kind?: "note" | "recipe" | "coffee";
    recipe?: RecipeData;
  }
}
