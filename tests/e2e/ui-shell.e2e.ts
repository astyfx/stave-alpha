import { expect, test } from "@playwright/test";

const viewportMatrix = [
  { name: "mobile", width: 390, height: 844, taskListVisible: false },
  { name: "tablet", width: 768, height: 1024, taskListVisible: false },
  { name: "desktop", width: 1440, height: 900, taskListVisible: true },
] as const;

for (const viewport of viewportMatrix) {
  test(`shell smoke: ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByTestId("top-bar")).toBeVisible();
    await expect(page.getByTestId("workspace-bar")).toBeVisible();
    await expect(page.getByTestId("session-area")).toBeVisible();
    await expect(page.getByRole("button", { name: "Explorer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Terminal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editor" })).toBeVisible();
    await page.getByRole("button", { name: "Explorer" }).click();
    await expect(page.getByTestId("editor-panel")).toBeVisible();

    const taskList = page.getByTestId("task-list");
    if (viewport.taskListVisible) {
      await expect(taskList).toBeVisible();
    } else {
      await expect(taskList).toBeHidden();
    }

    const safeName = testInfo.title.replace(/[^a-z0-9-]/gi, "_").toLowerCase();
    await page.screenshot({
      path: `tests/artifacts/${safeName}.png`,
      fullPage: true,
    });
  });
}
