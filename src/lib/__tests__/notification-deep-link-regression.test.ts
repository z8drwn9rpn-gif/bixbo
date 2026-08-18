import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

describe("notification deep links", () => {
  it("keeps the notification target when an existing iOS PWA window is focused", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");

    expect(worker).toContain('client.postMessage({ type: "BIXBO_NOTIFICATION_OPEN", url })');
    expect(worker).toContain("await client.navigate(target)");
    expect(worker).toContain("await self.clients.openWindow(target)");
    expect(bridge).toContain('type: "BIXBO_NOTIFICATION_OPEN"');
    expect(bridge).toContain("window.location.assign(target)");
    expect(bridge).toContain("parsed.origin !== window.location.origin");
  });

  it("preserves a non-home destination from a real push payload", () => {
    const pushSubscription = readFileSync("supabase/functions/push-subscription/index.ts", "utf8");
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");

    expect(pushSubscription).toContain('url: "/notifications"');
    expect(worker).toContain("url: safeUrl(payload.url)");
    expect(worker).toContain("const url = safeUrl(data.url)");
  });
});
