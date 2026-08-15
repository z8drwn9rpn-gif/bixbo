import { expect, test } from "@playwright/test";

test("Notes keeps multiline native editing and autosaves the body", async ({ page }, testInfo) => {
  const now = Date.now();
  await page.addInitScript(({ now }) => {
    if (localStorage.getItem("bixbo:v2")) return;
    localStorage.setItem(
      "bixbo:v2",
      JSON.stringify({
        folders: [{ id: "general", name: "General", icon: "note" }],
        notebook: [
          {
            id: "note-e2e",
            folderId: "general",
            title: "Regression note",
            content: "First line",
            createdAt: now,
            updatedAt: now,
            pinned: false,
            archived: false,
            color: "default",
          },
        ],
      }),
    );
  }, { now });

  await page.goto("/notes");
  await page.getByRole("button", { name: /Regression note/ }).click();

  const bodyPreview = page.getByRole("button", { name: /First line/ });
  await expect(bodyPreview).toBeVisible();
  await bodyPreview.click();

  const editor = page.locator("textarea[data-bixbo-note-editor]");
  await expect(editor).toBeVisible();

  const editing = await editor.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      userSelect: style.userSelect,
      touchAction: style.touchAction,
    };
  });
  expect(editing.fontSize).toBeGreaterThanOrEqual(16);
  expect(editing.userSelect).not.toBe("none");
  expect(editing.touchAction).not.toBe("none");

  const nextBody = "First line\nSecond wrapped line\nThird line";
  await editor.fill(nextBody);
  await expect(editor).toHaveValue(nextBody);

  if (testInfo.project.name.includes("mobile")) {
    const touchAction = await editor.evaluate((node) => getComputedStyle(node).touchAction);
    expect(touchAction).not.toBe("none");
  }

  await expect.poll(
    async () => page.evaluate(() => {
      const raw = localStorage.getItem("bixbo:v2");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { notebook?: Array<{ id?: string; content?: string }> };
      return parsed.notebook?.find((note) => note.id === "note-e2e")?.content ?? null;
    }),
    { timeout: 5_000, message: "note body should be persisted after the autosave debounce" },
  ).toBe(nextBody);

  await page.reload();
  await page.getByRole("button", { name: /Regression note/ }).click();
  await expect(page.getByRole("button", { name: /Second wrapped line/ })).toBeVisible();
});
