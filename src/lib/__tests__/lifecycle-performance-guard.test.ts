import { describe, expect, it } from "vitest";

import { isLifecycleContaminatedPerformanceIssue } from "../lifecyclePerformanceGuard";

describe("lifecycle performance guard", () => {
  it("rejects impossible route-settle timings caused by a suspended PWA", () => {
    expect(isLifecycleContaminatedPerformanceIssue({
      kind: "jank",
      at: 1_786_950_583_199,
      durationMs: 998_137,
      message: "Route / settled in 998137 ms versus a 27 ms device baseline.",
    }, 0)).toBe(true);
  });

  it("rejects startup frame gaps that contain lifecycle evidence", () => {
    expect(isLifecycleContaminatedPerformanceIssue({
      kind: "freeze",
      at: 1_786_950_599_339,
      durationMs: 7_932,
      message: "Startup frame gap of about 7932 ms detected.",
      timeline: ["7.9s ago · visibility · hidden"],
    }, 0)).toBe(true);
  });

  it("rejects route/startup measurements recorded immediately around a lifecycle transition", () => {
    const transitionAt = 10_000;
    expect(isLifecycleContaminatedPerformanceIssue({
      kind: "jank",
      at: 11_000,
      durationMs: 900,
      message: "Route /insights settled in 900 ms versus a 30 ms device baseline.",
    }, transitionAt)).toBe(true);
  });

  it("rejects extreme timer-only heartbeat gaps on iOS standalone", () => {
    const issue = {
      kind: "freeze",
      at: 1_787_323_152_674,
      durationMs: 42_457,
      message: "Main thread stalled for about 42457 ms. Scrolling, taps or screen changes may have appeared frozen.",
      context: "visibility=visible, online=yes, cpu=4",
    };

    expect(isLifecycleContaminatedPerformanceIssue(issue, 0, true)).toBe(true);
    expect(isLifecycleContaminatedPerformanceIssue(issue, 0, false)).toBe(false);
  });

  it("keeps genuine interaction and unrelated performance evidence", () => {
    expect(isLifecycleContaminatedPerformanceIssue({
      kind: "interaction",
      at: 12_000,
      durationMs: 444,
      message: "Tap-to-paint latency was about 444 ms after div.",
    }, 10_000)).toBe(false);

    expect(isLifecycleContaminatedPerformanceIssue({
      kind: "longtask",
      at: 12_000,
      durationMs: 1_500,
      message: "React profiler render took 1500 ms.",
    }, 10_000)).toBe(false);
  });

  it("does not hide a startup frame gap without lifecycle contamination evidence", () => {
    expect(isLifecycleContaminatedPerformanceIssue({
      kind: "freeze",
      at: 50_000,
      durationMs: 7_932,
      message: "Startup frame gap of about 7932 ms detected.",
      timeline: ["8.6s ago · deployment · build assets-example"],
    }, 10_000)).toBe(false);
  });
});
