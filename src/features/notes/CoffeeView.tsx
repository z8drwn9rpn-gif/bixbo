import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "@/components/icons/BixboIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/useI18n";
import type { BixboData, Note, RecipeData, RecipeSection } from "@/lib/storage";
import { parseRecipeNote } from "@/features/notes/RecipesView";

type UpdateFn = (updater: (data: BixboData) => BixboData) => void;
type CoffeeFilter = "all" | "favorites";
type ImportPreview = { key: string; title: string; recipe: RecipeData };

type CoffeeDraft = {
  id?: string;
  title: string;
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

function blankDraft(): CoffeeDraft {
  return {
    title: "",
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

function draftFromNote(note: Note): CoffeeDraft {
  const recipe = note.recipe;
  return {
    id: note.id,
    title: note.title,
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

function coffeeSearchText(note: Note): string {
  const recipe = note.recipe;
  if (!recipe) return note.title.toLowerCase();
  return [
    note.title,
    ...recipe.ingredientSections.flatMap((section) => [section.title ?? "", ...section.items]),
    ...recipe.method,
    ...(recipe.notes ?? []),
    ...(recipe.unassignedText ?? []),
    recipe.sourceText ?? "",
  ].join(" ").toLowerCase();
}

function CoffeeCupSketch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 92" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="53" cy="30" rx="35" ry="13" />
        <path d="M18 30c1 9 3 24 7 36 3 9 14 15 28 15s25-6 28-15c4-12 6-27 7-36" />
        <path d="M88 39c18-6 27 1 25 12-2 12-12 18-27 13M90 45c11-4 17 0 16 7-1 7-7 11-18 9" />
        <path d="M25 30c7-6 17-9 28-9 13 0 24 4 31 10" opacity=".7" />
        <path d="M34 33c4-6 10-8 16-5 3-8 12-8 16-1 7-2 12 2 13 7-6 4-14 7-24 7-9 0-16-3-21-8Z" />
        <path d="M53 31c-2 5-2 10 0 15M53 32c-6 1-10 4-12 8M53 37c6 0 11 3 14 7" opacity=".8" />
        <path d="M30 53c8 4 15 5 24 5M29 60c8 4 17 6 26 6M32 68c7 3 14 5 22 5" opacity=".42" />
        <path d="M67 53c5-1 9-3 13-5M67 60c5-1 9-3 12-5M65 68c5-1 9-3 11-5" opacity=".42" />
      </g>
    </svg>
  );
}

function MetaIcon({ kind }: { kind: "time" | "people" | "tag" }) {
  if (kind === "people") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.5 2.5 0 1 0 0-5M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M15 13c3 0 4.8 1.7 5.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
  }
  if (kind === "tag") {
    return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M4 12.5 12.5 4H19v6.5L10.5 19 4 12.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="16" cy="7" r="1.2" fill="currentColor" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CoffeeView({ data, update }: { data: BixboData; update: UpdateFn }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState<CoffeeFilter>("all");
  const [index, setIndex] = useState(0);
  const [editor, setEditor] = useState<CoffeeDraft | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [sourceNoteId, setSourceNoteId] = useState("");
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const coffees = useMemo(
    () => data.notebook.filter((note) => note.kind === "coffee" && note.recipe && !note.archived),
    [data.notebook],
  );
  const sourceNotes = useMemo(
    () => data.notebook.filter((note) => note.kind !== "recipe" && note.kind !== "coffee" && !note.archived),
    [data.notebook],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return coffees.filter((note) => {
      if (filter === "favorites" && !note.recipe?.favorite) return false;
      return !needle || coffeeSearchText(note).includes(needle);
    });
  }, [coffees, filter, query]);

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
    if (!editor?.title.trim()) return;
    const ingredientSections = editorTextToSections(editor.ingredients);
    const method = editor.method.split("\n").map((line) => line.trim()).filter(Boolean);
    const notes = editor.notes.split("\n").map((line) => line.trim()).filter(Boolean);
    const now = Date.now();
    const recipe: RecipeData = {
      ...editor.source,
      category: "other",
      ingredientSections,
      method,
      notes: notes.length ? notes : undefined,
      prepMinutes: numericOrUndefined(editor.prepMinutes),
      cookMinutes: numericOrUndefined(editor.cookMinutes),
      temperatureC: numericOrUndefined(editor.temperatureC),
      portions: editor.portions.trim() || undefined,
      favorite: editor.favorite || undefined,
      status: method.length && ingredientSections.length ? "ready" : "draft",
    };

    update((currentData) => {
      if (editor.id) {
        return {
          ...currentData,
          notebook: currentData.notebook.map((note) => note.id === editor.id
            ? { ...note, kind: "coffee", title: editor.title.trim(), recipe, updatedAt: now }
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
        kind: "coffee",
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

  const deleteCoffee = (note: Note) => {
    if (!window.confirm(t("Delete this coffee? This cannot be undone."))) return;
    update((currentData) => ({ ...currentData, notebook: currentData.notebook.filter((saved) => saved.id !== note.id) }));
  };

  const deleteAllCoffee = () => {
    if (!coffees.length || !window.confirm(t("Delete all coffee? This cannot be undone."))) return;
    update((currentData) => ({ ...currentData, notebook: currentData.notebook.filter((saved) => saved.kind !== "coffee") }));
    setQuery("");
    setFilter("all");
    setIndex(0);
  };

  const analyzeNote = () => {
    const source = sourceNotes.find((note) => note.id === sourceNoteId);
    const parsed = source ? parseRecipeNote(source.content) : [];
    setPreview(parsed.map((item) => ({ key: item.key, title: item.title, recipe: { ...item.recipe, category: "other" } })));
  };

  const importCoffee = () => {
    const source = sourceNotes.find((note) => note.id === sourceNoteId);
    if (!source || !preview.length) return;
    const existing = new Set(
      data.notebook
        .filter((note) => note.kind === "coffee" && note.recipe?.sourceNoteId === source.id)
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
        kind: "coffee" as const,
        recipe: { ...item.recipe, category: "other", sourceNoteId: source.id },
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
          <button type="button" onClick={() => setEditor(null)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm text-muted-foreground hover:bg-tint"><ChevronLeft className="h-4 w-4" /> {t("Coffee")}</button>
          <Button className="rounded-full px-6" onClick={saveEditor} disabled={!editor.title.trim()}>{t("Save")}</Button>
        </div>

        <div className="relative mx-auto w-full max-w-[760px] pb-2 pr-2">
          <div aria-hidden="true" className="absolute inset-y-4 left-5 right-[-8px] translate-x-3 translate-y-3 rounded-[28px] border border-[#D8D1BF] bg-[#F4EEDF] shadow-sm" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#D4CCB8] bg-[#FBF7EC] px-5 pb-5 pt-4 text-[#303126] shadow-[0_10px_28px_rgba(70,62,43,0.12)] sm:px-7">
            <div className="absolute right-3 top-2 h-[78px] w-[102px] text-[#6E7447]"><CoffeeCupSketch className="h-full w-full" /></div>
            <div className="pr-24">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A8060]">{t(editor.id ? "Edit coffee" : "New coffee")}</p>
              <Input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder={t("Coffee name")} className="mt-1 h-auto rounded-none border-0 border-b border-[#CFC5AD] bg-transparent px-0 py-2 text-[30px] leading-none text-[#2E3025] shadow-none focus-visible:ring-0" style={{ fontFamily: '"Snell Roundhand", "Segoe Script", "Bradley Hand", cursive' }} />
            </div>

            <div className="mt-4 grid grid-cols-[0.82fr_0.82fr_1.08fr_1.28fr] border-y border-[#CFC5AD] py-3 text-[#45483A]">
              <label className="min-w-0 border-r border-[#D8D0BC] pr-2"><span className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="time" />{t("Prep")}</span><Input inputMode="numeric" placeholder="—" value={editor.prepMinutes} onChange={(event) => setEditor({ ...editor, prepMinutes: event.target.value })} className="mt-1 h-8 rounded-none border-0 bg-transparent px-0 text-sm font-bold shadow-none focus-visible:ring-0" /></label>
              <label className="min-w-0 border-r border-[#D8D0BC] px-2"><span className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="time" />{t("Cook")}</span><div className="flex items-center gap-1"><Input inputMode="numeric" placeholder="—" value={editor.cookMinutes} onChange={(event) => setEditor({ ...editor, cookMinutes: event.target.value })} className="mt-1 h-8 min-w-0 rounded-none border-0 bg-transparent px-0 text-sm font-bold shadow-none focus-visible:ring-0" /><Input inputMode="numeric" placeholder="°C" value={editor.temperatureC} onChange={(event) => setEditor({ ...editor, temperatureC: event.target.value })} className="mt-1 h-8 w-12 rounded-none border-0 bg-transparent px-0 text-[11px] font-bold shadow-none focus-visible:ring-0" /></div></label>
              <label className="min-w-0 border-r border-[#D8D0BC] px-2"><span className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="people" />{t("Portions")}</span><Input placeholder="—" value={editor.portions} onChange={(event) => setEditor({ ...editor, portions: event.target.value })} className="mt-1 h-8 rounded-none border-0 bg-transparent px-0 text-sm font-bold shadow-none focus-visible:ring-0" /></label>
              <div className="min-w-0 pl-2"><span className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="tag" />{t("Category")}</span><p className="mt-2 truncate text-[11px] font-bold">{t("Coffee")}</p></div>
            </div>

            <div className="mt-5 grid grid-cols-[0.9fr_1.1fr] divide-x divide-[#CFC5AD]">
              <div className="min-w-0 pr-4"><p className="mb-2 text-sm font-bold">{t("Ingredients")}</p><Textarea rows={16} value={editor.ingredients} onChange={(event) => setEditor({ ...editor, ingredients: event.target.value })} placeholder={t("One ingredient per line") } className="min-h-[390px] resize-y border-0 bg-transparent px-0 py-0 text-[12px] leading-7 shadow-none focus-visible:ring-0" /></div>
              <div className="min-w-0 pl-4"><p className="mb-2 text-sm font-bold">{t("Method")}</p><Textarea rows={16} value={editor.method} onChange={(event) => setEditor({ ...editor, method: event.target.value })} placeholder={t("One step per line")} className="min-h-[390px] resize-y border-0 bg-transparent px-0 py-0 text-[12px] leading-7 shadow-none focus-visible:ring-0" /></div>
            </div>

            <div className="mt-4 border-t border-[#CFC5AD] pt-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold">{t("Notes")}</p><button type="button" onClick={() => setEditor({ ...editor, favorite: !editor.favorite })} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-[#CBC3AF] ${editor.favorite ? "bg-[#7C8A43] text-white" : "bg-[#F5F0E4] text-[#555A3E]"}`}>{t(editor.favorite ? "Favorite" : "Add to favorites")}</button></div><Textarea rows={3} value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} className="mt-2 resize-y border-[#D8D0BC] bg-white/25 text-xs shadow-none focus-visible:ring-[#87944D]" /></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-4">
      <div className="flex justify-end -mb-1"><button type="button" onClick={() => { if (searchOpen) { setQuery(""); setFilter("all"); } setSearchOpen(!searchOpen); }} aria-label={t("Search coffee")} aria-expanded={searchOpen} className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition ${searchOpen ? "border-primary bg-primary text-primary-foreground" : "border-[#D4CCB8] bg-[#FBF7EC] text-[#555A3E]"}`}><Search className="h-4 w-4" />{t("Search")}</button></div>

      {searchOpen ? <div className="space-y-2 rounded-[22px] border border-border/60 bg-surface/70 p-3 shadow-sm"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search coffee…")} className="h-11 rounded-2xl border-border/70 bg-background pl-10 pr-11 shadow-none" />{query ? <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground hover:bg-tint"><X className="h-4 w-4" /></button> : null}</div><div className="flex gap-2"><button type="button" onClick={() => setFilter("all")} className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-border ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("All")}</button><button type="button" onClick={() => setFilter("favorites")} className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-border ${filter === "favorites" ? "bg-primary text-primary-foreground" : "bg-tint"}`}>{t("Favorites")}</button></div></div> : null}

      {importOpen ? <div className="rounded-[28px] border border-border/70 bg-surface p-4 shadow-sm ring-1 ring-border/60"><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-xl">{t("Import coffee")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("The original note stays unchanged. Nothing is deleted.")}</p></div><button type="button" onClick={() => setImportOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-tint"><X className="h-4 w-4" /></button></div><div className="mt-4 space-y-3"><select value={sourceNoteId} onChange={(event) => { setSourceNoteId(event.target.value); setPreview([]); }} className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm"><option value="">{t("Choose source note")}</option>{sourceNotes.map((note) => <option key={note.id} value={note.id}>{note.title.trim() || t("Untitled")}</option>)}</select><Button variant="outline" className="w-full" disabled={!sourceNoteId} onClick={analyzeNote}>{t("Analyze note")}</Button>{preview.length ? <><div className="rounded-2xl bg-tint p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Coffee cards found")}</p><p className="mt-1 text-xl font-bold">{preview.length}</p></div><div className="max-h-64 space-y-2 overflow-y-auto pr-1">{preview.map((item) => <div key={item.key} className="rounded-2xl border border-border/60 bg-background px-3 py-2"><p className="truncate text-sm font-semibold">{item.title}</p></div>)}</div><Button className="w-full" onClick={importCoffee}>{t("Import coffee")}</Button></> : null}</div></div> : null}

      {!importOpen && current?.recipe ? <div className="relative mx-auto w-full max-w-[760px] touch-pan-y pb-5 pr-5" onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return; move(dx < 0 ? 1 : -1); }}>
        <div aria-hidden="true" className="absolute bottom-0 left-8 right-0 top-8 translate-x-5 rounded-[28px] border border-[#D6CFBD] bg-[#F0E9D9] shadow-sm" /><div aria-hidden="true" className="absolute bottom-2 left-4 right-2 top-4 translate-x-2.5 rounded-[28px] border border-[#D8D1BF] bg-[#F7F1E5] shadow-sm" />
        <article className="relative z-10 overflow-hidden rounded-[28px] border border-[#D4CCB8] bg-[#FBF7EC] px-5 pb-5 pt-4 text-[#303126] shadow-[0_12px_30px_rgba(70,62,43,0.14)] sm:px-7">
          <div className="absolute right-3 top-2 h-[82px] w-[106px] text-[#6E7447]"><CoffeeCupSketch className="h-full w-full" /></div><div className="min-h-[76px] pr-24"><h2 className="min-w-0 text-[31px] leading-[1.05] text-[#2E3025] sm:text-[36px]" style={{ fontFamily: '"Snell Roundhand", "Segoe Script", "Bradley Hand", cursive' }}>{current.title}</h2></div>
          <div className="mt-2 grid grid-cols-[0.82fr_0.82fr_1.08fr_1.28fr] border-y border-[#CFC5AD] py-3 text-[#45483A]">
            <div className="min-w-0 border-r border-[#D8D0BC] pr-2"><p className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="time" />{t("Prep")}</p><p className="mt-1 text-[12px] font-bold">{current.recipe.prepMinutes != null ? `${current.recipe.prepMinutes} min` : "—"}</p></div>
            <div className="min-w-0 border-r border-[#D8D0BC] px-2"><p className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="time" />{t("Cook")}</p><p className="mt-1 text-[12px] font-bold">{current.recipe.cookMinutes != null ? `${current.recipe.cookMinutes} min` : "—"}{current.recipe.temperatureC != null ? <span className="block text-[9px] font-bold text-[#777B61]">{current.recipe.temperatureC} °C</span> : null}</p></div>
            <div className="min-w-0 border-r border-[#D8D0BC] px-2"><p className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="people" />{t("Portions")}</p><p className="mt-1 truncate text-[12px] font-bold">{current.recipe.portions || "—"}</p></div>
            <div className="min-w-0 pl-2"><p className="flex items-center gap-0.5 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.06em] text-[#7B8063]"><MetaIcon kind="tag" />{t("Category")}</p><p className="mt-1 truncate text-[11px] font-bold">{t("Coffee")}</p></div>
          </div>
          <div className="mt-5 grid grid-cols-[0.9fr_1.1fr] divide-x divide-[#CFC5AD]"><section className="min-w-0 pr-4"><h3 className="text-sm font-bold">{t("Ingredients")}</h3>{current.recipe.ingredientSections.length ? <div className="mt-2 space-y-3">{current.recipe.ingredientSections.map((section, sectionIndex) => <div key={`${section.title ?? "ingredients"}-${sectionIndex}`}>{section.title ? <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#778044]">{section.title}</p> : null}<ul className="text-[12px] leading-5">{section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`} className="flex min-h-7 gap-2 border-b border-[#DDD5C3] py-1"><span className="text-[#7B8843]">•</span><span className="min-w-0">{item}</span></li>)}</ul></div>)}</div> : <p className="mt-2 text-xs text-[#777B68]">{t("No ingredients added yet.")}</p>}</section><section className="min-w-0 pl-4"><h3 className="text-sm font-bold">{t("Method")}</h3>{current.recipe.method.length ? <ol className="mt-2">{current.recipe.method.map((step, stepIndex) => <li key={`${step}-${stepIndex}`} className="flex min-h-10 gap-2 border-b border-[#DDD5C3] py-1.5 text-[12px] leading-5"><span className="w-4 shrink-0 font-bold text-[#778044]">{stepIndex + 1}</span><span className="min-w-0">{step}</span></li>)}</ol> : <p className="mt-2 text-xs text-[#777B68]">{t("No method added yet.")}</p>}</section></div>
          {current.recipe.notes?.length ? <section className="mt-4 border-t border-[#CFC5AD] pt-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#6F744E]">{t("Notes")}</h3><div className="mt-1 space-y-1 text-[11px] leading-relaxed text-[#595C4B]">{current.recipe.notes.map((note, noteIndex) => <p key={`${note}-${noteIndex}`}>{note}</p>)}</div></section> : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => setEditor(draftFromNote(current))} className="rounded-full border border-[#C9C0AA] bg-white/30 px-3 py-1.5 text-[10px] font-semibold text-[#555A3E]">{t("Edit coffee")}</button><button type="button" onClick={() => toggleFavorite(current)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ring-1 ring-[#C9C0AA] ${current.recipe.favorite ? "bg-[#7C8A43] text-white" : "bg-white/25 text-[#555A3E]"}`}>{t("Favorite")}</button><button type="button" onClick={() => deleteCoffee(current)} className="rounded-full border border-destructive/35 bg-destructive/5 px-3 py-1.5 text-[10px] font-semibold text-destructive">{t("Delete coffee")}</button></div>
        </article>
      </div> : !importOpen ? <div className="relative mx-auto w-full max-w-[760px] pb-5 pr-5"><div aria-hidden="true" className="absolute bottom-0 left-8 right-0 top-8 translate-x-5 rounded-[28px] border border-[#D6CFBD] bg-[#F0E9D9]" /><div aria-hidden="true" className="absolute bottom-2 left-4 right-2 top-4 translate-x-2.5 rounded-[28px] border border-[#D8D1BF] bg-[#F7F1E5]" /><div className="relative z-10 grid min-h-[390px] place-items-center rounded-[28px] border border-[#D4CCB8] bg-[#FBF7EC] px-8 text-center shadow-[0_12px_30px_rgba(70,62,43,0.12)]"><div><CoffeeCupSketch className="mx-auto h-24 w-28 text-[#73794E]" /><p className="mt-4 text-sm text-[#696C5C]">{query ? t("No coffee matches your search.") : t("No coffee yet. Import a note or create your first coffee card.")}</p></div></div></div> : null}

      {!importOpen && filtered.length > 0 ? <div className="mx-auto flex w-full max-w-[460px] items-center justify-between gap-3 px-2"><button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("Previous coffee")} className="grid h-12 w-12 place-items-center rounded-full border border-border/70 bg-surface text-foreground shadow-sm disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button><span className="rounded-full bg-tint px-4 py-2 text-xs font-semibold text-muted-foreground">{index + 1} / {filtered.length}</span><button type="button" onClick={() => move(1)} disabled={index >= filtered.length - 1} aria-label={t("Next coffee")} className="grid h-12 w-12 place-items-center rounded-full border border-border/70 bg-surface text-foreground shadow-sm disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button></div> : null}

      {!importOpen ? <div className="flex flex-col items-center gap-2 pt-1"><Button className="h-14 w-full max-w-[320px] rounded-full text-base font-semibold shadow-sm" onClick={() => setEditor(blankDraft())}><Plus className="h-5 w-5" />{t("New coffee")}</Button><button type="button" onClick={() => { setImportOpen(true); setPreview([]); }} className="min-h-10 rounded-full px-4 text-xs font-semibold text-muted-foreground hover:bg-tint">{t("Import from Notes")}</button>{coffees.length > 0 ? <button type="button" onClick={deleteAllCoffee} className="min-h-10 rounded-full px-4 text-xs font-semibold text-destructive hover:bg-destructive/5">{t("Delete all coffee")}</button> : null}</div> : null}
    </section>
  );
}
