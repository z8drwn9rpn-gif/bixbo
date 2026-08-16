import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("visual App Scanner forensics", () => {
  it("keeps safe layout-shift source and tap-to-paint tracing active on app screens", () => {
    const visual = readFileSync("src/lib/appVisualForensics.ts", "utf8");
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");

    expect(shell).toContain('import "@/lib/appVisualForensics"');
    expect(visual).toContain('supported.includes("layout-shift")');
    expect(visual).toContain("entry.sources");
    expect(visual).toContain("previousRect");
    expect(visual).toContain("currentRect");
    expect(visual).toContain('window.addEventListener("pointerdown"');
    expect(visual).toContain('window.addEventListener("click"');
    expect(visual).toContain("Tap-to-paint latency");
    expect(visual).toContain('window.location.pathname.startsWith("/diagnostics")');
    expect(visual).not.toContain("textContent");
    expect(visual).not.toContain("target.value");
  });
});
