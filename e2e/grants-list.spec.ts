import { test, expect } from "@playwright/test";

test.describe("Grants Listing", () => {
  test("renders empty state when no proposals exist", async ({ page }) => {
    await page.goto("/grants");
    // Either proposals are listed or we see the empty state
    const emptyState = page.getByText("No proposals found");
    const proposalCards = page.locator("a[href^='/grants/']");

    const hasProposals = await proposalCards.count();
    if (hasProposals === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(proposalCards.first()).toBeVisible();
    }
  });

  test("proposal cards link to detail pages", async ({ page }) => {
    await page.goto("/grants");
    const proposalLinks = page.locator("a[href^='/grants/']");
    const count = await proposalLinks.count();

    if (count > 0) {
      const href = await proposalLinks.first().getAttribute("href");
      expect(href).toMatch(/^\/grants\/[\w-]+$/);
    }
  });

  test("search form is functional", async ({ page }) => {
    await page.goto("/grants");
    const searchInput = page.getByPlaceholder("Search proposals...");
    await searchInput.fill("solar");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/search=solar/);
  });
});
