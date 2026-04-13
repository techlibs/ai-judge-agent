import { test, expect } from "@playwright/test";

test.describe("Proposal Detail", () => {
  test("returns 404 for non-existent proposal", async ({ page }) => {
    const response = await page.goto("/grants/non-existent-id-12345");
    expect(response?.status()).toBe(404);
  });

  test("shows back to proposals link", async ({ page }) => {
    await page.goto("/grants");
    const proposalLinks = page.locator("a[href^='/grants/']");
    const count = await proposalLinks.count();

    if (count > 0) {
      await proposalLinks.first().click();
      await expect(
        page.getByRole("link", { name: /Back to proposals/ })
      ).toBeVisible();
    }
  });

  test("displays proposal metadata when found", async ({ page }) => {
    await page.goto("/grants");
    const proposalLinks = page.locator("a[href^='/grants/']");
    const count = await proposalLinks.count();

    if (count > 0) {
      await proposalLinks.first().click();
      // Should have a title heading
      await expect(page.locator("h1")).toBeVisible();
      // Should have description section
      await expect(
        page.getByRole("heading", { name: "Description" })
      ).toBeVisible();
      // Should have verification section
      await expect(
        page.getByRole("heading", { name: "Verification" })
      ).toBeVisible();
    }
  });
});
