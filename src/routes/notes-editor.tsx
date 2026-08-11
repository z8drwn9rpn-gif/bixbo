import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/hooks/useI18n";
import { Ico } from "@/components/icons/BixboIcons";
import { type Note, type NoteChecklistItem, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const focusEditorForTyping = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) {
      editor.focus({ preventScroll: true });
    }
  };

  return (
    <AppShell
      title={
        <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm">
          <ChevronLeft className="h-5 w-5" />
          Bixbo Note
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
    >
      <div className="space-y-4 px-5 pt-3 pb-[calc(104px+env(safe-area-inset-bottom))]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("Title")}
          className="border-0 bg-transparent px-0 font-serif text-3xl shadow-none focus-visible:ring-0"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-1.5">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setFolderId(folder.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
                  folderId === folder.id
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-tint text-foreground ring-border/70 hover:bg-primary/10"
                }`}
              >
                {folder.icon ? <Ico e={folder.icon} size={14} /> : <Ico name="note" size={14} />}
                <span>{folder.name}</span>
              </button>
            ))}
          </div>

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
            aria-label={t("Bold")}
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec("highlight")}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-tint"
            aria-label={t("Highlight")}
          >
            <Highlighter className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowChecklist((value) => !value)}
            className={`grid h-9 w-9 place-items-center rounded-xl ${
              showChecklist ? "bg-primary text-primary-foreground" : "hover:bg-tint"
            }`}
            aria-label={t("Checklist")}
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
            role="textbox"
            aria-multiline="true"
            tabIndex={0}
            inputMode="text"
            spellCheck
            onPointerDown={focusEditorForTyping}
            onTouchStart={focusEditorForTyping}
            onClick={focusEditorForTyping}
            onInput={onInput}
            onBlur={onInput}
            className="relative z-10 min-h-[40dvh] touch-manipulation select-text text-base leading-relaxed whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
            style={{ WebkitUserSelect: "text", userSelect: "text" }}
            data-placeholder={t("Start writing…")}
          />
        </div>

        {showChecklist && (
          <section className="space-y-3 rounded-3xl bg-surface p-4 ring-1 ring-border/70">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Checklist")}</h2>

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
              <Input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                placeholder={t("Add checklist item")}
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
