import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editableCalendar = readFileSync("src/components/EditableMonthCalendar.tsx", "utf8");
const home = readFileSync("src/features/home/HomePage.tsx", "utf8");
const calendarForms = readFileSync("src/features/logging/CalendarForms.tsx", "utf8");

describe("calendar event editing from Home", () => {
  it("opens a tapped Calendar Events row in the existing Event editor", () => {
    expect(editableCalendar).toContain('dialog.getAttribute("aria-label") !== t("Calendar events")');
    expect(editableCalendar).toContain("div.relative.grid");
    expect(editableCalendar).toContain("onEditEvent(event)");
    expect(home).toContain('setQuickCat("event")');
    expect(home).toContain("setEditEntry(event)");
    expect(home).toContain("onEditEvent={openCalendarEvent}");
    expect(calendarForms).toContain("initialEntry?: EventEntry");
    expect(calendarForms).toContain("editing ? d.events.map");
  });

  it("makes Calendar Events rows keyboard and assistive-tech actionable", () => {
    expect(editableCalendar).toContain('row.setAttribute("role", "button")');
    expect(editableCalendar).toContain('row.setAttribute("tabindex", "0")');
    expect(editableCalendar).toContain('row.setAttribute("aria-label", `${t("Edit")} ${event.title}`)');
    expect(editableCalendar).toContain('nativeEvent.key !== "Enter" && nativeEvent.key !== " "');
    expect(editableCalendar).toContain('document.addEventListener("keydown", onKeyDown, true)');
    expect(editableCalendar).toContain("MutationObserver(decorateRows)");
    expect(editableCalendar).not.toContain("characterData: true");
  });
});
