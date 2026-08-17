import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editableCalendar = readFileSync("src/components/EditableMonthCalendar.tsx", "utf8");
const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
const calendarForms = readFileSync("src/features/logging/CalendarForms.tsx", "utf8");

describe("calendar event editing from Home", () => {
  it("opens a tapped Calendar Events row in the existing Event editor", () => {
    expect(editableCalendar).toContain('dialog.getAttribute("aria-label") !== t("Calendar events")');
    expect(editableCalendar).toContain('target.closest<HTMLElement>("div.relative.grid")');
    expect(editableCalendar).toContain("onEditEvent(event)");
    expect(home).toContain('setQuickCat("event")');
    expect(home).toContain("setEditEntry(event)");
    expect(home).toContain("onEditEvent={openCalendarEvent}");
    expect(calendarForms).toContain("initialEntry?: EventEntry");
    expect(calendarForms).toContain("editing ? d.events.map");
  });
});
