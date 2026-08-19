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
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setEditor(null)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm text-muted-foreground hover:bg-tint">
            <ChevronLeft className="h-4 w-4" /> {t("Recipes")}
          </button>
          <Button onClick={saveEditor} disabled={!editor.title.trim()}>{t("Save")}</Button>
        </div>
        <div className="rounded-[28px] border border-border/70 bg-surface p-4 shadow-sm ring-1 ring-border/60">
          <div className="space-y-4">
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">{t("Recipe name")}</p><Input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} /></div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("Category")}</p>
              <div className="flex flex-wrap gap-2">{(Object.keys(CATEGORY_LABELS) as RecipeCategory[]).map((category) => <button key={category} type="button" onClick={() => setEditor({ ...editor, category })} className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-border ${editor.category === category ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t(CATEGORY_LABELS[category])}</button>)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input inputMode="numeric" placeholder={t("Prep min")} value={editor.prepMinutes} onChange={(event) => setEditor({ ...editor, prepMinutes: event.target.value })} />
              <Input inputMode="numeric" placeholder={t("Cook min")} value={editor.cookMinutes} onChange={(event) => setEditor({ ...editor, cookMinutes: event.target.value })} />
              <Input inputMode="numeric" placeholder={t("Temperature °C")} value={editor.temperatureC} onChange={(event) => setEditor({ ...editor, temperatureC: event.target.value })} />
              <Input placeholder={t("Portions")} value={editor.portions} onChange={(event) => setEditor({ ...editor, portions: event.target.value })} />
            </div>
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">{t("Ingredients")}</p><Textarea rows={10} value={editor.ingredients} onChange={(event) => setEditor({ ...editor, ingredients: event.target.value })} placeholder={t("One ingredient per line. Use ## Cesto for sections.")} /></div>
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">{t("Method")}</p><Textarea rows={10} value={editor.method} onChange={(event) => setEditor({ ...editor, method: event.target.value })} placeholder={t("One step per line")}/></div>
            <div><p className="mb-1 text-xs font-semibold text-muted-foreground">{t("Notes")}</p><Textarea rows={5} value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} /></div>
            <button type="button" onClick={() => setEditor({ ...editor, favorite: !editor.favorite })} className={`rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-border ${editor.favorite ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t(editor.favorite ? "Favorite" : "Add to favorites")}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(true); setPreview([]); }}>{t("Import from Notes")}</Button>
        <Button className="flex-1" onClick={() => setEditor(blankEditor())}><Plus className="h-4 w-4" />{t("New recipe")}</Button>
      </div>

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
          className="relative touch-pan-y"
          onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
          onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return; move(dx < 0 ? 1 : -1); }}
        >
          <div aria-hidden="true" className="absolute inset-0 translate-y-5 scale-[0.94] rounded-[30px] border border-border/40 bg-tint/60" />
          <div aria-hidden="true" className="absolute inset-0 translate-y-2.5 scale-[0.97] rounded-[30px] border border-border/50 bg-surface" />
          <article className="relative z-10 overflow-hidden rounded-[30px] border border-border/70 bg-surface p-5 shadow-md ring-1 ring-border/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{t(CATEGORY_LABELS[current.recipe.category])}</p><h2 className="mt-1 font-serif text-2xl leading-tight">{current.title}</h2><p className="mt-1 text-[10px] text-muted-foreground">{t(statusLabel(current.recipe.status))}</p></div>
              <button type="button" onClick={() => toggleFavorite(current)} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold ring-1 ring-border ${current.recipe.favorite ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t(current.recipe.favorite ? "Favorite" : "Favorite")}</button>
            </div>
            {(current.recipe.prepMinutes != null || current.recipe.cookMinutes != null || current.recipe.temperatureC != null || current.recipe.portions) ? <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">{current.recipe.prepMinutes != null ? <span className="rounded-full bg-tint px-2.5 py-1">{t("Prep")} {current.recipe.prepMinutes} min</span> : null}{current.recipe.cookMinutes != null ? <span className="rounded-full bg-tint px-2.5 py-1">{t("Cook")} {current.recipe.cookMinutes} min</span> : null}{current.recipe.temperatureC != null ? <span className="rounded-full bg-tint px-2.5 py-1">{current.recipe.temperatureC} °C</span> : null}{current.recipe.portions ? <span className="rounded-full bg-tint px-2.5 py-1">{current.recipe.portions}</span> : null}</div> : null}
            <div className="my-4 border-t border-border/60" />
            <div className="space-y-5">
              <section><h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{t("Ingredients")}</h3>{current.recipe.ingredientSections.length ? <div className="mt-2 space-y-3">{current.recipe.ingredientSections.map((section, sectionIndex) => <div key={`${section.title ?? "ingredients"}-${sectionIndex}`}>{section.title ? <p className="mb-1 text-xs font-semibold text-primary">{section.title}</p> : null}<ul className="space-y-1 text-sm leading-relaxed text-foreground/85">{section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`} className="flex gap-2"><span className="text-primary">•</span><span>{item}</span></li>)}</ul></div>)}</div> : <p className="mt-2 text-sm text-muted-foreground">{t("No ingredients added yet.")}</p>}</section>
              <section><h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{t("Method")}</h3>{current.recipe.method.length ? <ol className="mt-2 space-y-2">{current.recipe.method.map((step, stepIndex) => <li key={`${step}-${stepIndex}`} className="flex gap-3 text-sm leading-relaxed"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{stepIndex + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">{t("No method added yet.")}</p>}</section>
              {current.recipe.notes?.length ? <section><h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{t("Notes")}</h3><div className="mt-2 space-y-1 text-sm leading-relaxed text-foreground/80">{current.recipe.notes.map((note, noteIndex) => <p key={`${note}-${noteIndex}`}>{note}</p>)}</div></section> : null}
              {current.recipe.unassignedText?.length ? <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3"><h3 className="text-xs font-bold text-destructive">{t("Needs review")}</h3><div className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">{current.recipe.unassignedText.map((line, lineIndex) => <p key={`${line}-${lineIndex}`}>{line}</p>)}</div></section> : null}
            </div>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-4"><Button variant="outline" size="sm" onClick={() => setEditor(editorFromNote(current))}>{t("Edit recipe")}</Button><span className="text-xs font-semibold text-muted-foreground">{index + 1} / {filtered.length}</span></div>
          </article>
        </div>
      ) : !importOpen ? <div className="rounded-[28px] border border-border/70 bg-surface px-5 py-12 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border/60">{query ? t("No recipes match your search.") : t("No recipes yet. Import a note or create your first recipe.")}</div> : null}

      {!importOpen && filtered.length > 1 ? <div className="flex items-center justify-center gap-3"><button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("Previous recipe")} className="grid h-11 w-11 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><p className="text-xs text-muted-foreground">{t("Swipe left or right")}</p><button type="button" onClick={() => move(1)} disabled={index >= filtered.length - 1} aria-label={t("Next recipe")} className="grid h-11 w-11 place-items-center rounded-full bg-tint text-foreground ring-1 ring-border disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div> : null}
    </section>
  );
}
