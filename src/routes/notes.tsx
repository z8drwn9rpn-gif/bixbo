import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { AppShell } from "@/components/AppShell";
import { FoodIcon, HeartIcon, NoteIcon, StarIcon, type IconProps } from "@/components/icons/BixboIcons";
import { useBixbo, EMPTY, type Note, type NoteChecklistItem, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Archive,
  Bold,
  Check,
  ChevronLeft,
  Folder,
  Highlighter,
  ListChecks,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — BIXBO" },
      { name: "description", content: "Personal notes, folders, checklists and search." },
      { property: "og:title", content: "Notes — BIXBO" },
      { property: "og:description", content: "Personal notes, folders, checklists and search." },
    ],
  }),
  component: NotesPage,
});

type FolderIconComponent = (props: IconProps) => ReactElement;
type NotesView = "all" | "folders" | "archived";
type NoteColor = NonNullable<Note["color"]>;

const NOTE_COLORS: Record<NoteColor, string> = {
  default: "var(--surface)",
  olive: "rgba(142, 166, 41, 0.16)",
  sand: "rgba(226, 169, 19, 0.13)",
  rose: "rgba(217, 79, 120, 0.11)",
  blue: "rgba(77, 135, 214, 0.11)",
};

function folderIconComponent(folder: Pick<NoteFolder, "name" | "icon">): FolderIconComponent {
  const name = folder.name.trim().toLowerCase();
  const legacyIcon = folder.icon?.trim().toLowerCase() ?? "";

  if (
    name.includes("health") ||
    name.includes("medical") ||
    legacyIcon === "💚" ||
    legacyIcon === "❤️" ||
    legacyIcon === "heart" ||
    legacyIcon === "health"
  ) {
    return HeartIcon;
  }

  if (
    name.includes("cook") ||
    name.includes("food") ||
    name.includes("recipe") ||
    legacyIcon.includes("🍳") ||
    legacyIcon.includes("🍲") ||
    legacyIcon === "food" ||
    legacyIcon === "cooking"
  ) {
    return FoodIcon;
  }

  if (
    name.includes("idea") ||
    name.includes("inspiration") ||
    legacyIcon === "💡" ||
    legacyIcon === "idea" ||
    legacyIcon === "star"
  ) {
    return StarIcon;
  }

  return NoteIcon;
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

function NotesPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;

  const [screen, setScreen] = useState<NotesView>("all");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const sanitized = data.notebook.map((note) => ({
      ...note,
      content: sanitizeNoteHtml(note.content ?? ""),
    }));

    const changed = sanitized.some((note, index) => note.content !== data.notebook[index]?.content);
    if (changed) update((current) => ({ ...current, notebook: sanitized }));
  }, [hydrated, data.notebook, update]);

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

  if (openNote) {
    const note = view.notebook.find((item) => item.id === openNote);

    if (!note) {
      setOpenNote(null);
      return null;
    }

    return <NoteEditor note={note} folders={view.folders} onBack={() => setOpenNote(null)} update={update} />;
  }

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
    "Notes"
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
              <h2 className="font-serif text-2xl">Folders</h2>
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
                  <h3 className="line-clamp-1 text-sm font-semibold">{note.title.trim() || "Untitled"}</h3>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatNoteDate(note)}</span>
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{notePreview(note)}</p>
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

function NoteEditor({
  note,
  folders,
  onBack,
  update,
}: {
  note: Note;
  folders: NoteFolder[];
  onBack: () => void;
  update: (updater: (data: import("@/lib/storage").BixboData) => import("@/lib/storage").BixboData) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [folderId, setFolderId] = useState(note.folderId);
  const [color, setColor] = useState<NoteColor>(note.color ?? "default");
  const [pinned, setPinned] = useState(Boolean(note.pinned));
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>(note.checklist ?? []);
  const [showChecklist, setShowChecklist] = useState(Boolean(note.checklist?.length));
  const [newItem, setNewItem] = useState("");
  const [tick, setTick] = useState(0);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef(note.content);
  const firstRender = useRef(true);

  useEffect(() => {
    if (!editorRef.current) return;

    const migratedContent = sanitizeNoteHtml(
      (note.content || "").replaceAll("#fef3c7", "#b4be80").replaceAll("rgb(254, 243, 199)", "rgb(223, 230, 184)"),
    );

    if (editorRef.current.innerHTML !== migratedContent) {
      editorRef.current.innerHTML = migratedContent;
      contentRef.current = migratedContent;
    }
  }, [note.id, note.content]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      update((current) => ({
        ...current,
        notebook: current.notebook.map((item) =>
          item.id === note.id
            ? {
                ...item,
                title,
                folderId,
                color,
                pinned,
                content: sanitizeNoteHtml(contentRef.current),
                checklist: showChecklist ? checklist : undefined,
                updatedAt: Date.now(),
              }
            : item,
        ),
      }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [checklist, color, folderId, note.id, pinned, showChecklist, tick, title, update]);

  const saveImmediately = () => {
    update((current) => ({
      ...current,
      notebook: current.notebook.map((item) =>
        item.id === note.id
          ? {
              ...item,
              title,
              folderId,
              color,
              pinned,
              content: sanitizeNoteHtml(contentRef.current),
              checklist: showChecklist ? checklist : undefined,
              updatedAt: Date.now(),
            }
          : item,
      ),
    }));
  };

  const goBack = () => {
    saveImmediately();
    onBack();
  };

  const deleteCurrent = () => {
    if (!confirm("Delete this note?")) return;

    update((current) => ({
      ...current,
      notebook: current.notebook.filter((item) => item.id !== note.id),
    }));

    onBack();
  };

  const exec = (command: "bold" | "highlight") => {
    editorRef.current?.focus();

    if (command === "bold") {
      document.execCommand("bold");
    } else {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const mark = document.createElement("mark");
      mark.style.background = "#b4be80";
      mark.style.color = "#2f3518";
      mark.style.padding = "0 2px";
      mark.style.borderRadius = "2px";

      try {
        range.surroundContents(mark);
      } catch {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }

      selection.removeAllRanges();
    }

    if (editorRef.current) {
      contentRef.current = sanitizeNoteHtml(editorRef.current.innerHTML);
      if (editorRef.current.innerHTML !== contentRef.current) {
        editorRef.current.innerHTML = contentRef.current;
      }
      setTick((value) => value + 1);
    }
  };

  const onInput = () => {
    if (!editorRef.current) return;

    contentRef.current = sanitizeNoteHtml(editorRef.current.innerHTML);

    if (editorRef.current.innerHTML !== contentRef.current) {
      editorRef.current.innerHTML = contentRef.current;
    }

    setTick((value) => value + 1);
  };

  return (
    <AppShell
      title={
        <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm">
          <ChevronLeft className="h-5 w-5" />
          Notes
        </button>
      }
      right={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPinned((value) => !value)}
            className={`rounded-full p-2 ${pinned ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            aria-label={pinned ? "Unpin note" : "Pin note"}
          >
            <Pin className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={deleteCurrent}
            className="rounded-full p-2 text-muted-foreground hover:text-destructive"
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="space-y-4 px-5 pt-3 pb-[calc(104px+env(safe-area-inset-bottom))]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="border-0 bg-transparent px-0 font-serif text-3xl shadow-none focus-visible:ring-0"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <select
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            className="rounded-full bg-tint px-3 py-1.5 text-xs text-foreground ring-1 ring-border/70"
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <span>
            Edited{" "}
            {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>

          <span className="ml-auto flex items-center gap-1 text-[10px]">
            <Check className="h-3 w-3" />
            Saved automatically
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-2 ring-1 ring-border/70">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec("bold")}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-tint"
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec("highlight")}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-tint"
            aria-label="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowChecklist((value) => !value)}
            className={`grid h-9 w-9 place-items-center rounded-xl ${
              showChecklist ? "bg-primary text-primary-foreground" : "hover:bg-tint"
            }`}
            aria-label="Checklist"
          >
            <ListChecks className="h-4 w-4" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            {(Object.keys(NOTE_COLORS) as NoteColor[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                className={`h-6 w-6 rounded-full ring-1 ring-border ${
                  color === key ? "outline outline-2 outline-primary outline-offset-1" : ""
                }`}
                style={{ background: NOTE_COLORS[key] }}
                aria-label={`Note color ${key}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl p-4 ring-1 ring-border/70" style={{ background: NOTE_COLORS[color] }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onBlur={onInput}
            className="min-h-[40dvh] text-base leading-relaxed whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
            data-placeholder="Start writing…"
          />
        </div>

        {showChecklist && (
          <section className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border/70">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist</h2>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setChecklist((current) =>
                        current.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)),
                      )
                    }
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 ${
                      item.done ? "bg-primary text-primary-foreground ring-primary" : "ring-border"
                    }`}
                    aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                  >
                    {item.done && <Check className="h-3.5 w-3.5" />}
                  </button>

                  <span className={`min-w-0 flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                    {item.text}
                  </span>

                  <button
                    type="button"
                    onClick={() => setChecklist((current) => current.filter((entry) => entry.id !== item.id))}
                    className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Delete checklist item"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const text = newItem.trim();
                if (!text) return;

                setChecklist((current) => [...current, { id: crypto.randomUUID(), text, done: false }]);
                setNewItem("");
              }}
            >
              <Input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                placeholder="Add checklist item"
                className="rounded-2xl"
              />
              <Button type="submit" className="rounded-2xl">
                Add
              </Button>
            </form>
          </section>
        )}
      </div>
    </AppShell>
  );
}
