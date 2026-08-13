import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("live Admin / Heatmap / Notes regressions", () => {
  it("opens the current-page editor when Admin Mode activates or the route changes", () => {
    const source = read("src/components/GlobalAdminModeController.tsx");
    expect(source).toContain("requestAnimationFrame(() => requestAdminCustomizeCurrentPage())");
    expect(source).toContain("[active, owner, pathname]");
  });

  it("anchors Year Heatmap tooltip to the actual tapped dot", () => {
    const source = read("src/features/insights/YearHealthHeatmap.tsx");
    expect(source).toContain("data-bixbo-heatmap-half={halfIndex}");
    expect(source).toContain("event.currentTarget.getBoundingClientRect()");
    expect(source).toContain("halfElement.getBoundingClientRect()");
    expect(source).toContain("yearTooltipAnchor.leftPct");
  });

  it("mounts Notes with one native textarea and no imperative innerHTML rewrite", () => {
    const source = read("src/routes/notes-editor.tsx");
    expect(source).toContain("<textarea");
    expect(source).toContain("data-bixbo-note-editor");
    expect(source).toContain("defaultValue={contentRef.current}");
    expect(source).not.toContain("editorRef.current.innerHTML = migratedContent");
    expect(source).not.toContain("contentEditable");
  });
});
