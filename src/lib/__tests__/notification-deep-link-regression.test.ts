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
    expect(worker).toContain("return explicit");
  });

  it("opens calendar event notifications in Calendar events instead of Event edit", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");
    const calendarTarget = readFileSync("src/components/CalendarTargetBridge.tsx", "utf8");

    expect(worker).toContain('tag.startsWith("event-event:")');
    expect(worker).toContain('return `/?calendar=events&calendarEvent=${encodeURIComponent(eventId)}`');
    expect(bridge).toContain('initial.searchParams.get("calendarEvent")');
    expect(bridge).toContain('initial.searchParams.delete("event")');
    expect(bridge).toContain('initial.searchParams.set("calendar", "events")');
    expect(bridge).toContain('window.location.hash = `date=${date}`');
    expect(bridge).toContain('document.querySelector<HTMLButtonElement>(".bixbo-calendar > div > button[aria-label]")');
    expect(calendarTarget).toContain('window.location.hash === "#latest"');
    expect(calendarTarget).toContain('const explicit = /^#date=');
  });

  it("routes medication notification taps to the daily Meds log, not Manage meds", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");

    expect(worker).toContain('meds: "/?log=meds"');
    expect(worker).toContain('explicit === "/meds"');
    expect(bridge).toContain('parsed.pathname === "/meds"');
    expect(bridge).toContain('parsed.searchParams.set("log", "meds")');
    expect(bridge).toContain('DIRECT_LOG_TARGETS = new Set(["meds"');
    expect(bridge).toContain('button[data-log-category="${logTarget}"]');
    expect(bridge).toContain('new CustomEvent("bixbo:toggle-log")');
  });

  it("normalizes the Home reminder categories to action surfaces", () => {
    const worker = readFileSync("public/bixbo-push-sw.js", "utf8");
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");

    expect(worker).toContain('period: "/?log=period"');
    expect(worker).toContain('dailyLog: "/?log=menu"');
    expect(worker).toContain('symptom: "/?log=pain"');
    expect(worker).toContain('mood: "/?log=menu"');
    expect(worker).toContain('hydration: "/?log=menu"');
    expect(worker).toContain('sleep: "/?log=temp"');
    expect(worker).toContain('if (explicit === "/" && HOME_NOTIFICATION_TARGETS[category])');

    expect(bridge).toContain('if (value === "menu") return value');
    expect(bridge).toContain('DIRECT_LOG_TARGETS.has(value)');
    expect(bridge).toContain('if (logTarget === "menu")');
    expect(bridge).toContain('clearNotificationParams("log")');
  });

  it("snapshots a medication name when Taken is applied from a notification", () => {
    const bridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");

    expect(bridge).toContain("function medIdFromSlot");
    expect(bridge).toContain("data.meds.find");
    expect(bridge).toContain("medNames: medName ?");
  });
});
