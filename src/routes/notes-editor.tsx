import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/hooks/useI18n";
import { BixboIcon } from "@/components/icons/BixboIcon";
import { BixboSafeText } from "@/components/icons/BixboSafeText";
import { type Note, type NoteChecklistItem, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { htmlToPlainText } from "@/features/notes/noteText";
import {
  Bold,
  Check,
  ChevronLeft,
  Highlighter,
  ListChecks,
  Pin,
  Trash2,
  X,
} from "@/components/icons/BixboIcons";

type NoteColor = NonNullable<Note["color"]>;

const NOTE_COLORS: Record<NoteColor, string> = {
  default: "var(--surface)",
  olive: "rgba(142, 166, 41, 0.16)",
  sand: "rgba(226, 169, 19, 0.13)",
  rose: "rgba(217, 79, 120, 0.11)",
  blue: "rgba(77, 135, 214, 0.11)",
};

export function NoteEditor({
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
  const { t } = useI18n();
  const [title, setTitle] = useState(note.title);
  const [folderId, setFolderId] = useState(note.folderId);
  const [color, setColor] = useState<NoteColor>(note.color ?? "default");
  const [pinned, setPinned] = useState(Boolean(note.pinned));
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>(note.checklist ?? []);
  const [showChecklist, setShowChecklist] = useState(Boolean(note.checklist?.length));
  const [newItem, setNewItem] = useState("");

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef(htmlToPlainText(note.content || ""));
  const bodySaveTimerRef = useRef<number | null>(null);
  const firstMetadataRender = useRef(true);
  const pageBackground = NOTE_COLORS[color] ?? NOTE_COLORS.default;

  const persist = (body = editorRef.current?.value ?? contentRef.current) => {
    contentRef.current = body;
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
              content: body,
              checklist: showChecklist ? checklist : undefined,
              updatedAt: Date.now(),
            }
          : item,
      ),
    }));
  };

  useEffect(() => {
    firstMetadataRender.current = true;
    contentRef.current = htmlToPlainText(note.content || "");
  }, [note.id]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bixbo-note-page-bg", pageBackground);
    return () => {
      document.documentElement.style.removeProperty("--bixbo-note-page-bg");
    };
  }, [pageBackground]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const hasScrollableContent = editor.scrollHeight > editor.clientHeight;
    if (!hasScrollableContent) editor.scrollTop = 0;
  }, [note.id]);

  useEffect(() => {
    if (firstMetadataRender.current) {
      firstMetadataRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => persist(), 500);
    return () => window.clearTimeout(timer);
  }, [checklist, color, folderId, pinned, showChecklist, title]);

  useEffect(() => {
    return () => {
      if (bodySaveTimerRef.current !== null) window.clearTimeout(bodySaveTimerRef.current);
    };
  }, []);

  const scheduleBodySave = (editor: HTMLTextAreaElement) => {
    const nextBody = editor.value;
    contentRef.current = nextBody;

    if (bodySaveTimerRef.current !== null) window.clearTimeout(bodySaveTimerRef.current);
    bodySaveTimerRef.current = window.setTimeout(() => {
      bodySaveTimerRef.current = null;
      persist(nextBody);
    }, 650);
  };

  const flushBodySave = () => {
    if (bodySaveTimerRef.current !== null) {
      window.clearTimeout(bodySaveTimerRef.current);
      bodySaveTimerRef.current = null;
    }
    persist();
  };

  const goBack = () => {
    flushBodySave();
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

  const applyMarker = (marker: "**" | "==") => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? start;
    const scrollTop = editor.scrollTop;
    const currentText = editor.value;
    const next = `${currentText.slice(0, start)}${marker}${currentText.slice(start, end)}${marker}${currentText.slice(end)}`;

    editor.value = next;
    contentRef.current = next;
    scheduleBodySave(editor);

    window.requestAnimationFrame(() => {
      editor.focus({ preventScroll: true });
      const caret = end + marker.length * 2;
      editor.setSelectionRange(caret, caret);
      editor.scrollTop = scrollTop;
    });
  };

  return (
    <AppShell
      hideBottomNav
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
            aria-label={t("Delete note")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
      stickyHeader={false}
    >
      <div
        className="flex min-h-0 flex-col px-5 pt-3"
        style={{
          minHeight: "calc(100dvh - 5rem - env(safe-area-inset-bottom))",
          background: pageBackground,
          overflowAnchor: "none",
        }}
      >
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("Title")}
          className="mb-1 h-auto border-0 bg-transparent px-0 py-1 font-serif text-[30px] leading-tight shadow-none focus-visible:ring-0"
          autoCapitalize="sentences"
          autoCorrect="on"
        />

        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3" /> Saved automatically
          </span>
        </div>

        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setFolderId(folder.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
                folderId === folder.id
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-tint text-foreground ring-border/70 hover:bg-primary/10"
              }`}
            >
              {folder.icon ? <BixboIcon emoji={folder.icon} size={14} /> : <BixboIcon name="note" size={14} />}
              <BixboSafeText text={folder.name} size={14} />
            </button>
          ))}
        </div>

        <div
          className="-mx-5 flex min-h-0 flex-1 flex-col"
          style={{ background: pageBackground, overflowAnchor: "none" }}
        >
          <textarea
            key={note.id}
            ref={editorRef}
            defaultValue={contentRef.current}
            onInput={(event) => scheduleBodySave(event.currentTarget)}
            onBlur={() => flushBodySave()}
            inputMode="text"
            spellCheck
            autoCapitalize="sentences"
            autoCorrect="on"
            enterKeyHint="enter"
            data-bixbo-note-editor
            placeholder={t("Start writing…")}
            className="block min-h-0 w-full flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-4 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            style={{
              minHeight: "calc(100dvh - 220px - env(safe-area-inset-bottom))",
              WebkitUserSelect: "text",
              userSelect: "text",
              WebkitTouchCallout: "default",
              overflowAnchor: "none",
              scrollBehavior: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          />
        </div>

        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-fit max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 rounded-2xl border border-border/70 bg-surface/95 p-1.5 shadow-md backdrop-blur-md">
          <button
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => applyMarker("**")}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-tint"
            aria-label={t("Bold")}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => applyMarker("==")}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-tint"
            aria-label={t("Highlight")}
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowChecklist((value) => !value)}
            className={`grid h-9 w-9 place-items-center rounded-xl ${showChecklist ? "bg-primary text-primary-foreground" : "hover:bg-tint"}`}
            aria-label={t("Checklist")}
          >
            <ListChecks className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 border-l border-border/70" />
          {(Object.keys(NOTE_COLORS) as NoteColor[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              className={`h-6 w-6 rounded-full ring-1 ring-border ${color === key ? "outline outline-2 outline-primary outline-offset-1" : ""}`}
              style={{ background: NOTE_COLORS[key] }}
              aria-label={`Note color ${key}`}
            />
          ))}
        </div>

        {showChecklist && (
          <section className="mt-4 space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border/70">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Checklist")}</h2>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChecklist((current) => current.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)))}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 ${item.done ? "bg-primary text-primary-foreground ring-primary" : "ring-border"}`}
                    aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                  >
                    {item.done && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <span className={`min-w-0 flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                    <BixboSafeText text={item.text} size={16} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setChecklist((current) => current.filter((entry) => entry.id !== item.id))}
                    className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label={t("Delete checklist item")}
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
              <Input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder={t("Add checklist item")} className="rounded-2xl" />
              <Button type="submit" className="rounded-2xl">Add</Button>
            </form>
          </section>
        )}
      </div>
    </AppShell>
  );
}
