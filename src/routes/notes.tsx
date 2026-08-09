import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Ico, IcoText } from "@/components/icons/BixboIcons";
import { useBixbo, EMPTY, type Note } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { MoreVertical, Pin, PinOff, Plus, Search, Trash2, Archive, X } from "lucide-react";
import { NoteEditor } from "./notes-editor";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "BIXBO — Bixbo Note" },
      { name: "description", content: "Personal notes, folders, checklists and search." },
      { property: "og:title", content: "BIXBO — Bixbo Note" },
    ],
  }),
  component: NotesPage,
});

function stripHtml(html: string) {
  if (typeof document === "undefined") return (html || "").replace(/<[^>]+>/g, "");
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return el.textContent ?? "";
}

function NotesPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return view.notebook
      .filter((n) => (showArchived ? n.archived : !n.archived))
      .filter((n) => !q || `${n.title} ${stripHtml(n.content)}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);
      });
  }, [view.notebook, query, showArchived]);

  const createNote = () => {
    const note: Note = {
      id: crypto.randomUUID(),
      folderId: "general",
      title: "",
      content: "",
      createdAt: Date.now(),
      pinned: false,
      archived: false,
      color: "default",
    };
    update((d) => ({ ...d, notebook: [note, ...d.notebook] }));
    setOpenNote(note.id);
  };

  if (openNote) {
    const note = view.notebook.find((n) => n.id === openNote);
    if (!note) {
      return (
        <AppShell title="Bixbo Note">
          <div className="px-5 py-8 text-sm text-muted-foreground">
            Note not found.
            <button type="button" onClick={() => setOpenNote(null)} className="mt-4 block rounded-2xl bg-primary px-4 py-2 font-semibold text-primary-foreground">
              Back
            </button>
          </div>
        </AppShell>
      );
    }
    return <NoteEditor note={note} folders={view.folders} onBack={() => setOpenNote(null)} update={update} />;
  }

  return (
    <AppShell
      title="Bixbo Note"
      right={
        <button type="button" onClick={createNote} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm" aria-label="New note">
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      <div className="space-y-4 px-5 pt-3 pb-[calc(104px+env(safe-area-inset-bottom))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes…" className="h-11 rounded-2xl bg-surface pl-10 pr-10 ring-1 ring-border/70" />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Clear">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-primary/15 p-1">
          <button type="button" onClick={() => setShowArchived(false)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${!showArchived ? "bg-primary text-primary-foreground" : "text-foreground/75"}`}>
            Notes
          </button>
          <button type="button" onClick={() => setShowArchived(true)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${showArchived ? "bg-primary text-primary-foreground" : "text-foreground/75"}`}>
            Archive
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-3xl bg-surface px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-border/70">
            <div className="mb-3 flex justify-center">
              <Ico name="note" size={28} />
            </div>
            {query ? "No notes match your search." : showArchived ? "No archived notes." : "No notes yet. Tap + to create one."}
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <article key={note.id} className="relative rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-border/70">
                <button type="button" onClick={() => setOpenNote(note.id)} className="block w-full pr-8 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-sm font-semibold"><IcoText text={note.title.trim() || "Untitled"} size={16} /></h3>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground"><IcoText text={stripHtml(note.content).trim() || "No additional text"} size={14} /></p>
                </button>
                <button type="button" onClick={() => setMenuNoteId(menuNoteId === note.id ? null : note.id)} className="absolute right-2 top-8 rounded-full p-1.5 text-muted-foreground" aria-label="Options">
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuNoteId === note.id && (
                  <div className="absolute right-2 top-14 z-20 w-44 overflow-hidden rounded-2xl bg-background shadow-xl ring-1 ring-border">
                    <button
                      type="button"
                      onClick={() => {
                        update((d) => ({ ...d, notebook: d.notebook.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n)) }));
                        setMenuNoteId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-tint"
                    >
                      {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {note.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update((d) => ({ ...d, notebook: d.notebook.map((n) => (n.id === note.id ? { ...n, archived: !n.archived, pinned: false, updatedAt: Date.now() } : n)) }));
                        setMenuNoteId(null);
                      }}
                      className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-xs hover:bg-tint"
                    >
                      <Archive className="h-4 w-4" />
                      {note.archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Delete this note?")) return;
                        update((d) => ({ ...d, notebook: d.notebook.filter((n) => n.id !== note.id) }));
                        setMenuNoteId(null);
                      }}
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
      </div>
    </AppShell>
  );
}
