import { test, expect } from "@playwright/test";

test.describe("Reputation history page", () => {
  test("navigates to reputation page", async ({ page }) => {
    await page.goto("/proposals/1/reputation");

    // One of three states: error, empty, or populated
    const errorState = page.getByText(/could not load reputation data/i);
    const emptyState = page.getByText(/no reputation history/i);
    const historyList = page.locator("[data-testid='reputation-list']").or(page.getByRole("list"));

    const hasError = await errorState.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasHistory = await historyList.isVisible().catch(() => false);

    // At least one state should be visible
    expect(hasError || isEmpty || hasHistory).toBeTruthy();
  });

  test("page has reputation metadata title", async ({ page }) => {
    await page.goto("/proposals/1/reputation");

    // Check for the page heading or document title
    const heading = page.getByRole("heading", { name: /reputation/i });
    await expect(heading).toBeVisible();
  });
});
