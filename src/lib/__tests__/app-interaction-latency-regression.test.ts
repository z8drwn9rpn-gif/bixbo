import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("app startup and interaction latency", () => {
  test("keeps startup styles behind one app stylesheet entrypoint", () => {
    const root = read("src/routes/__root.tsx");
    const appShellCss = read("src/app-shell.css");

    expect(root).toContain('import appCss from "../app-shell.css?url"');
    expect(root).not.toContain('themeSystemCss from "../theme-system.css?url"');
    expect(root).not.toContain('calendarSystemCss from "../calendar-system.css?url"');
    expect(root).not.toContain('deviceRenderingFixesCss from "../device-rendering-fixes.css?url"');
    expect(appShellCss).toContain('@import "./styles.css";');
    expect(appShellCss).toContain('@import "./theme-system.css";');
    expect(appShellCss).toContain('@import "./calendar-system.css";');
    expect(appShellCss).toContain('@import "./device-rendering-fixes.css";');
  });

  test("does not hold the standalone splash for a decorative second", () => {
    const root = read("src/routes/__root.tsx");

    expect(root).toContain("}, 80);");
    expect(root).toContain("}, 700);");
    expect(root).not.toContain("}, 1000);");
    expect(root).not.toContain("beginVisibleSecond");
  });

  test("limits Pain compatibility scans to newly inserted DOM subtrees", () => {
    const defaults = read("src/components/PainEpisodeChoiceDefaults.tsx");

    expect(defaults).toContain("const pendingRoots = new Set<Element>()");
    expect(defaults).toContain("pendingRoots.add(node)");
    expect(defaults).toContain("window.requestAnimationFrame(flushPendingRoots)");
    expect(defaults).toContain("markPainEpisodeNoButtons(root)");
    expect(defaults).not.toContain("new MutationObserver(markPainEpisodeNoButtons)");
  });

  test("does not shift Insights card rendering into the user's next interaction", () => {
    const css = read("src/features/insights/insights-3d.css");

    expect(css).not.toContain("content-visibility: auto");
    expect(css).not.toContain("contain-intrinsic-size: auto 420px");
  });
});
