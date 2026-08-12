import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync("src/routes/notes-editor.tsx", "utf8");

describe("Notes iOS editing", () => {
  it("uses one stable native textarea for the note body", () => {
    expect(source).toContain("data-bixbo-note-editor");
    expect(source).toContain("<textarea");
    expect(source).toContain("value={bodyText}");
    expect(source).toContain("onChange={(e) => onBodyChange(e.target.value)}");
    expect(source).not.toContain("contentEditable");
    expect(source).not.toContain("keyboardBridgeRef");
    expect(source).not.toContain("editorReady");
  });

  it("explicitly focuses the native editor on iOS tap", () => {
    expect(source).toContain("onTouchEnd={() => editorRef.current?.focus({ preventScroll: true })}");
    expect(source).toContain("onClick={() => editorRef.current?.focus({ preventScroll: true })}");
    expect(source).toContain('inputMode="text"');
  });

  it("auto-grows instead of trapping note scrolling inside textarea", () => {
    expect(source).toContain("editor.scrollHeight");
    expect(source).toContain("overflow-hidden");
    expect(source).toContain('touchAction: "pan-y"');
  });

  it("keeps body editing independent from checklist visibility", () => {
    const bodyIndex = source.indexOf("data-bixbo-note-editor");
    const checklistIndex = source.indexOf("{showChecklist &&");
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(checklistIndex).toBeGreaterThan(bodyIndex);
  });
});
