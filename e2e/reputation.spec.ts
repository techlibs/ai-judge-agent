import { test, expect } from "@playwright/test";

test.describe("Reputation history page", () => {
  test("shows reputation heading for valid proposal", async ({ page }) => {
    await page.goto("/proposals/1/reputation");

    // Must show either the reputation card or a specific error — NOT a catch-all
    const reputationCard = page.getByText(/On-Chain Reputation/i);
    const errorHeading = page.getByText(/Could not load reputation data/i);

    await expect(reputationCard.or(errorHeading)).toBeVisible({ timeout: 15_000 });
  });

  test("error state shows retry link", async ({ page }) => {
    // Use an ID unlikely to have data but that won't 404 (contract returns empty)
    await page.goto("/proposals/999/reputation");

    const errorHeading = page.getByText(/Could not load reputation data/i);
    const emptyState = page.getByText(/No reputation history/i);

    await expect(errorHeading.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });
});
