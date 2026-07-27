import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, type Note, type NoteChecklistItem, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronLeft, Bold, Highlighter, ListChecks } from "lucide-react";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — BIXBO" },
      { name: "description", content: "Folders and notes with checklists, bold and highlight." },
      { property: "og:title", content: "Notes — BIXBO" },
      { property: "og:description", content: "Folders and notes with checklists, bold and highlight." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);

  if (openNote) {
    const note = view.notebook.find((n) => n.id === openNote);
    if (!note) { setOpenNote(null); return null; }
    return <NoteEditor note={note} onBack={() => setOpenNote(null)} update={update} />;
  }

  if (openFolder) {
    const folder = view.folders.find((f) => f.id === openFolder);
    if (!folder) { setOpenFolder(null); return null; }
    const notes = view.notebook.filter((n) => n.folderId === openFolder).sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
    const newNote = () => {
      const n: Note = { id: crypto.randomUUID(), folderId: openFolder, title: "New note", content: "", createdAt: Date.now() };
      update((d) => ({ ...d, notebook: [n, ...d.notebook] }));
      setOpenNote(n.id);
    };
    return (
      <AppShell title={
        <button onClick={() => setOpenFolder(null)} className="flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" /> {folder.icon} {folder.name}
        </button>
      } right={<Button size="sm" onClick={newNote}><Plus className="h-4 w-4" /> New</Button>}>
        <div className="px-5 pt-3 pb-24 space-y-2">
          {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          {notes.map((n) => (
            <button key={n.id} onClick={() => setOpenNote(n.id)}
              className="block w-full rounded-2xl bg-surface p-3 text-left ring-1 ring-border hover:bg-tint">
              <p className="text-sm font-semibold">{n.title || "Untitled"}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{stripHtml(n.content) || (n.checklist?.length ? `${n.checklist.filter((c) => c.done).length}/${n.checklist.length} done` : "")}</p>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  const addFolder = () => {
    const name = prompt("Folder name");
    if (!name?.trim()) return;
    const f: NoteFolder = { id: crypto.randomUUID(), name: name.trim(), icon: "📁" };
    update((d) => ({ ...d, folders: [...d.folders, f] }));
  };
  const delFolder = (id: string) => {
    if (!confirm("Delete folder and all its notes?")) return;
    update((d) => ({ ...d, folders: d.folders.filter((f) => f.id !== id), notebook: d.notebook.filter((n) => n.folderId !== id) }));
  };

  return (
    <AppShell title="Notes" right={<Button size="sm" variant="outline" onClick={addFolder}><Plus className="h-4 w-4" /> Folder</Button>}>
      <div className="px-5 pt-3 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {view.folders.map((f) => {
            const count = view.notebook.filter((n) => n.folderId === f.id).length;
            return (
              <div key={f.id} className="relative">
                <button onClick={() => setOpenFolder(f.id)}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-3xl bg-surface p-4 ring-1 ring-border hover:bg-tint">
                  <span className="text-4xl">{f.icon}</span>
                  <span className="text-center text-sm font-semibold">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{count} {count === 1 ? "note" : "notes"}</span>
                </button>
                <button onClick={() => delFolder(f.id)}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Delete folder">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function stripHtml(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const t = document.createElement("div"); t.innerHTML = html; return t.textContent ?? "";
}

function NoteEditor({ note, onBack, update }: {
  note: Note; onBack: () => void;
  update: (u: (d: import("@/lib/storage").BixboData) => import("@/lib/storage").BixboData) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>(note.checklist ?? []);
  const [showChecklist, setShowChecklist] = useState(!!note.checklist?.length);
  const [newItem, setNewItem] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const firstRender = useRef(true);

  // Autosave: debounce writes so each keystroke doesn't hit storage but nothing is ever lost.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const t = setTimeout(() => {
      update((d) => ({
        ...d,
        notebook: d.notebook.map((n) => n.id === note.id
          ? { ...n, title, content, checklist: showChecklist ? checklist : undefined, updatedAt: Date.now() }
          : n),
      }));
    }, 400);
    return () => clearTimeout(t);
  }, [title, content, checklist, showChecklist, note.id, update]);

  const del = () => {
    if (!confirm("Delete this note?")) return;
    update((d) => ({ ...d, notebook: d.notebook.filter((n) => n.id !== note.id) }));
    onBack();
  };

  const wrapSel = (before: string, after: string) => {
    const el = document.getElementById("note-content") as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const val = el.value;
    const next = val.slice(0, start) + before + val.slice(start, end) + after + val.slice(end);
    setContent(next);
    setTimeout(() => { el.focus(); el.selectionStart = start + before.length; el.selectionEnd = end + before.length; }, 0);
  };

  return (
    <AppShell
      title={<button onClick={onBack} className="flex items-center gap-1 text-sm"><ChevronLeft className="h-5 w-5" /> Done</button>}
      right={<button onClick={del} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-5 w-5" /></button>}
    >
      <div className="px-5 pt-3 pb-24 space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="text-lg font-semibold" />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => wrapSel("<strong>", "</strong>")}><Bold className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" onClick={() => wrapSel('<mark style="background:#fef3c7">', "</mark>")}><Highlighter className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" onClick={() => setShowChecklist((v) => !v)}><ListChecks className="h-3.5 w-3.5" /> Checklist</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide preview" : "Show preview"}</Button>
          <span className="ml-auto self-center text-xs text-muted-foreground">Saved automatically</span>
        </div>

        <Textarea id="note-content" value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Write anything… use the B / highlight buttons to wrap the selection"
          className="min-h-[35dvh] text-base leading-relaxed" />

        {showPreview && content.trim() && (
          <div className="rounded-2xl bg-surface p-3 ring-1 ring-border">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}

        {showChecklist && (
          <div className="rounded-2xl bg-surface p-3 ring-1 ring-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Checklist</p>
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input type="checkbox" checked={c.done} onChange={() => setChecklist((a) => a.map((x) => x.id === c.id ? { ...x, done: !x.done } : x))} />
                <span className={`flex-1 text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.text}</span>
                <button onClick={() => setChecklist((a) => a.filter((x) => x.id !== c.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <form className="flex gap-2" onSubmit={(e) => {
              e.preventDefault();
              if (newItem.trim()) { setChecklist((a) => [...a, { id: crypto.randomUUID(), text: newItem.trim(), done: false }]); setNewItem(""); }
            }}>
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add item" />
              <Button type="submit">Add</Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

