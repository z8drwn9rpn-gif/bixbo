import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowLeft, Folder } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, type Note, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — BIXBO" },
      { name: "description", content: "Free-form notes organised in folders." },
      { property: "og:title", content: "Notes — BIXBO" },
      { property: "og:description", content: "Free-form notes organised in folders." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [folderId, setFolderId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const addFolder = (name: string) => {
    if (!name.trim()) return;
    update((d) => ({ ...d, folders: [...d.folders, { id: crypto.randomUUID(), name: name.trim(), icon: "📁" }] }));
  };
  const removeFolder = (id: string) => {
    if (!confirm("Delete folder and all notes inside?")) return;
    update((d) => ({ ...d, folders: d.folders.filter((f) => f.id !== id), notebook: d.notebook.filter((n) => n.folderId !== id) }));
    if (folderId === id) setFolderId(null);
  };
  const addNote = (fId: string) => {
    const n: Note = { id: crypto.randomUUID(), folderId: fId, title: "", content: "", createdAt: Date.now() };
    update((d) => ({ ...d, notebook: [n, ...d.notebook] }));
    setEditing(n);
    setCreating(false);
  };
  const saveNote = (id: string, title: string, content: string) => {
    update((d) => ({ ...d, notebook: d.notebook.map((n) => n.id === id ? { ...n, title, content, updatedAt: Date.now() } : n) }));
  };
  const removeNote = (id: string) => update((d) => ({ ...d, notebook: d.notebook.filter((n) => n.id !== id) }));

  if (editing) {
    return <NoteEditor note={editing} onClose={() => setEditing(null)} onSave={saveNote} onDelete={(id) => { removeNote(id); setEditing(null); }} />;
  }

  if (folderId) {
    const folder = view.folders.find((f) => f.id === folderId);
    const notes = view.notebook.filter((n) => n.folderId === folderId);
    return (
      <AppShell
        title={
          <button onClick={() => setFolderId(null)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" /> {folder?.name ?? "Folder"}
          </button>
        }
        right={<Button size="sm" className="rounded-full" onClick={() => addNote(folderId)}><Plus className="h-4 w-4" /> New</Button>}
      >
        <div className="space-y-2 px-5 pt-4 pb-24">
          {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes here yet.</p>}
          {notes.map((n) => (
            <button key={n.id} onClick={() => setEditing(n)}
              className="block w-full rounded-2xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-primary/40">
              <p className="font-serif text-lg">{n.title || "Untitled"}</p>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{n.content || "…"}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                {new Date(n.updatedAt ?? n.createdAt).toLocaleDateString("en-GB")}
              </p>
            </button>
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Notes" right={
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogTrigger asChild><Button size="sm" className="rounded-full"><Plus className="h-4 w-4" /> Folder</Button></DialogTrigger>
        <NewFolderDialog onAdd={(n) => { addFolder(n); setCreating(false); }} />
      </Dialog>
    }>
      <div className="grid grid-cols-2 gap-3 px-5 pt-4 pb-24">
        {view.folders.map((f) => {
          const count = view.notebook.filter((n) => n.folderId === f.id).length;
          return (
            <div key={f.id} className="relative">
              <button onClick={() => setFolderId(f.id)}
                className="flex w-full flex-col items-start gap-2 rounded-3xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-primary/40">
                <span className="text-2xl">{f.icon ?? "📁"}</span>
                <span className="font-serif text-lg">{f.name}</span>
                <span className="text-xs text-muted-foreground">{count} {count === 1 ? "note" : "notes"}</span>
              </button>
              <button onClick={() => removeFolder(f.id)}
                className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-tint hover:text-destructive"
                aria-label="Delete folder">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function NewFolderDialog({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Folder name" autoFocus />
      <DialogFooter>
        <Button onClick={() => { onAdd(name); setName(""); }}>Create</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function NoteEditor({ note, onClose, onSave, onDelete }:
  { note: Note; onClose: () => void; onSave: (id: string, t: string, c: string) => void; onDelete: (id: string) => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  useEffect(() => {
    const t = setTimeout(() => onSave(note.id, title, content), 400);
    return () => clearTimeout(t);
  }, [title, content, note.id, onSave]);
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-5 py-4 backdrop-blur">
          <button onClick={() => { onSave(note.id, title, content); onClose(); }} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-5 w-5" /> Back
          </button>
          <button onClick={() => onDelete(note.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
            <Trash2 className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-3 px-5 pt-4 pb-10">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            className="border-none bg-transparent px-0 font-serif text-3xl shadow-none focus-visible:ring-0" />
          <Textarea rows={22} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing…"
            className="min-h-[70vh] resize-none border-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0" />
        </div>
      </div>
    </div>
  );
}
