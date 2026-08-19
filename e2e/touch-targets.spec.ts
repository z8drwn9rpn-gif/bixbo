import { expect, test } from "@playwright/test";

test("coarse-pointer primary icon and log controls keep a 44px touch target", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "Touch-target geometry is a mobile/coarse-pointer contract.");

  await page.goto("/");

  for (const control of [
    page.getByRole("button", { name: "Previous month" }),
    page.getByRole("button", { name: "Next month" }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator('button[data-log-category="meds"]').click();
  const saveBar = page.locator("[data-bixbo-log-save-bar]");
  await expect(saveBar).toBeVisible();

  for (const name of ["Back", "Save"]) {
    const box = await saveBar.getByRole("button", { name, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
});
