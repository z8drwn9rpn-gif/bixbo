import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync("src/routes/notes-editor.tsx", "utf8");

describe("Notes iOS editing", () => {
  it("uses one stable native textarea for the note body", () => {
    expect(source).toContain("data-bixbo-note-editor");
    expect(source).toContain("<textarea");
    expect(source).toContain("defaultValue={contentRef.current}");
    expect(source).toContain("onInput={(event) => scheduleBodySave(event.currentTarget)}");
    expect(source).not.toContain("contentEditable");
    expect(source).not.toContain("keyboardBridgeRef");
    expect(source).not.toContain("editorReady");
  });

  it("leaves tap-to-focus and wrapped-line caret placement to native iOS", () => {
    expect(source).not.toContain("onTouchEnd={() => editorRef.current?.focus");
    expect(source).not.toContain("onClick={() => editorRef.current?.focus");
    expect(source).not.toContain('touchAction: "pan-y"');
    expect(source).toContain('inputMode="text"');
    expect(source).toContain('WebkitUserSelect: "text"');
    expect(source).toContain('userSelect: "text"');
    expect(source).toContain('WebkitTouchCallout: "default"');
  });

  it("keeps long-note height stable while the full-screen editor itself scrolls", () => {
    expect(source).not.toContain("useLayoutEffect");
    expect(source).not.toContain('editor.style.height = "0px"');
    expect(source).not.toContain("fitEditorToContent(editor)");
    expect(source).toContain("editor.scrollHeight");
    expect(source).toContain("overflow-y-auto");
    expect(source).toContain('className="-mx-5 flex min-h-0 flex-1 flex-col"');
    expect(source).toContain('minHeight: "calc(100dvh - 220px - env(safe-area-inset-bottom))"');
    expect(source).toContain('minHeight: "calc(100dvh - 5rem - env(safe-area-inset-bottom))"');
  });

  it("keeps body editing independent from checklist visibility", () => {
    const bodyIndex = source.indexOf("data-bixbo-note-editor");
    const checklistIndex = source.indexOf("{showChecklist &&");
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(checklistIndex).toBeGreaterThan(bodyIndex);
  });
});
