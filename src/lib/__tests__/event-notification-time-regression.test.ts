import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/notifications.ts", "utf8");
const server = readFileSync("supabase/functions/send-due-push/index.ts", "utf8");

describe("calendar event notification timing", () => {
  it("keeps the previous-day event reminder at 09:00", () => {
    expect(client).toContain('const dayBefore = addDays(appointment.date, -1)');
    expect(client).toContain('today === dayBefore && dueNow("09:00", now)');
    expect(server).toContain('addDays(local.date, 1) === appointment.eventDate && isDue(local.minutes, 9 * 60)');
    expect(server).toContain('title: "Event tomorrow"');
  });

  it("sends a second reminder at the event's configured time", () => {
    expect(client).toContain('eventTime: event.time?.trim() || undefined');
    expect(client).toContain('time: event.time?.trim() || undefined');
    expect(client).toContain('appointment.time && today === appointment.date && dueNow(appointment.time, now)');
    expect(client).toContain('title: "Event now"');

    expect(server).toContain('eventDate?: string;');
    expect(server).toContain('eventTime?: string;');
    expect(server).toContain('local.date === appointment.eventDate');
    expect(server).toContain('isDue(local.minutes, eventMinutes)');
    expect(server).toContain('title: "Event now"');
  });

  it("does not invent a same-day time for all-day events", () => {
    expect(client).toContain('eventTime: event.time?.trim() || undefined');
    expect(server).toContain('appointment.eventTime &&');
  });
});