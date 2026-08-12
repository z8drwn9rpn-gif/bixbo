import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync("src/routes/notes-editor.tsx", "utf8");

describe("Notes iOS editing", () => {
  it("uses one stable native textarea for the note body", () => {
    expect(source).toContain("data-bixbo-note-editor");
    expect(source).toContain("<textarea");
    expect(source).toContain("value={bodyText}");
    expect(source).toContain("onChange={(event) => onInput(event.target.value)}");
    expect(source).not.toContain("contentEditable");
    expect(source).not.toContain("keyboardBridgeRef");
  });

  it("never remounts the body textarea after tap/mount", () => {
    expect(source).not.toContain("editorReady");
    expect(source).not.toContain('key={`${note.id}:');
    expect(source).not.toContain("setEditorReady");
  });

  it("keeps body editing independent from checklist visibility", () => {
    const bodyIndex = source.indexOf("data-bixbo-note-editor");
    const checklistIndex = source.indexOf("{showChecklist && (");
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(checklistIndex).toBeGreaterThan(bodyIndex);
    const beforeChecklist = source.slice(0, checklistIndex);
    expect(beforeChecklist).toContain("data-bixbo-note-editor");
  });
});
