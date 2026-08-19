import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { AppShell } from "@/components/AppShell";
import {
  FoodIcon,
  HeartIcon,
  NoteIcon,
  StarIcon,
  IcoText,
  type IconProps,
} from "@/components/icons/BixboIcons";
import { useBixbo, EMPTY, type Note, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Archive,
  ChevronLeft,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "@/components/icons/BixboIcons";
import { NoteEditor } from "./notes-editor";
import { RecipesView } from "@/features/notes/RecipesView";
import { useI18n } from "@/hooks/useI18n";
import { sanitizeNoteHtml } from "@/features/notes/noteText";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "BIXBO — Bixbo Note" },
      { name: "description", content: "Personal notes, folders, checklists and search." },
      { property: "og:title", content: "BIXBO — Bixbo Note" },
      { property: "og:description", content: "Personal notes, folders, checklists and search." },
    ],
  }),
  component: NotesPage,
});

type FolderIconComponent = (props: IconProps) => ReactElement;
type NotesView = "all" | "recipes" | "folders" | "archived";
type NoteColor = NonNullable<Note["color"]>;
type FolderIconKey = "note" | "health" | "idea" | "food";

const NOTE_COLORS: Record<NoteColor, string> = {
  default: "var(--surface)",
  olive: "rgba(142, 166, 41, 0.16)",
  sand: "rgba(226, 169, 19, 0.13)",
  rose: "rgba(217, 79, 120, 0.11)",
  blue: "rgba(77, 135, 214, 0.11)",
};

const NOTE_COLOR_KEYS = new Set<NoteColor>(["default", "olive", "sand", "rose", "blue"]);

function normalizeFolderForUi(folder: NoteFolder): NoteFolder {
  const raw = folder as unknown as Record<string, unknown>;
  return {
    ...folder,
    id: typeof raw.id === "string" && raw.id ? raw.id : "general",
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Folder",
    icon: typeof raw.icon === "string" ? raw.icon : "note",
  };
}

function normalizeNoteForUi(note: Note): Note {
  const raw = note as unknown as Record<string, unknown>;
  const checklistRaw = Array.isArray(raw.checklist) ? raw.checklist : [];
  const checklist = checklistRaw.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    return [{
      id: typeof entry.id === "string" && entry.id ? entry.id : `${String(raw.id ?? "note")}-item-${index}`,
      text: typeof entry.text === "string" ? entry.text : "",
      done: Boolean(entry.done),
    }];
  });
  const createdAt = Number(raw.createdAt);
  const updatedAt = Number(raw.updatedAt);
  const rawColor = typeof raw.color === "string" ? raw.color : "default";
  const color = NOTE_COLOR_KEYS.has(rawColor as NoteColor) ? rawColor as NoteColor : "default";

  return {
    ...note,
    id: typeof raw.id === "string" ? raw.id : "",
    folderId: typeof raw.folderId === "string" && raw.folderId ? raw.folderId : "general",
    title: typeof raw.title === "string" ? raw.title : "",
    content: typeof raw.content === "string" ? raw.content : "",
    checklist: checklist.length ? checklist : undefined,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined,
    pinned: Boolean(raw.pinned),
    archived: Boolean(raw.archived),
    color,
  };
}

function normalizeFolderIconKey(folder: Pick<NoteFolder, "name" | "icon">): FolderIconKey {
  const name = typeof folder.name === "string" ? folder.name.trim().toLowerCase() : "";
  const icon = typeof folder.icon === "string" ? folder.icon.trim().toLowerCase() : "";

  if (
    name.includes("health") ||
    name.includes("medical") ||
    icon === "💚" ||
    icon === "❤️" ||
    icon === "heart" ||
    icon === "health"
  ) {
    return "health";
  }

  if (
    name.includes("cook") ||
    name.includes("food") ||
    name.includes("recipe") ||
    icon.includes("🍳") ||
    icon.includes("🍲") ||
    icon.includes("🥘") ||
    icon === "food" ||
    icon === "cooking"
  ) {
    return "food";
  }

  if (
    name.includes("idea") ||
    name.includes("inspiration") ||
    icon === "💡" ||
    icon === "idea" ||
    icon === "star"
  ) {
    return "idea";
  }

  return "note";
}

function folderIconComponent(folder: Pick<NoteFolder, "name" | "icon">): FolderIconComponent {
  switch (normalizeFolderIconKey(folder)) {
    case "health":
      return HeartIcon;
    case "food":
      return FoodIcon;
    case "idea":
      return StarIcon;
    default:
      return NoteIcon;
  }
}

function FolderBixboIcon({
  folder,
  size = 44,
  className,
}: {
  folder: Pick<NoteFolder, "name" | "icon">;
  size?: number;
  className?: string;
}) {
  const Icon = folderIconComponent(folder);
  return <Icon size={size} className={className} />;
}

function stripHtml(html: unknown) {
  const safe = sanitizeNoteHtml(typeof html === "string" ? html : "");
  if (typeof document === "undefined") return safe.replace(/<[^>]+>/g, "");

  const el = document.createElement("div");
  el.innerHTML = safe;
  return el.textContent ?? "";
}

function formatNoteDate(note: Note, t: (key: string) => string, locale: string): string {
  const rawStamp = Number(note.updatedAt ?? note.createdAt);
  const stamp = Number.isFinite(rawStamp) && rawStamp > 0 ? rawStamp : Date.now();
  const date = new Date(stamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t("Yesterday");

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function notePreview(note: Note, t: (key: string) => string): string {
  const text = stripHtml(note.content).trim();
  if (text) return text;

  const checklist = Array.isArray(note.checklist) ? note.checklist : [];
  if (checklist.length) {
    const complete = checklist.filter((item) => Boolean(item?.done)).length;
    return `${complete}/${checklist.length} ${t("checklist items complete")}`;
  }

  return t("No additional text");
}

function NoteFoodGlyph({
  kind,
  size = 16,
}: {
  kind: "avocado" | "banana" | "cupcake" | "bread";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    className: "inline-block shrink-0 align-[-0.15em]",
  };

  if (kind === "avocado") {
    return (
      <svg {...common} fill="none" aria-hidden="true">
        <ellipse cx="32" cy="56" rx="15" ry="3" fill="#1c2a12" opacity=".10" />
        <path d="M34 7C47 14 52 28 46 42c-5 11-13 16-22 13C14 52 11 42 15 31 20 19 25 10 34 7Z" fill="#7fb34d" />
        <path d="M34 12c9 7 12 17 8 28-3 8-9 12-16 10-7-2-9-9-6-17 4-10 8-17 14-21Z" fill="#cfe57b" />
        <circle cx="29" cy="37" r="9" fill="#8a5633" />
        <circle cx="26" cy="34" r="3" fill="#c58b61" opacity=".55" />
        <path d="M35 8c2-3 5-4 8-3" stroke="#4f7f35" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "banana") {
    return (
      <svg {...common} fill="none" aria-hidden="true">
        <ellipse cx="32" cy="56" rx="17" ry="3" fill="#1c2a12" opacity=".10" />
        <path d="M13 22c5 17 18 27 34 24 5-1 8-4 9-8-14 5-27-1-34-15-2-4-6-5-9-1Z" fill="#f4cf45" stroke="#c69d25" strokeWidth="1.5" />
        <path d="M20 24c6 12 17 18 29 16" stroke="#fff3a4" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <path d="M12 20c2-2 4-3 7-2" stroke="#7c6c2b" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "cupcake") {
    return (
      <svg {...common} fill="none" aria-hidden="true">
        <ellipse cx="32" cy="56" rx="15" ry="3" fill="#1c2a12" opacity=".10" />
        <path d="M20 31h24l-3 22H23l-3-22Z" fill="#d98c67" />
        <path d="M23 35h18" stroke="#f4c7a8" strokeWidth="2" opacity=".7" />
        <path d="M20 31c0-6 5-10 11-10 2-6 11-5 12 2 5 1 7 4 7 8H20Z" fill="#f2a3b9" />
        <circle cx="35" cy="16" r="3" fill="#d53b4b" />
      </svg>
    );
  }

  return (
    <svg {...common} fill="none" aria-hidden="true">
      <ellipse cx="32" cy="56" rx="16" ry="3" fill="#1c2a12" opacity=".10" />
      <rect x="12" y="21" width="40" height="31" rx="8" fill="#d39a55" />
      <path d="M17 29c3-8 10-12 18-12s15 4 18 12" fill="#f0c77c" />
      <path d="M18 28h28" stroke="#fff0c3" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

function NoteRichText({ text, size = 16 }: { text: unknown; size?: number }) {
  const value = typeof text === "string" ? text : "";
  const special = /([🥑🍌🧁🍞])/gu;
  const parts = value.split(special);

  return (
    <span>
      {parts.map((part, index) => {
        if (part === "🥑") return <NoteFoodGlyph key={index} kind="avocado" size={size} />;
        if (part === "🍌") return <NoteFoodGlyph key={index} kind="banana" size={size} />;
        if (part === "🧁") return <NoteFoodGlyph key={index} kind="cupcake" size={size} />;
        if (part === "🍞") return <NoteFoodGlyph key={index} kind="bread" size={size} />;
        return <IcoText key={index} text={part} size={size} />;
      })}
    </span>
  );
}

function NotesPage() {
  const { t, language } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const safeFolders = useMemo(() => view.folders.map(normalizeFolderForUi), [view.folders]);
  const safeNotebook = useMemo(() => view.notebook.map(normalizeNoteForUi), [view.notebook]);

  const [screen, setScreen] = useState<NotesView>("all");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const sanitizedNotebook = data.notebook.map((note) => {
      const normalized = normalizeNoteForUi(note);
      return { ...normalized, content: sanitizeNoteHtml(normalized.content) };
    });

    const normalizedFolders = data.folders.map((folder) => {
      const normalized = normalizeFolderForUi(folder);
      const semanticIcon = normalizeFolderIconKey(normalized);
      return normalized.icon === semanticIcon ? normalized : { ...normalized, icon: semanticIcon };
    });

    const notebookChanged = JSON.stringify(sanitizedNotebook) !== JSON.stringify(data.notebook);
    const foldersChanged = JSON.stringify(normalizedFolders) !== JSON.stringify(data.folders);

    if (!notebookChanged && !foldersChanged) return;

    update((current) => ({
      ...current,
      notebook: notebookChanged ? sanitizedNotebook : current.notebook,
      folders: foldersChanged ? normalizedFolders : current.folders,
    }));
  }, [hydrated, data.folders, data.notebook, update]);

  const createNote = (folderId = openFolder ?? "general") => {
    const note: Note = {
      id: crypto.randomUUID(),
      folderId,
      title: "",
      content: "",
      createdAt: Date.now(),
      pinned: false,
      archived: false,
      color: "default",
    };

    update((current) => ({ ...current, notebook: [note, ...current.notebook] }));
    setOpenNote(note.id);
  };

  const togglePinned = (id: string) => {
    update((current) => ({
      ...current,
      notebook: current.notebook.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note,
      ),
    }));
    setMenuNoteId(null);
  };

  const toggleArchived = (id: string) => {
    update((current) => ({
      ...current,
      notebook: current.notebook.map((note) =>
        note.id === id ? { ...note, archived: !note.archived, pinned: false, updatedAt: Date.now() } : note,
      ),
    }));
    setMenuNoteId(null);
  };

  const deleteNote = (id: string) => {
    if (!confirm(t("Delete this note?"))) return;
    update((current) => ({
      ...current,
      notebook: current.notebook.filter((note) => note.id !== id),
    }));
    setMenuNoteId(null);
  };

  const activeFolder = openFolder ? safeFolders.find((folder) => folder.id === openFolder) : undefined;

  const searchedNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return safeNotebook
      .filter((note) => {
        if (note.kind === "recipe") return false;
        if (screen === "archived") {
          if (!note.archived) return false;
        } else if (note.archived) {
          return false;
        }

        if (openFolder && note.folderId !== openFolder) return false;
        if (!normalizedQuery) return true;

        const checklistText = Array.isArray(note.checklist)
          ? note.checklist.map((item) => typeof item?.text === "string" ? item.text : "").join(" ")
          : "";
        return `${note.title} ${stripHtml(note.content)} ${checklistText}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);
      });
  }, [openFolder, query, safeNotebook, screen]);

  const pinnedNotes = searchedNotes.filter((note) => note.pinned);
  const regularNotes = searchedNotes.filter((note) => !note.pinned);

  if (openNote) {
    const note = safeNotebook.find((item) => item.id === openNote);

    if (!note) {
      return (
        <AppShell title={t("Bixbo Note")}>
          <div className="px-5 py-8 text-sm text-muted-foreground">
            {t("This note could not be found.")}
            <button
              type="button"
              onClick={() => setOpenNote(null)}
              className="mt-4 block rounded-2xl bg-primary px-4 py-2 font-semibold text-primary-foreground"
            >
              {t("Back to notes")}
            </button>
          </div>
        </AppShell>
      );
    }

    return <NoteEditor note={note} folders={safeFolders} onBack={() => setOpenNote(null)} update={update} />;
  }

  const addFolder = () => {
    const name = prompt(t("Folder name"));
    if (!name?.trim()) return;

    const folder: NoteFolder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      icon: "note",
    };

    update((current) => ({ ...current, folders: [...current.folders, folder] }));
  };

  const deleteFolder = (id: string) => {
    if (!confirm(t("Delete this folder? Notes will be moved to General."))) return;

    update((current) => ({
      ...current,
      folders: current.folders.filter((folder) => folder.id !== id),
      notebook: current.notebook.map((note) =>
        note.folderId === id ? { ...note, folderId: "general", updatedAt: Date.now() } : note,
      ),
    }));

    if (openFolder === id) setOpenFolder(null);
  };

  const title = activeFolder ? (
    <button onClick={() => setOpenFolder(null)} className="flex min-w-0 items-center gap-2">
      <ChevronLeft className="h-5 w-5 shrink-0" />
      <FolderBixboIcon folder={activeFolder} size={24} />
      <span className="truncate">{activeFolder.name}</span>
    </button>
  ) : screen === "recipes" ? (
    "Recipes"
  ) : (
    "Bixbo Note"
  );

  return (
    <AppShell
      title={title}
      right={screen === "recipes" && !openFolder ? undefined : (
        <button
          type="button"
          onClick={() => createNote()}
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition active:scale-95"
          aria-label={t("New note")}
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
    >
      <div className="mx-auto w-full max-w-[980px] space-y-5 px-5 pt-3 pb-[calc(104px+env(safe-area-inset-bottom))] lg:px-0 lg:pb-12">
        {screen !== "recipes" && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search notes…")}
              className="h-12 rounded-2xl border-border/70 bg-surface pl-10 pr-11 shadow-sm ring-1 ring-border/70"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("Clear search")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {!openFolder && (
          <>
            <div className="mx-auto grid w-full max-w-[560px] grid-cols-2 gap-1 rounded-full bg-tint p-1 ring-1 ring-border/60">
              {[
                { key: "all" as const, label: "Notes" },
                { key: "recipes" as const, label: "Recipes" },
              ].map((item) => {
                const active = item.key === "recipes" ? screen === "recipes" : screen !== "recipes";
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setScreen(item.key)}
                    className={`min-h-11 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "bg-surface text-foreground shadow-sm ring-1 ring-border/50" : "text-foreground/70"
                    }`}
                  >
                    {t(item.label)}
                  </button>
                );
              })}
            </div>
            {screen !== "recipes" ? (
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setScreen("folders")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${screen === "folders" ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground"}`}>{t("Folders")}</button>
                <button type="button" onClick={() => setScreen("archived")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${screen === "archived" ? "bg-primary text-primary-foreground" : "bg-tint text-muted-foreground"}`}>{t("Archive")}</button>
              </div>
            ) : null}
          </>
        )}

        {screen === "recipes" && !openFolder ? (
          <RecipesView data={view} update={update} />
        ) : screen === "folders" && !openFolder ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-2xl">{t("Folders")}</h2>
              <Button size="sm" variant="outline" onClick={addFolder}>
                <Plus className="h-4 w-4" />
                {t("Folder")}
              </Button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-sm ring-1 ring-border/80">
              {safeFolders.map((folder, index) => {
                const count = safeNotebook.filter((note) => note.kind !== "recipe" && note.folderId === folder.id && !note.archived).length;

                return (
                  <div
                    key={folder.id}
                    className={`flex items-center gap-3 px-4 py-3 ${index ? "border-t border-border/60" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFolder(folder.id);
                        setScreen("all");
                      }}
                      className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
                        <FolderBixboIcon folder={folder} size={30} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} {count === 1 ? t("note") : t("notes")}
                        </span>
                      </span>

                      <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                    </button>

                    {folder.id !== "general" && (
                      <button
                        type="button"
                        onClick={() => deleteFolder(folder.id)}
                        className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition hover:bg-tint hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${t("Delete")} ${folder.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <NoteSection
                title={t("Pinned")}
                notes={pinnedNotes}
                menuNoteId={menuNoteId}
                setMenuNoteId={setMenuNoteId}
                onOpen={setOpenNote}
                onPin={togglePinned}
                onArchive={toggleArchived}
                onDelete={deleteNote}
              />
            )}

            <NoteSection
              title={screen === "archived" ? "Archived" : (activeFolder?.name ?? "All Notes")}
              notes={regularNotes}
              menuNoteId={menuNoteId}
              setMenuNoteId={setMenuNoteId}
              onOpen={setOpenNote}
              onPin={togglePinned}
              onArchive={toggleArchived}
              onDelete={deleteNote}
              emptyText={
                query
                  ? "No notes match your search."
                  : screen === "archived"
                    ? "No archived notes."
                    : "No notes yet. Tap + to create one."
              }
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

function NoteSection({
  title,
  notes,
  menuNoteId,
  setMenuNoteId,
  onOpen,
  onPin,
  onArchive,
  onDelete,
  emptyText,
}: {
  title: string;
  notes: Note[];
  menuNoteId: string | null;
  setMenuNoteId: (id: string | null) => void;
  onOpen: (id: string) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  emptyText?: string;
}) {
  const { t, language } = useI18n();
  const locale = language === "sk" ? "sk-SK" : "en-GB";
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title === "Pinned" && <Pin className="h-3.5 w-3.5" />}
        {t(typeof title === "string" ? title : "All Notes")}
      </h2>

      {notes.length === 0 ? (
        <div className="rounded-3xl border border-border/70 bg-surface px-5 py-10 text-center text-sm leading-relaxed text-muted-foreground shadow-sm ring-1 ring-border/70">
          {t(emptyText ?? "No notes.")}
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <article
              key={note.id}
              className="relative overflow-visible rounded-3xl border border-border/65 p-4 shadow-sm ring-1 ring-border/70 transition-shadow hover:shadow-md"
              style={{ background: NOTE_COLORS[note.color ?? "default"] ?? NOTE_COLORS.default }}
            >
              <button type="button" onClick={() => onOpen(note.id)} className="block min-h-[58px] w-full pr-9 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-1 max-h-[1.45em] overflow-hidden text-sm font-semibold [&>span]:inline [&_svg]:inline-block [&_svg]:align-[-0.15em]">
                    <NoteRichText text={note.title.trim() || t("Untitled")} size={16} />
                  </h3>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatNoteDate(note, t, locale)}</span>
                </div>

                <p className="mt-1 line-clamp-2 max-h-[2.9em] overflow-hidden whitespace-normal text-xs leading-relaxed text-muted-foreground [&>span]:inline [&_svg]:inline-block [&_svg]:align-[-0.15em]">
                  <NoteRichText text={notePreview(note, t)} size={14} />
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMenuNoteId(menuNoteId === note.id ? null : note.id)}
                className="absolute right-1.5 top-6 grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("Note options")}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuNoteId === note.id && (
                <div className="absolute right-2 top-16 z-20 w-44 overflow-hidden rounded-2xl border border-border/70 bg-background/98 shadow-xl ring-1 ring-border backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => onPin(note.id)}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {note.pinned ? t("Unpin") : t("Pin")}
                  </button>

                  <button
                    type="button"
                    onClick={() => onArchive(note.id)}
                    className="flex min-h-11 w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-xs transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Archive className="h-4 w-4" />
                    {note.archived ? t("Restore") : t("Archive")}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="flex min-h-11 w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-xs text-destructive transition hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
