import { test, expect } from "@playwright/test";

test.describe("Proposals listing page", () => {
  test("shows page title", async ({ page }) => {
    await page.goto("/proposals");
    await expect(page.getByRole("heading", { name: "All Proposals" })).toBeVisible();
  });

  test("renders either empty state or proposal cards", async ({ page }) => {
    await page.goto("/proposals");

    // One of these MUST be visible — no silent skipping
    const emptyMessage = page.getByText("No proposals yet");
    const proposalCard = page.locator("a[href^='/proposals/']").first();

    await expect(emptyMessage.or(proposalCard)).toBeVisible({ timeout: 15_000 });
  });

  test("has submit proposal link", async ({ page }) => {
    await page.goto("/proposals");

    await expect(
      page.getByRole("link", { name: /submit.*proposal/i }),
    ).toBeVisible();
  });
});
