import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import {
  collapseDuplicateInteractionSignals,
  type StoredForensicIssue,
} from "../runtimeDiagnosticsInstaller";

const read = (path: string) => readFileSync(path, "utf8");

function issue(overrides: Partial<StoredForensicIssue>): StoredForensicIssue {
  return {
    id: "issue",
    at: 1_000,
    kind: "interaction",
    area: "Home",
    message: "click took about 672 ms to process.",
    path: "/",
    durationMs: 672,
    incidentId: "inc-one",
    occurrenceCount: 1,
    ...overrides,
  };
}

describe("forensic performance fixes", () => {
  it("collapses low-level Event Timing facets from one physical tap", () => {
    const compacted = collapseDuplicateInteractionSignals([
      issue({ id: "click", message: "click occupied the interaction pipeline for about 672 ms.", durationMs: 672 }),
      issue({ id: "touchend", message: "touchend occupied the interaction pipeline for about 696 ms.", durationMs: 696 }),
      issue({ id: "mouseup", message: "mouseup occupied the interaction pipeline for about 672 ms.", durationMs: 672 }),
      issue({ id: "jank", kind: "jank", message: "Repeated visible frame gaps detected.", durationMs: 417 }),
      issue({ id: "other", incidentId: "inc-two", message: "click occupied the interaction pipeline for about 353 ms.", durationMs: 353 }),
    ]);

    expect(compacted).toHaveLength(3);
    const primary = compacted.find((item) => item.incidentId === "inc-one" && item.kind === "interaction");
    expect(primary?.id).toBe("touchend");
    expect(primary?.durationMs).toBe(696);
    expect(primary?.occurrenceCount).toBe(1);
    expect(compacted.some((item) => item.kind === "jank")).toBe(true);
  });

  it("keeps the heavy Patterns dashboard out of the initial Insights bundle", () => {
    const route = read("src/routes/insights.tsx");

    expect(route).toContain("const LazyPatternsContent = lazy(() =>");
    expect(route).toContain('import("@/features/patterns/PatternsContent")');
    expect(route).toContain("<Suspense");
    expect(route).not.toContain('import { PatternsContent } from "./patterns"');
  });

  it("shares concurrent legal-consent lookups without caching settled consent", () => {
    const legal = read("src/lib/legalConsent.ts");

    expect(legal).toContain("cloudHealthConsentStateInFlight");
    expect(legal).toContain("const request = readCloudHealthConsentState()");
    expect(legal).toContain("cloudHealthConsentStateInFlight = request");
    expect(legal).toContain("cloudHealthConsentStateInFlight = null");
    expect(legal).toContain("if (cloudHealthConsentStateInFlight) return cloudHealthConsentStateInFlight");
  });

  it("keeps the LogSheet hooks unconditional while routing temp through the canonical logger", () => {
    const logSheet = read("src/components/LogSheet.tsx");

    expect(logSheet).toContain("createPortal(");
    expect(logSheet).toContain("formSurface.style.paddingTop");
    expect(logSheet).toContain("const dateLabel = useMemo");
    expect(logSheet).toContain("<LogSheetRoot key={formKey} {...props} date={targetDate} />");
    expect(logSheet).not.toContain('if (props.initial === "temp")');
    expect(logSheet).not.toContain("PastDaySleepSheet");
  });
});
