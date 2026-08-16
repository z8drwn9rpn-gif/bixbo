import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("Couple readability and long-page navigation", () => {
  it("keeps Couple helper text at the Day Overview minimum reading size", () => {
    const overview = read("src/features/couple/CoupleOverviewPanel.tsx");
    const css = read("src/features/couple/couple-readable.css");

    expect(overview).toContain('import "./couple-readable.css"');
    expect(css).toContain('main:has([aria-label="Couple period: Month"])');
    expect(css).toContain('[class~="text-[7px]"]');
    expect(css).toContain('[class~="text-[11px]"]');
    expect(css).toContain("font-size: 0.75rem !important");
  });

  it("exposes top and bottom jump controls from the shared app shell", () => {
    const shell = read("src/components/AppShell.tsx");
    const control = read("src/components/ScrollJumpControl.tsx");

    expect(shell).toContain("<ScrollJumpControl />");
    expect(control).toContain('aria-label="Scroll to top"');
    expect(control).toContain('aria-label="Scroll to bottom"');
    expect(control).toContain('window.scrollTo({ top: 0, behavior: "smooth" })');
    expect(control).toContain("root.scrollHeight");
  });
});
