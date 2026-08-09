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


function NoteFoodGlyph({ kind, size = 16 }: { kind: "avocado" | "banana" | "cupcake" | "bread"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", className: "inline-block shrink-0 align-[-0.15em]" };

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
                    <h3 className="line-clamp-1 text-sm font-semibold"><NoteRichText text={note.title.trim() || "Untitled"} size={16} /></h3>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground"><NoteRichText text={stripHtml(note.content).trim() || "No additional text"} size={14} /></p>
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
