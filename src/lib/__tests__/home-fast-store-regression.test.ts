import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("local interaction performance hardening", () => {
  it("routes app-facing storage mutations through the structural-sharing fast runtime", () => {
    const barrel = readFileSync("src/lib/storage.ts", "utf8");
    const fastRuntime = readFileSync("src/lib/storage/fastRuntime.ts", "utf8");

    expect(barrel).toContain('from "./storage/fastRuntime"');
    expect(barrel).toContain("setBixbo,");
    expect(barrel).toContain("useBixbo,");
    expect(barrel).toContain("subscribeBixboChanges,");
    expect(barrel).toContain("replaceBixbo,");

    expect(fastRuntime).toContain("LARGE_MAP_ROOTS");
    expect(fastRuntime).toContain('"dayLogs"');
    expect(fastRuntime).toContain("if (Object.is(before, after)) continue;");
    expect(fastRuntime).toContain("recordChangedMap(before, after, root, ctx)");
    expect(fastRuntime).toContain("base.recordLocalSyncDiff");
    expect(fastRuntime).toContain("base.persist()");
    expect(fastRuntime).toContain('listener(committed, "local")');

    // Local interaction fast-path must preserve structural sharing instead of
    // re-running the full migration over every historical day on each tap.
    expect(fastRuntime).not.toContain('import { migrate');
    expect(fastRuntime).not.toContain("migrate(updater");

    // Defensive migration remains enabled for comparatively rare cloud merges.
    expect(fastRuntime).toContain('base.replaceBixbo(data, "remote")');
  });

  it("filters service-worker takeover failures and suspended-duration artifacts from forensics", () => {
    const guard = readFileSync("src/lib/forensicLifecycleGuard.ts", "utf8");

    expect(guard).toContain("service-worker · controller changed");
    expect(guard).toContain("isSuspendedDurationArtifact");
    expect(guard).toContain("SUSPENDED_DURATION_ARTIFACT_MS = 2 * 60_000");
    expect(guard).toContain('navigator.serviceWorker?.addEventListener("controllerchange"');
    expect(guard).toContain("POST_RESUME_SANITIZE_MS");
  });
});
