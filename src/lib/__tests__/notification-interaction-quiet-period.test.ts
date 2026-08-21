import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_INTERACTION_QUIET_MS,
  notificationSyncQuietPeriodRemaining,
} from "../networkEfficientCloudRuntime";

describe("notification sync interaction quiet period", () => {
  it("defers remote reminder sync while the user is actively interacting", () => {
    const lastInteractionAt = 10_000;

    expect(notificationSyncQuietPeriodRemaining(lastInteractionAt, 11_000)).toBe(
      NOTIFICATION_INTERACTION_QUIET_MS - 1_000,
    );
    expect(notificationSyncQuietPeriodRemaining(lastInteractionAt, 13_000)).toBe(0);
    expect(notificationSyncQuietPeriodRemaining(0, 13_000)).toBe(0);
  });
});
