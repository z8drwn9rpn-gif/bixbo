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
    expect(worker).toContain("const url = notificationUrl(data)");
  });

  it("opens event notifications in the existing Calendar events list, not the event editor", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");

    expect(worker).toContain('tag.startsWith("event-event:")');
    expect(worker).toContain('return `/?calendarEvents=${encodeURIComponent(eventId)}`');
    expect(worker).not.toContain('return `/?event=${encodeURIComponent(eventId)}`');
    expect(bridge).toContain('current.searchParams.get("calendarEvents")');
    expect(bridge).toContain('(getBixbo().events ?? []).find((entry) => String(entry.id) === eventId)');
    expect(bridge).toContain('document.querySelector<HTMLButtonElement>(".bixbo-calendar > div:first-child > button")');
    expect(bridge).toContain("eventsButton.click()");
    expect(bridge).toContain('removeSearchParam("calendarEvents")');
  });

  it("routes medication notification taps to the daily Meds log, never Manage medications", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");

    expect(worker).toContain('if (category === "meds" && (explicit === "/" || explicit === "/meds")) return "/?log=meds"');
    expect(bridge).toContain('current.searchParams.get("log") !== "meds"');
    expect(bridge).toContain('button[data-log-category="meds"]');
    expect(bridge).toContain('window.dispatchEvent(new CustomEvent("bixbo:toggle-log"))');
    expect(bridge).toContain('removeSearchParam("log")');
    expect(worker).not.toContain('if (category === "meds" && explicit === "/") return "/meds"');
  });

  it("bumps the service worker so installed PWAs receive the corrected tap behavior", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    expect(worker).toContain('const BIXBO_PUSH_SW_VERSION = "2026.08.19.1"');
  });
});
