import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

const targetBridge = readFileSync("src/components/CalendarTargetBridge.tsx", "utf8");
const notificationBridge = readFileSync("src/components/MedicationNotificationActionBridge.tsx", "utf8");
const editableCalendar = readFileSync("src/components/EditableMonthCalendar.tsx", "utf8");

describe("calendar deep-link hardening", () => {
  it("moves to an explicit notification date before opening Calendar Events", () => {
    expect(notificationBridge).toContain('window.location.hash = `date=${date}`');
    expect(targetBridge).toContain('const explicit = /^#date=');
    expect(targetBridge).toContain("const targetIndex = targetYear * 12 + targetMonth");
    expect(targetBridge).toContain("dayButton.click()");
    expect(targetBridge).toContain("window.history.replaceState");
  });

  it("respects Reduce Motion for programmatic calendar scrolling", () => {
    expect(targetBridge).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(targetBridge).toContain('? "auto" : "smooth"');
    expect(targetBridge).toContain("behavior: preferredScrollBehavior()");
  });

  it("keeps event editing keyboard accessible without changing notification taps into edit taps", () => {
    expect(editableCalendar).toContain('row.setAttribute("role", "button")');
    expect(editableCalendar).toContain('row.setAttribute("tabindex", "0")');
    expect(editableCalendar).toContain('nativeEvent.key !== "Enter" && nativeEvent.key !== " "');
    expect(notificationBridge).toContain('clearNotificationParams("calendar", "calendarEvent", "event")');
  });
});
