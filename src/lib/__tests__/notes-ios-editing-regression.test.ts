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

  it("does not collapse and recreate the textarea height on each keystroke", () => {
    expect(source).not.toContain("useLayoutEffect");
    expect(source).not.toContain('editor.style.height = "0px"');
    expect(source).toContain("editor.scrollHeight");
    expect(source).toContain("fitEditorToContent(editor)");
    expect(source).toContain("overflow-hidden");
  });

  it("keeps body editing independent from checklist visibility", () => {
    const bodyIndex = source.indexOf("data-bixbo-note-editor");
    const checklistIndex = source.indexOf("{showChecklist &&");
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(checklistIndex).toBeGreaterThan(bodyIndex);
  });
});
