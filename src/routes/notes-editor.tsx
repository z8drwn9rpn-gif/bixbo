import { Fragment, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/hooks/useI18n";
import { BixboIcon } from "@/components/icons/BixboIcon";
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
const NOTE_EMOJI_RE = /(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;
const NOTE_EMOJI_PART_RE = /^(\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)$/u;

function BixboNoteText({ text, size = 18, className }: { text: string; size?: number; className?: string }) {
  const parts = text.split(NOTE_EMOJI_RE);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;
        if (!NOTE_EMOJI_PART_RE.test(part)) return <Fragment key={index}>{part}</Fragment>;
        return (
          <BixboIcon
            key={`${part}-${index}`}
            emoji={part}
            size={size}
            className="inline-block shrink-0 align-[-0.16em]"
          />
        );
      })}
    </span>
  );
}

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
  };

  for (const child of [...template.content.childNodes]) cleanNode(child);
  return template.innerHTML;
}

function htmlToPlainText(html: string): string {
  return sanitizeNoteHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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
  const [bodyText, setBodyText] = useState(() => htmlToPlainText(note.content || ""));

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef(bodyText);
  const bodySaveTimerRef = useRef<number | null>(null);
  const firstMetadataRender = useRef(true);

  const fitEditorToContent = (editor: HTMLTextAreaElement, allowShrink = false) => {
    const minHeight = Math.round(window.innerHeight * 0.4);
    if (allowShrink) editor.style.height = "auto";
    const target = Math.max(editor.scrollHeight, minHeight);
    if (allowShrink || target > editor.clientHeight) editor.style.height = `${target}px`;
  };

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
    const frame = window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (editor) fitEditorToContent(editor, true);
    });
    return () => window.cancelAnimationFrame(frame);
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
    setBodyText(nextBody);
    fitEditorToContent(editor);

    if (bodySaveTimerRef.current !== null) window.clearTimeout(bodySaveTimerRef.current);
    bodySaveTimerRef.current = window.setTimeout(() => {
      bodySaveTimerRef.current = null;
      persist(nextBody);
    }, 650);
  };

  const goBack = () => {
    if (bodySaveTimerRef.current !== null) {
      window.clearTimeout(bodySaveTimerRef.current);
      bodySaveTimerRef.current = null;
    }
    persist();
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
    const currentText = editor.value;
    const next = `${currentText.slice(0, start)}${marker}${currentText.slice(start, end)}${marker}${currentText.slice(end)}`;

    contentRef.current = next;
    setBodyText(next);

    window.requestAnimationFrame(() => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      fitEditorToContent(currentEditor, true);
      scheduleBodySave(currentEditor);
      currentEditor.focus();
      const caret = end + marker.length * 2;
      currentEditor.setSelectionRange(caret, caret);
    });
  };

  const hiddenEditableTextStyle = {
    color: "transparent",
    caretColor: "var(--foreground)",
    WebkitTextFillColor: "transparent",
  } as const;

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
      <div className="space-y-4 px-5 pt-3 pb-[calc(128px+env(safe-area-inset-bottom))]">
        <div className="relative">
          {title ? (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden font-serif text-3xl text-foreground" aria-hidden="true">
              <BixboNoteText text={title} size={27} />
            </div>
          ) : null}
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("Title")}
            className="relative z-10 border-0 bg-transparent px-0 font-serif text-3xl shadow-none focus-visible:ring-0"
            style={title ? hiddenEditableTextStyle : undefined}
          />
        </div>

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
                <BixboNoteText text={folder.name} size={14} />
              </button>
            ))}
          </div>
          <span>
            Edited {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString("en-GB", {
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

        <div className="relative rounded-3xl p-4 ring-1 ring-border/70" style={{ background: NOTE_COLORS[color] ?? NOTE_COLORS.default }}>
          {bodyText ? (
            <div
              className="pointer-events-none absolute inset-4 z-0 whitespace-pre-wrap break-words text-base leading-relaxed text-foreground"
              aria-hidden="true"
            >
              <BixboNoteText text={bodyText} size={18} />
            </div>
          ) : null}
          <textarea
            ref={editorRef}
            value={bodyText}
            onChange={(event) => scheduleBodySave(event.currentTarget)}
            onBlur={(event) => {
              contentRef.current = event.currentTarget.value;
              persist(event.currentTarget.value);
            }}
            rows={10}
            inputMode="text"
            spellCheck
            autoCapitalize="sentences"
            autoCorrect="on"
            enterKeyHint="enter"
            data-bixbo-note-editor
            placeholder={t("Start writing…")}
            className="relative z-10 block w-full resize-none overflow-hidden bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
            style={{
              minHeight: "40dvh",
              WebkitUserSelect: "text",
              userSelect: "text",
              WebkitTouchCallout: "default",
              ...(bodyText ? hiddenEditableTextStyle : {}),
            }}
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
                    <BixboNoteText text={item.text} size={16} />
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
              <div className="relative min-w-0 flex-1">
                {newItem ? (
                  <div className="pointer-events-none absolute inset-y-0 left-3 right-3 z-0 flex items-center overflow-hidden text-sm text-foreground" aria-hidden="true">
                    <BixboNoteText text={newItem} size={16} />
                  </div>
                ) : null}
                <Input
                  value={newItem}
                  onChange={(event) => setNewItem(event.target.value)}
                  placeholder={t("Add checklist item")}
                  className="relative z-10 rounded-2xl bg-transparent"
                  style={newItem ? hiddenEditableTextStyle : undefined}
                />
              </div>
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
