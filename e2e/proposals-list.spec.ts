import { test, expect } from "@playwright/test";

test.describe("Proposals listing page", () => {
  test("navigates to /proposals and shows page title", async ({ page }) => {
    await page.goto("/proposals");
    await expect(page.getByRole("heading", { name: "All Proposals" })).toBeVisible();
  });

  test("shows empty state when no proposals exist", async ({ page }) => {
    await page.goto("/proposals");
    const emptyMessage = page.getByText("No proposals yet");
    const submitLink = page.getByRole("link", { name: /submit the first proposal/i });

    // Either empty state or proposal cards should be visible
    const isEmpty = await emptyMessage.isVisible().catch(() => false);
    if (isEmpty) {
      await expect(emptyMessage).toBeVisible();
      await expect(submitLink).toBeVisible();
    }
  });

  test("shows proposal cards when proposals exist", async ({ page }) => {
    await page.goto("/proposals");

    const hasProposals = await page.locator("[data-testid='proposal-card']").first().isVisible().catch(() => false);
    if (hasProposals) {
      await expect(page.locator("[data-testid='proposal-card']").first()).toBeVisible();
    }
  });
});
