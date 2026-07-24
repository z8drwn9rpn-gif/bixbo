import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useBixbo, EMPTY, type Note } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — BIXBO" },
      { name: "description", content: "Free-form notes, separate from the calendar." },
      { property: "og:title", content: "Notes — BIXBO" },
      { property: "og:description", content: "Free-form notes, separate from the calendar." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { data, update, hydrated } = useBixbo();
  const view = hydrated ? data : EMPTY;
  const [editing, setEditing] = useState<Note | null>(null);

  const addNote = (title: string, content: string) => {
    update((d) => ({ ...d, notebook: [{ id: crypto.randomUUID(), title, content, createdAt: Date.now() }, ...d.notebook] }));
  };
  const updateNote = (id: string, title: string, content: string) => {
    update((d) => ({ ...d, notebook: d.notebook.map((n) => n.id === id ? { ...n, title, content } : n) }));
  };
  const removeNote = (id: string) => update((d) => ({ ...d, notebook: d.notebook.filter((n) => n.id !== id) }));

  return (
    <AppShell title="Notes" right={<NewNoteButton onAdd={addNote} />}>
      <div className="space-y-3 px-5 pt-4 pb-24">
        {view.notebook.length === 0 && (
          <p className="text-sm text-muted-foreground">No notes yet. Tap “Add”.</p>
        )}
        {view.notebook.map((n) => (
          <button
            key={n.id}
            onClick={() => setEditing(n)}
            className="block w-full rounded-3xl bg-surface p-4 text-left ring-1 ring-border transition hover:ring-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-serif text-lg">{n.title || "Untitled"}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <EditNoteDialog
        note={editing}
        onClose={() => setEditing(null)}
        onSave={(t, c) => { if (editing) updateNote(editing.id, t, c); setEditing(null); }}
      />
    </AppShell>
  );
}

function NewNoteButton({ onAdd }: { onAdd: (t: string, c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full"><Plus className="h-4 w-4" /> Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write anything…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onAdd(title, content); setTitle(""); setContent(""); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNoteDialog({ note, onClose, onSave }:
  { note: Note | null; onClose: () => void; onSave: (t: string, c: string) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const open = note !== null;
  useEffect(() => { if (note) { setTitle(note.title); setContent(note.content); } }, [note]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit note</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(title, content)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
