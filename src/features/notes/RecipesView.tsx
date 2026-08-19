import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "@/components/icons/BixboIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import type {
  BixboData,
  Note,
  RecipeCategory,
  RecipeData,
  RecipeSection,
  RecipeStatus,
} from "@/lib/storage";

type UpdateFn = (updater: (data: BixboData) => BixboData) => void;
type Filter = "all" | RecipeCategory | "favorites";
type ParsedRecipe = { key: string; title: string; recipe: RecipeData };

type EditorDraft = {
  id?: string;
  title: string;
  category: RecipeCategory;
  ingredients: string;
  method: string;
  notes: string;
  prepMinutes: string;
  cookMinutes: string;
  temperatureC: string;
  portions: string;
  favorite: boolean;
  source?: RecipeData;
};

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  baking: "Baking",
  cooking: "Cooking",
  spreads: "Spreads",
  other: "Other",
};

const INGREDIENT_SECTION_HEADINGS = new Set([
  "cesto",
  "plnka",
  "spodok",
  "vrch",
  "nalev",
  "nálev",
  "poleva",
  "obalit v",
  "na vrch (nutné)",
  "na vrch",
  "škoricová náplň",
  "skoricova napln",
  "krémová poleva",
  "kremova poleva",
  "čokoládová poleva",
  "cokoladova poleva",
]);

function plainNoteText(content: string): string {
  const withBreaks = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n");
  if (typeof document === "undefined") {
    return withBreaks
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }
  const node = document.createElement("div");
  node.innerHTML = withBreaks;
  return node.textContent ?? "";
}

function normalizedHeading(value: string): string {
  return value
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/[*_]/g, "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
}

function categoryFromLine(value: string): RecipeCategory | null {
  const upper = value.replace(/[^A-Za-zÁ-ž]/g, " ").toUpperCase();
  if (/\bBAKING\b/.test(upper)) return "baking";
  if (/\bCOOKING\b/.test(upper)) return "cooking";
  if (/\bNATIERKY\b|\bNÁTIERKY\b|\bSPREADS\b/.test(upper)) return "spreads";
  return null;
}

function isBullet(value: string): boolean {
  return /^\s*[-*•]\s+/.test(value);
}

function isStep(value: string): boolean {
  return /^\s*\d+[.)]\s+/.test(value);
}

function isMethodHeading(value: string): boolean {
  const heading = normalizedHeading(value);
  return heading === "postup" || heading === "method" || heading === "tvarovanie a pečenie" || heading === "tvarovanie a pecenie";
}

function isIngredientsHeading(value: string): boolean {
  const heading = normalizedHeading(value);
  return heading === "suroviny" || heading === "ingrediencie" || heading === "ingredients";
}

function isNotesHeading(value: string): boolean {
  const heading = normalizedHeading(value);
  return heading === "tipy & skladovanie" || heading === "poznámky" || heading === "poznamky" || heading === "notes";
}

function isIngredientSectionHeading(value: string): boolean {
  return INGREDIENT_SECTION_HEADINGS.has(normalizedHeading(value));
}

function isPlaceholder(value: string): boolean {
  return /recept\s+(čoskoro|coskoro)|recipe\s+coming\s+soon/i.test(value);
}

function cleanTitle(value: string): string {
  return value
    .replace(/[*_#]/g, "")
    .replace(/^\s*[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "")
    .replace(/^[-—–]\s*/, "")
    .trim();
}

function nextNonEmpty(lines: string[], index: number): string | undefined {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (lines[cursor].trim()) return lines[cursor].trim();
  }
  return undefined;
}

function looksLikeRecipeTitle(lines: string[], index: number): boolean {
  const value = lines[index].trim();
  if (!value || categoryFromLine(value) || isBullet(value) || isStep(value)) return false;
  if (isMethodHeading(value) || isIngredientsHeading(value) || isNotesHeading(value) || isIngredientSectionHeading(value)) return false;
  if (/^\d/.test(value) || /°\s*c/i.test(value)) return false;
  if (value.length > 90) return false;

  const next = nextNonEmpty(lines, index);
  if (next && (isBullet(next) || isPlaceholder(next) || isIngredientsHeading(next))) return true;

  const words = cleanTitle(value).split(/\s+/).filter(Boolean);
  const previousBlank = index === 0 || !lines[index - 1].trim();
  const sentenceLike = /[.!?]$/.test(value) || /^(po|potom|nakoniec|môže|moze|podávame|podavame|dáme|dame|varíme|varime)\b/i.test(cleanTitle(value));
  return previousBlank && words.length > 0 && words.length <= 7 && !sentenceLike;
}

function parseIngredientSections(lines: string[]): RecipeSection[] {
  const sections: RecipeSection[] = [];
  let current: RecipeSection = { items: [] };

  const pushCurrent = () => {
    if (current.items.length || current.title) sections.push(current);
  };

  for (const raw of lines) {
    const value = raw.trim();
    if (!value || isIngredientsHeading(value)) continue;
    if (isIngredientSectionHeading(value)) {
      pushCurrent();
      current = { title: cleanTitle(value).replace(/:$/, ""), items: [] };
      continue;
    }
    if (isBullet(value)) {
      current.items.push(value.replace(/^\s*[-*•]\s+/, "").trim());
    }
  }
  pushCurrent();
  return sections.filter((section) => section.items.length > 0);
}

function parseRecipeBlock(titleLine: string, bodyLines: string[], category: RecipeCategory, key: string): ParsedRecipe {
  const title = cleanTitle(titleLine) || "Untitled recipe";
  const sourceText = [titleLine, ...bodyLines].join("\n").trim();
  let mode: "ingredients" | "method" | "notes" = "ingredients";
  const ingredientLines: string[] = [];
  const method: string[] = [];
  const notes: string[] = [];
  const unassigned: string[] = [];
  let temperatureC: number | undefined;

  for (const raw of bodyLines) {
    const value = raw.trim();
    if (!value) continue;
    if (isPlaceholder(value)) {
      notes.push(value);
      continue;
    }
    if (isIngredientsHeading(value)) {
      mode = "ingredients";
      continue;
    }
    if (isMethodHeading(value)) {
      mode = "method";
      continue;
    }
    if (isNotesHeading(value)) {
      mode = "notes";
      continue;
    }

    const temperature = value.match(/(\d{2,3})\s*°\s*C/i);
    if (temperature && temperatureC == null) temperatureC = Number(temperature[1]);

    if (mode === "ingredients" && (isBullet(value) || isIngredientSectionHeading(value))) {
      ingredientLines.push(value);
      continue;
    }
    if (isStep(value)) {
      mode = "method";
      method.push(value.replace(/^\s*\d+[.)]\s+/, "").trim());
      continue;
    }
    if (mode === "method") {
      notes.push(value);
      continue;
    }
    if (mode === "notes") {
      notes.push(value);
      continue;
    }

    if (/^[-—–]\s*/.test(value)) ingredientLines.push(value);
    else unassigned.push(value);
  }

  const ingredientSections = parseIngredientSections(ingredientLines);
  const placeholder = isPlaceholder(sourceText);
  const knownConflict = /slnečnicov/i.test(sourceText) && /kokosov/i.test(sourceText);
  let status: RecipeStatus = "ready";
  if (placeholder || !ingredientSections.length || !method.length) status = "draft";
  if (knownConflict || unassigned.length > 2) status = "needs-review";

  return {
    key,
    title,
    recipe: {
      category,
      ingredientSections,
      method,
      notes: notes.length ? notes : undefined,
      temperatureC,
      status,
      sourceText,
      unassignedText: unassigned.length ? unassigned : undefined,
    },
  };
}

export function parseRecipeNote(content: string): ParsedRecipe[] {
  const lines = plainNoteText(content).replace(/\r/g, "").split("\n");
  const recipes: ParsedRecipe[] = [];
  let category: RecipeCategory = "other";
  let start = -1;
  let titleLine = "";
  let blockCategory: RecipeCategory = category;

  const flush = (end: number) => {
    if (start < 0) return;
    const body = lines.slice(start + 1, end);
    recipes.push(parseRecipeBlock(titleLine, body, blockCategory, `recipe-${recipes.length}`));
    start = -1;
    titleLine = "";
  };

  for (let index = 0; index < lines.length; index += 1) {
    const categoryLine = categoryFromLine(lines[index]);
    if (categoryLine) {
      flush(index);
      category = categoryLine;
      continue;
    }
    if (!looksLikeRecipeTitle(lines, index)) continue;
    flush(index);
    start = index;
    titleLine = lines[index];
    blockCategory = category;
  }
  flush(lines.length);
  return recipes;
}

function recipeSearchText(note: Note): string {
  const recipe = note.recipe;
  if (!recipe) return note.title;
  return [
    note.title,
    CATEGORY_LABELS[recipe.category],
    ...recipe.ingredientSections.flatMap((section) => [section.title ?? "", ...section.items]),
    ...recipe.method,
    ...(recipe.notes ?? []),
    ...(recipe.unassignedText ?? []),
    recipe.sourceText ?? "",
  ].join(" ").toLowerCase();
}

function sectionsToEditorText(sections: RecipeSection[]): string {
  return sections
    .flatMap((section) => [
      ...(section.title ? [`## ${section.title}`] : []),
      ...section.items.map((item) => `- ${item}`),
    ])
    .join("\n");
}

function editorTextToSections(value: string): RecipeSection[] {
  const sections: RecipeSection[] = [];
  let current: RecipeSection = { items: [] };
  const push = () => {
    if (current.items.length || current.title) sections.push(current);
  };
  for (const raw of value.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      push();
      current = { title: line.slice(3).trim(), items: [] };
    } else {
      current.items.push(line.replace(/^[-*•]\s*/, ""));
    }
  }
  push();
  return sections.filter((section) => section.items.length > 0);
}

function numericOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
}

function blankEditor(): EditorDraft {
  return {
    title: "",
    category: "other",
    ingredients: "",
    method: "",
    notes: "",
    prepMinutes: "",
    cookMinutes: "",
    temperatureC: "",
    portions: "",
    favorite: false,
  };
}

function editorFromNote(note: Note): EditorDraft {
  const recipe = note.recipe;
  return {
    id: note.id,
    title: note.title,
    category: recipe?.category ?? "other",
    ingredients: sectionsToEditorText(recipe?.ingredientSections ?? []),
    method: (recipe?.method ?? []).join("\n"),
    notes: (recipe?.notes ?? []).join("\n"),
    prepMinutes: recipe?.prepMinutes != null ? String(recipe.prepMinutes) : "",
    cookMinutes: recipe?.cookMinutes != null ? String(recipe.cookMinutes) : "",
    temperatureC: recipe?.temperatureC != null ? String(recipe.temperatureC) : "",
    portions: recipe?.portions ?? "",
    favorite: Boolean(recipe?.favorite),
    source: recipe,
  };
}

function statusLabel(status?: RecipeStatus): string {
  if (status === "needs-review") return "Needs review";
  if (status === "draft") return "Draft";
  return "Ready";
}


function RecipePotSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 92 72" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 27h42l-3 31c-.4 4-3.6 7-7.6 7H36.6c-4 0-7.2-3-7.6-7L26 27Z" />
        <path d="M22 27h50M34 20h30M40 15c2-5 16-5 18 0M38 18h22" />
        <path d="M23 34c-8-1-10 2-9 6 1 4 5 6 11 5M71 34c8-1 10 2 9 6-1 4-5 6-11 5" />
        <path d="M37 36v18M47 34v23M57 36v18" opacity=".45" />
        <path d="M32 62c10 2 21 2 31 0" opacity=".55" />
      </g>
    </svg>
  );
}

function RecipeSpoonSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 28" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 14h94" />
        <path d="M106 14c0-7 7-11 17-11 9 0 15 5 15 11s-6 11-15 11c-10 0-17-4-17-11Z" />
        <path d="M112 14c3-4 10-6 19-4M112 16c5 3 12 4 20 2" opacity=".5" />
      </g>
    </svg>
  );
}

function RecipeMetaIcon({ kind }: { kind: "time" | "people" | "tag" }) {
  if (kind === "people") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.5 2.5 0 1 0 0-5M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M15 13c3 0 4.8 1.7 5.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "tag") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M4 12.5 12.5 4H19v6.5L10.5 19 4 12.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="16" cy="7" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RecipesView({ data, update }: { data: BixboData; update: UpdateFn }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [index, setIndex] = useState(0);
  const [editor, setEditor] = useState<EditorDraft | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sourceNoteId, setSourceNoteId] = useState("");
  const [preview, setPreview] = useState<ParsedRecipe[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const recipes = useMemo(
    () => data.notebook.filter((note) => note.kind === "recipe" && note.recipe && !note.archived),
    [data.notebook],
  );
  const sourceNotes = useMemo(
    () => data.notebook.filter((note) => note.kind !== "recipe" && !note.archived),
    [data.notebook],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((note) => {
      const recipe = note.recipe!;
      if (filter === "favorites" && !recipe.favorite) return false;
      if (filter !== "all" && filter !== "favorites" && recipe.category !== filter) return false;
      return !needle || recipeSearchText(note).includes(needle);
    });
  }, [filter, query, recipes]);

  useEffect(() => setIndex(0), [filter, query]);
  useEffect(() => {
    if (index >= filtered.length) setIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, index]);

  const current = filtered[index];
  const move = (delta: number) => {
    if (!filtered.length) return;
    setIndex((value) => Math.min(filtered.length - 1, Math.max(0, value + delta)));
  };

  const saveEditor = () => {
    if (!editor || !editor.title.trim()) return;
    const now = Date.now();
    const ingredientSections = editorTextToSections(editor.ingredients);
    const method = editor.method.split("\n").map((line) => line.trim()).filter(Boolean);
    const notes = editor.notes.split("\n").map((line) => line.trim()).filter(Boolean);
    const original = editor.source;
    const recipe: RecipeData = {
      ...original,
      category: editor.category,
      ingredientSections,
      method,
      notes: notes.length ? notes : undefined,
      prepMinutes: numericOrUndefined(editor.prepMinutes),
      cookMinutes: numericOrUndefined(editor.cookMinutes),
      temperatureC: numericOrUndefined(editor.temperatureC),
      portions: editor.portions.trim() || undefined,
      favorite: editor.favorite || undefined,
      status: original?.status === "needs-review" && original.unassignedText?.length ? "needs-review" : method.length && ingredientSections.length ? "ready" : "draft",
    };

    update((currentData) => {
      if (editor.id) {
        return {
          ...currentData,
          notebook: currentData.notebook.map((note) => note.id === editor.id
            ? { ...note, kind: "recipe", title: editor.title.trim(), recipe, updatedAt: now }
            : note),
        };
      }
      const note: Note = {
        id: crypto.randomUUID(),
        folderId: "general",
        title: editor.title.trim(),
        content: "",
        createdAt: now,
        updatedAt: now,
        kind: "recipe",
        recipe,
      };
      return { ...currentData, notebook: [note, ...currentData.notebook] };
    });
    setEditor(null);
  };

  const toggleFavorite = (note: Note) => {
    update((currentData) => ({
      ...currentData,
      notebook: currentData.notebook.map((saved) => saved.id === note.id && saved.recipe
        ? { ...saved, recipe: { ...saved.recipe, favorite: !saved.recipe.favorite }, updatedAt: Date.now() }
        : saved),
    }));
  };

  const analyzeNote = () => {
    const source = sourceNotes.find((note) => note.id === sourceNoteId);
    setPreview(source ? parseRecipeNote(source.content) : []);
  };

  const importRecipes = () => {
    const source = sourceNotes.find((note) => note.id === sourceNoteId);
    if (!source || !preview.length) return;
    const existing = new Set(
      data.notebook
        .filter((note) => note.kind === "recipe" && note.recipe?.sourceNoteId === source.id)
        .map((note) => `${note.title}\n${note.recipe?.sourceText ?? ""}`),
    );
    const now = Date.now();
    const imported: Note[] = preview
      .filter((item) => !existing.has(`${item.title}\n${item.recipe.sourceText ?? ""}`))
      .map((item, offset) => ({
        id: crypto.randomUUID(),
        folderId: "general",
        title: item.title,
        content: "",
        createdAt: now + offset,
        updatedAt: now + offset,
        kind: "recipe" as const,
        recipe: { ...item.recipe, sourceNoteId: source.id },
      }));
    update((currentData) => ({ ...currentData, notebook: [...imported, ...currentData.notebook] }));
    setImportOpen(false);
    setPreview([]);
    setSourceNoteId("");
    setFilter("all");
    setQuery("");
    setIndex(0);
  };

  if (editor) {
    return (
      <section className="space-y-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setEditor(null)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm text-muted-foreground hover:bg-tint">
            <ChevronLeft className="h-4 w-4" /> {t("Recipes")}
          </button>
          <Button className="rounded-full px-6" onClick={saveEditor} disabled={!editor.title.trim()}>{t("Save")}</Button>
        </div>

        <div className="relative mx-auto w-full max-w-[760px] pb-2 pr-2">
          <div aria-hidden="true" className="absolute inset-y-4 left-5 right-[-8px] translate-x-3 translate-y-3 rounded-[28px] border border-[#D8D1BF] bg-[#F4EEDF] shadow-sm" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#D4CCB8] bg-[#FBF7EC] px-5 pb-5 pt-4 text-[#303126] shadow-[0_10px_28px_rgba(70,62,43,0.12)] sm:px-7">
            <RecipePotSketch className="absolute right-4 top-3 h-[72px] w-[92px] text-[#6E7447] opacity-80" />

            <div className="pr-24">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A8060]">{t(editor.id ? "Edit recipe" : "New recipe")}</p>
              <Input
                value={editor.title}
                onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                placeholder={t("Recipe name")}
                className="mt-1 h-auto rounded-none border-0 border-b border-[#CFC5AD] bg-transparent px-0 py-2 text-[30px] leading-none text-[#2E3025] shadow-none focus-visible:ring-0"
                style={{ fontFamily: '"Snell Roundhand", "Segoe Script", "Bradley Hand", cursive' }}
              />
            </div>

            <div className="mt-4 grid grid-cols-4 border-y border-[#CFC5AD] py-3 text-[#45483A]">
              <label className="min-w-0 border-r border-[#D8D0BC] pr-2">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="time" />{t("Prep")}</span>
                <Input inputMode="numeric" placeholder="—" value={editor.prepMinutes} onChange={(event) => setEditor({ ...editor, prepMinutes: event.target.value })} className="mt-1 h-8 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
              </label>
              <label className="min-w-0 border-r border-[#D8D0BC] px-2">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="time" />{t("Cook")}</span>
                <div className="flex items-center gap-1">
                  <Input inputMode="numeric" placeholder="—" value={editor.cookMinutes} onChange={(event) => setEditor({ ...editor, cookMinutes: event.target.value })} className="mt-1 h-8 min-w-0 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
                  <Input inputMode="numeric" placeholder="°C" value={editor.temperatureC} onChange={(event) => setEditor({ ...editor, temperatureC: event.target.value })} className="mt-1 h-8 w-12 rounded-none border-0 bg-transparent px-0 text-[11px] shadow-none focus-visible:ring-0" />
                </div>
              </label>
              <label className="min-w-0 border-r border-[#D8D0BC] px-2">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="people" />{t("Portions")}</span>
                <Input placeholder="—" value={editor.portions} onChange={(event) => setEditor({ ...editor, portions: event.target.value })} className="mt-1 h-8 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
              </label>
              <label className="min-w-0 pl-2">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="tag" />{t("Category")}</span>
                <select value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value as RecipeCategory })} className="mt-1 h-8 w-full bg-transparent text-[11px] font-semibold outline-none">
                  {(Object.keys(CATEGORY_LABELS) as RecipeCategory[]).map((category) => <option key={category} value={category}>{t(CATEGORY_LABELS[category])}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-[0.9fr_1.1fr] divide-x divide-[#CFC5AD]">
              <div className="min-w-0 pr-4">
                <p className="mb-2 text-sm font-bold">{t("Ingredients")}</p>
                <div className="rounded-sm" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(137,124,88,.18) 28px)" }}>
                  <Textarea rows={16} value={editor.ingredients} onChange={(event) => setEditor({ ...editor, ingredients: event.target.value })} placeholder={t("One ingredient per line. Use ## Cesto for sections.")} className="min-h-[390px] resize-y border-0 bg-transparent px-0 py-0 text-[12px] leading-7 shadow-none focus-visible:ring-0" />
                </div>
              </div>
              <div className="min-w-0 pl-4">
                <p className="mb-2 text-sm font-bold">{t("Method")}</p>
                <div className="rounded-sm" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(137,124,88,.18) 28px)" }}>
                  <Textarea rows={16} value={editor.method} onChange={(event) => setEditor({ ...editor, method: event.target.value })} placeholder={t("One step per line")} className="min-h-[390px] resize-y border-0 bg-transparent px-0 py-0 text-[12px] leading-7 shadow-none focus-visible:ring-0" />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#CFC5AD] pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">{t("Notes")}</p>
                <button type="button" onClick={() => setEditor({ ...editor, favorite: !editor.favorite })} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-[#CBC3AF] ${editor.favorite ? "bg-[#7C8A43] text-white" : "bg-[#F5F0E4] text-[#555A3E]"}`}>{t(editor.favorite ? "Favorite" : "Add to favorites")}</button>
              </div>
              <Textarea rows={3} value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} className="mt-2 resize-y border-[#D8D0BC] bg-white/25 text-xs shadow-none focus-visible:ring-[#87944D]" />
            </div>

            <div className="mt-5 flex items-center justify-center gap-4 text-[#747B4D]">
              <span className="h-px flex-1 bg-[#CFC5AD]" />
              <RecipeSpoonSketch className="h-7 w-36" />
              <span className="h-px flex-1 bg-[#CFC5AD]" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search recipes…")} className="h-12 rounded-2xl border-border/70 bg-surface pl-10 pr-11 shadow-sm ring-1 ring-border/70" />
        {query ? <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground hover:bg-tint"><X className="h-4 w-4" /></button> : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {([
          ["all", "All"],
          ["baking", "Baking"],
          ["cooking", "Cooking"],
          ["spreads", "Spreads"],
          ["favorites", "Favorites"],
        ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-border ${filter === value ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t(label)}</button>)}
      </div>

      {importOpen ? (
        <div className="rounded-[28px] border border-border/70 bg-surface p-4 shadow-sm ring-1 ring-border/60">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-xl">{t("Import recipes")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("The original note stays unchanged. Nothing is deleted.")}</p></div><button type="button" onClick={() => setImportOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-tint"><X className="h-4 w-4" /></button></div>
          <div className="mt-4 space-y-3">
            <select value={sourceNoteId} onChange={(event) => { setSourceNoteId(event.target.value); setPreview([]); }} className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm">
              <option value="">{t("Choose source note")}</option>
              {sourceNotes.map((note) => <option key={note.id} value={note.id}>{note.title.trim() || t("Untitled")}</option>)}
            </select>
            <Button variant="outline" className="w-full" disabled={!sourceNoteId} onClick={analyzeNote}>{t("Analyze note")}</Button>
            {preview.length ? <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-tint p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Recipes found")}</p><p className="mt-1 text-xl font-bold">{preview.length}</p></div>
                <div className="rounded-2xl bg-tint p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Source preserved")}</p><p className="mt-1 text-xl font-bold">100%</p></div>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{preview.map((item) => <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-[10px] text-muted-foreground">{t(CATEGORY_LABELS[item.recipe.category])}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.recipe.status === "needs-review" ? "bg-destructive/10 text-destructive" : "bg-tint text-foreground"}`}>{t(statusLabel(item.recipe.status))}</span></div>)}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t("Every imported card keeps its original source block, and the source note itself is preserved. Drafts and ambiguous entries stay marked for review.")}</p>
              <Button className="w-full" onClick={importRecipes}>{t("Import recipes")}</Button>
            </> : null}
          </div>
        </div>
      ) : null}

      {!importOpen && current?.recipe ? (
        <div
          className="relative mx-auto w-full max-w-[760px] touch-pan-y pb-5 pr-5"
          onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
          onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return; move(dx < 0 ? 1 : -1); }}
        >
          <div aria-hidden="true" className="absolute bottom-0 left-8 right-0 top-8 translate-x-5 rounded-[28px] border border-[#D6CFBD] bg-[#F0E9D9] shadow-sm" />
          <div aria-hidden="true" className="absolute bottom-2 left-4 right-2 top-4 translate-x-2.5 rounded-[28px] border border-[#D8D1BF] bg-[#F7F1E5] shadow-sm" />
          <article className="relative z-10 overflow-hidden rounded-[28px] border border-[#D4CCB8] bg-[#FBF7EC] px-5 pb-5 pt-4 text-[#303126] shadow-[0_12px_30px_rgba(70,62,43,0.14)] sm:px-7">
            <RecipePotSketch className="absolute right-4 top-3 h-[74px] w-[94px] text-[#6E7447] opacity-85" />

            <div className="min-h-[76px] pr-24">
              <div className="flex items-start gap-2">
                <h2 className="min-w-0 flex-1 text-[31px] leading-[1.05] text-[#2E3025] sm:text-[36px]" style={{ fontFamily: '"Snell Roundhand", "Segoe Script", "Bradley Hand", cursive' }}>{current.title}</h2>
              </div>
              {current.recipe.status && current.recipe.status !== "ready" ? <p className={`mt-1 text-[10px] font-semibold ${current.recipe.status === "needs-review" ? "text-destructive" : "text-[#7D815F]"}`}>{t(statusLabel(current.recipe.status))}</p> : null}
            </div>

            <div className="mt-2 grid grid-cols-4 border-y border-[#CFC5AD] py-3 text-[#45483A]">
              <div className="min-w-0 border-r border-[#D8D0BC] pr-2">
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="time" />{t("Prep")}</p>
                <p className="mt-1 text-[12px] font-semibold">{current.recipe.prepMinutes != null ? `${current.recipe.prepMinutes} min` : "—"}</p>
              </div>
              <div className="min-w-0 border-r border-[#D8D0BC] px-2">
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="time" />{t("Cook")}</p>
                <p className="mt-1 text-[12px] font-semibold">{current.recipe.cookMinutes != null ? `${current.recipe.cookMinutes} min` : "—"}{current.recipe.temperatureC != null ? <span className="block text-[9px] font-medium text-[#777B61]">{current.recipe.temperatureC} °C</span> : null}</p>
              </div>
              <div className="min-w-0 border-r border-[#D8D0BC] px-2">
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="people" />{t("Portions")}</p>
                <p className="mt-1 truncate text-[12px] font-semibold">{current.recipe.portions || "—"}</p>
              </div>
              <div className="min-w-0 pl-2">
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7B8063]"><RecipeMetaIcon kind="tag" />{t("Category")}</p>
                <p className="mt-1 truncate text-[11px] font-semibold">{t(CATEGORY_LABELS[current.recipe.category])}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[0.9fr_1.1fr] divide-x divide-[#CFC5AD]">
              <section className="min-w-0 pr-4">
                <h3 className="text-sm font-bold">{t("Ingredients")}</h3>
                {current.recipe.ingredientSections.length ? <div className="mt-2 space-y-3">{current.recipe.ingredientSections.map((section, sectionIndex) => <div key={`${section.title ?? "ingredients"}-${sectionIndex}`}>{section.title ? <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#778044]">{section.title}</p> : null}<ul className="text-[12px] leading-5">{section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`} className="flex min-h-7 gap-2 border-b border-[#DDD5C3] py-1"><span className="text-[#7B8843]">•</span><span className="min-w-0">{item}</span></li>)}</ul></div>)}</div> : <p className="mt-2 text-xs text-[#777B68]">{t("No ingredients added yet.")}</p>}
              </section>

              <section className="min-w-0 pl-4">
                <h3 className="text-sm font-bold">{t("Method")}</h3>
                {current.recipe.method.length ? <ol className="mt-2">{current.recipe.method.map((step, stepIndex) => <li key={`${step}-${stepIndex}`} className="flex min-h-10 gap-2 border-b border-[#DDD5C3] py-1.5 text-[12px] leading-5"><span className="w-4 shrink-0 font-bold text-[#778044]">{stepIndex + 1}</span><span className="min-w-0">{step}</span></li>)}</ol> : <p className="mt-2 text-xs text-[#777B68]">{t("No method added yet.")}</p>}
              </section>
            </div>

            {current.recipe.notes?.length ? <section className="mt-4 border-t border-[#CFC5AD] pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#6F744E]">{t("Notes")}</h3><div className="mt-1 space-y-1 text-[11px] leading-relaxed text-[#595C4B]">{current.recipe.notes.map((note, noteIndex) => <p key={`${note}-${noteIndex}`}>{note}</p>)}</div></section> : null}
            {current.recipe.unassignedText?.length ? <section className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3"><h3 className="text-xs font-bold text-destructive">{t("Needs review")}</h3><div className="mt-1 space-y-1 text-[11px] leading-relaxed text-[#66685B]">{current.recipe.unassignedText.map((line, lineIndex) => <p key={`${line}-${lineIndex}`}>{line}</p>)}</div></section> : null}

            <div className="mt-5 flex items-center justify-center gap-4 text-[#747B4D]">
              <span className="h-px flex-1 bg-[#CFC5AD]" />
              <RecipeSpoonSketch className="h-7 w-36" />
              <span className="h-px flex-1 bg-[#CFC5AD]" />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setEditor(editorFromNote(current))} className="rounded-full border border-[#C9C0AA] bg-white/30 px-3 py-1.5 text-[10px] font-semibold text-[#555A3E]">{t("Edit recipe")}</button>
              <button type="button" onClick={() => toggleFavorite(current)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-[#C9C0AA] ${current.recipe.favorite ? "bg-[#7C8A43] text-white" : "bg-white/25 text-[#555A3E]"}`}>{t("Favorite")}</button>
            </div>
          </article>
        </div>
      ) : !importOpen ? (
        <div className="relative mx-auto w-full max-w-[760px] pb-5 pr-5">
          <div aria-hidden="true" className="absolute bottom-0 left-8 right-0 top-8 translate-x-5 rounded-[28px] border border-[#D6CFBD] bg-[#F0E9D9]" />
          <div aria-hidden="true" className="absolute bottom-2 left-4 right-2 top-4 translate-x-2.5 rounded-[28px] border border-[#D8D1BF] bg-[#F7F1E5]" />
          <div className="relative z-10 grid min-h-[390px] place-items-center rounded-[28px] border border-[#D4CCB8] bg-[#FBF7EC] px-8 text-center shadow-[0_12px_30px_rgba(70,62,43,0.12)]">
            <div><RecipePotSketch className="mx-auto h-20 w-24 text-[#73794E]" /><p className="mt-4 text-sm text-[#696C5C]">{query ? t("No recipes match your search.") : t("No recipes yet. Import a note or create your first recipe.")}</p></div>
          </div>
        </div>
      ) : null}

      {!importOpen && filtered.length > 0 ? (
        <div className="mx-auto flex w-full max-w-[460px] items-center justify-between gap-3 px-2">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("Previous recipe")} className="grid h-12 w-12 place-items-center rounded-full border border-border/70 bg-surface text-foreground shadow-sm disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
          <span className="rounded-full bg-tint px-4 py-2 text-xs font-semibold text-muted-foreground">{index + 1} / {filtered.length}</span>
          <button type="button" onClick={() => move(1)} disabled={index >= filtered.length - 1} aria-label={t("Next recipe")} className="grid h-12 w-12 place-items-center rounded-full border border-border/70 bg-surface text-foreground shadow-sm disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
        </div>
      ) : null}

      {!importOpen ? (
        <div className="flex flex-col items-center gap-2 pt-1">
          <Button className="h-14 w-full max-w-[320px] rounded-full text-base font-semibold shadow-sm" onClick={() => setEditor(blankEditor())}><Plus className="h-5 w-5" />{t("New recipe")}</Button>
          <button type="button" onClick={() => { setImportOpen(true); setPreview([]); }} className="min-h-10 rounded-full px-4 text-xs font-semibold text-muted-foreground hover:bg-tint">{t("Import from Notes")}</button>
        </div>
      ) : null}
    </section>
  );
}
