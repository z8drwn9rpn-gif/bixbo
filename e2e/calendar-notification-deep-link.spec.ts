import { expect, test } from "@playwright/test";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("calendar event notification cold-open selects the event month and opens Calendar Events", async ({ page }) => {
  const target = new Date();
  target.setDate(15);
  target.setMonth(target.getMonth() + 2);
  const eventDate = dateKey(target);
  const eventId = "e2e-future-notification";
  const title = "Future notification event";
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long" }).format(target);

  await page.addInitScript(({ eventDate, eventId, title }) => {
    localStorage.setItem(
      "bixbo:v2",
      JSON.stringify({
        events: [
          {
            id: eventId,
            title,
            startDate: eventDate,
            endDate: eventDate,
            time: "14:30",
          },
        ],
        settings: { language: "en", gender: "female", theme: "system" },
      }),
    );
  }, { eventDate, eventId, title });

  await page.goto(`/?calendar=events&calendarEvent=${eventId}`);

  await expect(page.locator("h2[data-bixbo-display-title]")).toContainText(monthLabel, { timeout: 8_000 });
  const dialog = page.getByRole("dialog", { name: "Calendar events" });
  await expect(dialog).toBeVisible({ timeout: 8_000 });
  await expect(dialog.getByText(title, { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/calendarEvent=/);

  const row = dialog.locator('[data-bixbo-calendar-event-row="true"]').filter({ hasText: title });
  await expect(row).toHaveAttribute("role", "button");
  await expect(row).toHaveAttribute("tabindex", "0");
});
