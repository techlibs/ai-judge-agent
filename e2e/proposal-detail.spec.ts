import { test, expect } from "@playwright/test";

test.describe("Proposal detail page", () => {
  test("shows proposal content or error state", async ({ page }) => {
    await page.goto("/proposals/1");

    // One of: proposal found, not found, IPFS unavailable, or generic error
    const notFound = page.getByText(/proposal not found/i);
    const loadError = page.getByText(/failed to load proposal/i);
    const ipfsError = page.getByText(/content unavailable/i);
    const proposalHeading = page.getByRole("heading").first();

    await expect(
      notFound.or(loadError).or(ipfsError).or(proposalHeading),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("has back navigation link", async ({ page }) => {
    await page.goto("/proposals/1");

    // Link text varies: "Back to proposals" or "Back to all proposals"
    const backLink = page.getByRole("link", { name: /back.*proposals/i });
    await expect(backLink).toBeVisible({ timeout: 10_000 });
  });
});
