import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sheet = readFileSync("src/components/ui/sheet.tsx", "utf8");
const dialog = readFileSync("src/components/ui/dialog.tsx", "utf8");
const drawer = readFileSync("src/components/ui/drawer.tsx", "utf8");
const appShell = readFileSync("src/components/AppShell.tsx", "utf8");

describe("log header source geometry", () => {
  it("does not reintroduce the shared 8px SheetHeader margin above log actions", () => {
    expect(sheet).toContain('cn("flex flex-col gap-2 text-center sm:text-left", className)');
    expect(sheet).not.toContain('cn("mb-2 flex flex-col gap-2 text-center sm:text-left", className)');
  });
});

describe("no blur at component source", () => {
  it("removes blur utilities and forces sheet overlays/footers to no backdrop filter", () => {
    expect(sheet).not.toContain("bg-black/45 backdrop-blur-sm");
    expect(sheet).toContain('backdropFilter: "none"');
    expect(sheet).toContain('WebkitBackdropFilter: "none"');
  });

  it("removes blur from dialog and drawer overlays and disables drawer background scaling", () => {
    expect(dialog).not.toContain("bg-black/45 backdrop-blur-sm");
    expect(drawer).not.toContain("bg-black/45 backdrop-blur-sm");
    expect(dialog).toContain('backdropFilter: "none"');
    expect(drawer).toContain('backdropFilter: "none"');
    expect(drawer).toContain("shouldScaleBackground = false");
  });

  it("keeps the app header solid instead of using a backdrop-blurred translucent layer", () => {
    expect(appShell).not.toContain("backdrop-blur-xl");
    expect(appShell).not.toContain("supports-[backdrop-filter]");
    expect(appShell).toContain("border-b border-border/65 bg-background px-4");
  });
});
