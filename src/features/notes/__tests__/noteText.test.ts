import { describe, expect, it } from "vitest";
import { htmlToPlainText, sanitizeNoteHtml } from "../noteText";

describe("Notes text helpers", () => {
  it("removes dangerous embedded content and inline event handlers", () => {
    const source = '<p onclick="alert(1)">Safe</p><script>alert(1)</script><img src=x onerror="alert(1)">';
    const sanitized = sanitizeNoteHtml(source);

    expect(sanitized).toContain("Safe");
    expect(sanitized.toLowerCase()).not.toContain("script");
    expect(sanitized.toLowerCase()).not.toContain("onerror");
    expect(sanitized.toLowerCase()).not.toContain("onclick");
    expect(sanitized.toLowerCase()).not.toContain("<img");
  });

  it("converts allowed note markup to stable multiline plain text", () => {
    const source = "<p>First &amp; second</p><div>Third<br>Fourth</div><ul><li>Item</li></ul>";
    const plain = htmlToPlainText(source);

    expect(plain).toContain("First & second");
    expect(plain).toContain("Third\nFourth");
    expect(plain).toContain("• Item");
  });

  it("returns empty text for an empty note", () => {
    expect(sanitizeNoteHtml("")).toBe("");
    expect(htmlToPlainText("")).toBe("");
  });
});
