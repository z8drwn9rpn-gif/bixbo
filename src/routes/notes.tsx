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
import { useI18n } from "@/hooks/useI18n";

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
type NotesView = "all" | "folders" | "archived";
type NoteColor = NonNullable<Note["color"]>;
type FolderIconKey = "note" | "health" | "idea" | "food";

const NOTE_COLORS: Record<NoteColor, string> = {
  default: "var(--surface)",
  olive: "rgba(142, 166, 41, 0.16)",
  sand: "rgba(226, 169, 19, 0.13)",
  rose: "rgba(217, 79, 120, 0.11)",
  blue: "rgba(77, 135, 214, 0.11)",
};

function normalizeFolderIconKey(folder: Pick<NoteFolder, "name" | "icon">): FolderIconKey {
  const name = folder.name.trim().toLowerCase();
  const icon = folder.icon?.trim().toLowerCase() ?? "";

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

const SAFE_NOTE_TAGS = new Set(["B", "STRONG", "MARK", "BR", "P", "DIV", "UL", "OL", "LI"]);
const DROP_NOTE_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG", "SVG", "MATH", "LINK", "META"]);

function sanitizeNoteHtml(html: string): string {
  if (!html) return "";

  if (typeof document === "undefined") {
    return html
      .replace(/<(script|style|iframe|object|embed|img|svg|math|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(script|style|iframe|object|embed|img|svg|math|link|meta)\b[^>]*\/?\s*>/gi, "")
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript\s*:/gi, "");
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const cleanNode = (node: Node) => {
    for (const child of [...node.childNodes]) cleanNode(child);
    if (!(node instanceof HTMLElement)) return;

    if (DROP_NOTE_TAGS.has(node.tagName)) {
      node.remove();
      return;
    }

    if (!SAFE_NOTE_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);

    if (node.tagName === "MARK") {
      node.style.background = "#b4be80";
      node.style.color = "#2f3518";
      node.style.padding = "0 2px";
      node.style.borderRadius = "2px";
    }
  };

  for (const child of [...template.content.childNodes]) cleanNode(child);
  return template.innerHTML;
}

function stripHtml(html: string) {
  const safe = sanitizeNoteHtml(html);
  if (typeof document === "undefined") return safe.replace(/<[^>]+>/g, "");

  const el = document.createElement("div");
  el.innerHTML = safe;
  return el.textContent ?? "";
}

function formatNoteDate(note: Note): string {
  const stamp = note.updatedAt ?? note.createdAt;
  const date = new Date(stamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function notePreview(note: Note): string {
  const text = stripHtml(note.content).trim();
  if (text) return text;

  if (note.checklist?.length) {
    const complete = note.checklist.filter((item) => item.done).length;
    return `${complete}/${note.checklist.length} checklist items complete`;
  }

  return "No additional text";
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

function NoteRichText({ text, size = 16 }: { text: string; size?: number }) {
  const special = /([🥑🍌🧁🍞])/gu;
  const parts = text.split(special);

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
  const { t } = useI18n();
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;

  const [screen, setScreen] = useState<NotesView>("all");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const sanitizedNotebook = data.notebook.map((note) => ({
      ...note,
      content: sanitizeNoteHtml(note.content ?? ""),
    }));

    const normalizedFolders = data.folders.map((folder) => {
      const semanticIcon = normalizeFolderIconKey(folder);
      return folder.icon === semanticIcon ? folder : { ...folder, icon: semanticIcon };
    });

    const notebookChanged = sanitizedNotebook.some(
      (note, index) => note.content !== data.notebook[index]?.content,
    );
    const foldersChanged = normalizedFolders.some(
      (folder, index) => folder.icon !== data.folders[index]?.icon,
    );

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
    if (!confirm("Delete this note?")) return;
    update((current) => ({
      ...current,
      notebook: current.notebook.filter((note) => note.id !== id),
    }));
    setMenuNoteId(null);
  };

  const activeFolder = openFolder ? view.folders.find((folder) => folder.id === openFolder) : undefined;

  const searchedNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return view.notebook
      .filter((note) => {
        if (screen === "archived") {
          if (!note.archived) return false;
        } else if (note.archived) {
          return false;
        }

        if (openFolder && note.folderId !== openFolder) return false;
        if (!normalizedQuery) return true;

        return `${note.title} ${stripHtml(note.content)} ${note.checklist?.map((item) => item.text).join(" ") ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);
      });
  }, [openFolder, query, screen, view.notebook]);

  const pinnedNotes = searchedNotes.filter((note) => note.pinned);
  const regularNotes = searchedNotes.filter((note) => !note.pinned);

  if (openNote) {
    const note = view.notebook.find((item) => item.id === openNote);

    if (!note) {
      return (
        <AppShell title="Bixbo Note">
          <div className="px-5 py-8 text-sm text-muted-foreground">
            This note could not be found.
            <button
              type="button"
              onClick={() => setOpenNote(null)}
              className="mt-4 block rounded-2xl bg-primary px-4 py-2 font-semibold text-primary-foreground"
            >
              Back to notes
            </button>
          </div>
        </AppShell>
      );
    }

    return <NoteEditor note={note} folders={view.folders} onBack={() => setOpenNote(null)} update={update} />;
  }

  const addFolder = () => {
    const name = prompt("Folder name");
    if (!name?.trim()) return;

    const folder: NoteFolder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      icon: "note",
    };

    update((current) => ({ ...current, folders: [...current.folders, folder] }));
  };

  const deleteFolder = (id: string) => {
    if (!confirm("Delete this folder? Notes will be moved to General.")) return;

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
  ) : (
    "Bixbo Note"
  );

  return (
    <AppShell
      title={title}
      right={
        <button
          type="button"
          onClick={() => createNote()}
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition active:scale-95"
          aria-label="New note"
        >
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      <div className="space-y-5 px-5 pt-3 pb-[calc(104px+env(safe-area-inset-bottom))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes…"
            className="h-11 rounded-2xl bg-surface pl-10 pr-10 ring-1 ring-border/70"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!openFolder && (
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-primary/15 p-1">
            {[
              { key: "all" as const, label: "Notes" },
              { key: "folders" as const, label: "Folders" },
              { key: "archived" as const, label: "Archive" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setScreen(item.key)}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                  screen === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/75"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {screen === "folders" && !openFolder ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-2xl">{t("Folders")}</h2>
              <Button size="sm" variant="outline" onClick={addFolder}>
                <Plus className="h-4 w-4" />
                Folder
              </Button>
            </div>

            <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-border/80">
              {view.folders.map((folder, index) => {
                const count = view.notebook.filter((note) => note.folderId === folder.id && !note.archived).length;

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
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tint ring-1 ring-border/50">
                        <FolderBixboIcon folder={folder} size={30} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} {count === 1 ? "note" : "notes"}
                        </span>
                      </span>

                      <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                    </button>

                    {folder.id !== "general" && (
                      <button
                        type="button"
                        onClick={() => deleteFolder(folder.id)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-tint hover:text-destructive"
                        aria-label={`Delete ${folder.name}`}
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
                title="Pinned"
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
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title === "Pinned" && <Pin className="h-3.5 w-3.5" />}
        {title}
      </h2>

      {notes.length === 0 ? (
        <div className="rounded-3xl bg-surface px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-border/70">
          {emptyText ?? "No notes."}
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <article
              key={note.id}
              className="relative overflow-visible rounded-3xl p-4 shadow-sm ring-1 ring-border/70"
              style={{ background: NOTE_COLORS[note.color ?? "default"] }}
            >
              <button type="button" onClick={() => onOpen(note.id)} className="block w-full pr-8 text-left">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-1 text-sm font-semibold">
                    <NoteRichText text={note.title.trim() || "Untitled"} size={16} />
                  </h3>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatNoteDate(note)}</span>
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  <NoteRichText text={notePreview(note)} size={14} />
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMenuNoteId(menuNoteId === note.id ? null : note.id)}
                className="absolute right-2 top-8 rounded-full p-1.5 text-muted-foreground hover:bg-background/60"
                aria-label="Note options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuNoteId === note.id && (
                <div className="absolute right-2 top-14 z-20 w-44 overflow-hidden rounded-2xl bg-background shadow-xl ring-1 ring-border">
                  <button
                    type="button"
                    onClick={() => onPin(note.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-tint"
                  >
                    {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {note.pinned ? "Unpin" : "Pin"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onArchive(note.id)}
                    className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-xs hover:bg-tint"
                  >
                    <Archive className="h-4 w-4" />
                    {note.archived ? "Restore" : "Archive"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-xs text-destructive hover:bg-tint"
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