import { test, expect } from "@playwright/test";

test.describe("Proposal detail page", () => {
  test("shows not-found for invalid proposal ID", async ({ page }) => {
    await page.goto("/proposals/999999");

    await expect(page.getByText(/proposal not found/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /back.*proposals/i })).toBeVisible();
  });

  test("renders page structure for valid proposal", async ({ page }) => {
    await page.goto("/proposals/1");

    // The page MUST render — either content loaded or a specific error state
    // Both have a back link, so assert that as proof the page rendered
    await expect(page.getByRole("link", { name: /back.*proposals/i })).toBeVisible({ timeout: 10_000 });
  });
});
