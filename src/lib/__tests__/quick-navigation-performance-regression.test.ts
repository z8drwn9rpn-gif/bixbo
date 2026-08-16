import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("quick navigation performance regressions", () => {
  it("keeps the shared shortcuts inside the client router and removes periodic deployment reloads", () => {
    const control = read("src/components/ScrollJumpControl.tsx");
    const root = read("src/routes/__root.tsx");

    expect(control).toContain("useRouter");
    expect(control).toContain('router.navigate({ to: "/" })');
    expect(control).not.toContain("window.location.assign");
    expect(root).not.toContain("useDeploymentFreshness");
    expect(root).not.toContain("bixbo-ios-launch-splash");
  });

  it("makes Jump to section visible on the actual Insights dashboard", () => {
    const route = read("src/routes/insights.tsx");
    const control = read("src/features/patterns/InsightsJumpControl.tsx");

    expect(route).toContain("<InsightsJumpControl");
    expect(route).toContain('id="bixbo-insights-content"');
    expect(route).toContain("data-bixbo-jump-label");
    expect(control).toContain('[data-bixbo-jump-label]');
    expect(control).toContain('t("Jump to section")');
  });

  it("keeps the full logging bundle lazy until the user opens Plus", () => {
    const actions = read("src/components/GlobalQuickLogActions.tsx");
    const nav = read("src/components/BottomNav.tsx");

    expect(actions).toContain('lazy(() =>');
    expect(actions).toContain('import("@/components/LogSheet")');
    expect(actions).toContain('window.addEventListener("bixbo:open-log-menu", openAllLogs)');
    expect(nav).toContain('new CustomEvent("bixbo:open-log-menu")');
  });
});
