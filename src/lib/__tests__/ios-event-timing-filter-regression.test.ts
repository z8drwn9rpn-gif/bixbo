import { describe, expect, it } from "vitest";
import {
  isReliableEventTimingEntry,
  sanitizeInteractionSignals,
  type StoredForensicIssue,
} from "../runtimeDiagnosticsInstaller";

function eventEntry(name: string, interactionId: number, duration = 500): PerformanceEntry {
  return {
    name,
    entryType: "event",
    startTime: 0,
    duration,
    interactionId,
    toJSON: () => ({}),
  } as PerformanceEntry & { interactionId: number };
}

function issue(message: string, id: string, incidentId?: string): StoredForensicIssue {
  return {
    id,
    at: 1,
    kind: "interaction",
    severity: "warning",
    area: "Application",
    message,
    path: "/profile",
    durationMs: 500,
    ...(incidentId ? { incidentId } : {}),
  };
}

describe("iOS Event Timing forensic filtering", () => {
  it("requires a real interactionId and ignores low-level touch/pointer plumbing", () => {
    expect(isReliableEventTimingEntry(eventEntry("click", 42))).toBe(true);
    expect(isReliableEventTimingEntry(eventEntry("click", 0))).toBe(false);
    expect(isReliableEventTimingEntry(eventEntry("touchcancel", 42, 1_168))).toBe(false);
    expect(isReliableEventTimingEntry(eventEntry("touchend", 42, 488))).toBe(false);
    expect(isReliableEventTimingEntry(eventEntry("pointerdown", 42, 900))).toBe(false);
  });

  it("removes legacy low-level Event Timing incidents but preserves semantic tap evidence", () => {
    const sanitized = sanitizeInteractionSignals([
      issue("touchcancel occupied the interaction pipeline for about 1168 ms.", "touchcancel"),
      issue("touchend occupied the interaction pipeline for about 488 ms.", "touchend"),
      issue("pointerdown took about 720 ms to process.", "pointerdown"),
      issue("Tap-to-paint latency was about 640 ms after button.", "semantic-tap"),
      issue("Navigation tap-to-paint latency was about 780 ms after a.", "semantic-navigation"),
      issue("click occupied the interaction pipeline for about 620 ms.", "click", "inc-click"),
    ]);

    expect(sanitized.map((row) => row.id)).toEqual([
      "semantic-tap",
      "semantic-navigation",
      "click",
    ]);
  });
});
