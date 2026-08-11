import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync("src/routes/notes-editor.tsx", "utf8");

describe("Notes iOS editing", () => {
  it("does not rewrite contentEditable innerHTML during input", () => {
    const inputBlock = source.slice(source.indexOf("const onInput"), source.indexOf("return (", source.indexOf("const onInput")));
    expect(inputBlock).toContain("contentRef.current = editorRef.current.innerHTML");
    expect(inputBlock).not.toContain("sanitizeNoteHtml(editorRef.current.innerHTML)");
    expect(inputBlock).not.toContain("editorRef.current.innerHTML =");
  });

  it("lets iOS use native contentEditable touch focus", () => {
    expect(source).toContain("data-bixbo-note-editor");
    expect(source).toContain("contentEditable");
    expect(source).not.toContain("onTouchStart={focusEditorForTyping}");
    expect(source).not.toContain("onPointerDown={focusEditorForTyping}");
  });
});
