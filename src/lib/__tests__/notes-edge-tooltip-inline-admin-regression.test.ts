import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Notes keyboard, Heatmap edge tooltip and live Admin regressions", () => {
  it("keeps Notes on the stable native iOS textarea path", () => {
    const source = read("src/routes/notes-editor.tsx");
    expect(source).toContain("<textarea");
    expect(source).toContain("data-bixbo-note-editor");
    expect(source).toContain('inputMode="text"');
    expect(source).toContain("fitEditorToContent(editor)");
    expect(source).not.toContain("keyboardBridgeRef");
    expect(source).not.toContain("editorReady");
    expect(source).not.toContain("contentEditable");
  });

  it("always renders the Year Heatmap tooltip with a deterministic edge-safe fallback", () => {
    const source = read("src/features/insights/YearHealthHeatmap.tsx");
    expect(source).toContain("hasActive && activeTooltip && activePosition && activeTooltipLayout");
    expect(source).toContain("Math.max(2, Math.min(98, yearTooltipAnchor.leftPct))");
    expect(source).toContain("activePosition.weekIndex");
    expect(source).toContain("activeDate.getMonth() < half.startMonth");
  });

  it("keeps the current app page interactive while Admin editing is open", () => {
    const source = read("src/components/AdminEditOverlay.tsx");
    expect(source).toContain("data-bixbo-admin-live-editor");
    expect(source).toContain("pointer-events-none fixed inset-x-0");
    expect(source).toContain("pointer-events-auto relative mx-2 max-h-[48dvh]");
  });
});
