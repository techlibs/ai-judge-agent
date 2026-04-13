import { test, expect } from "@playwright/test";
import {
  EVALUATED_PROPOSAL_ID,
  PENDING_PROPOSAL_ID,
} from "../fixtures/seed-data";

test.describe("Grants List — Populated", () => {
  test("displays proposal cards when data exists", async ({ page }) => {
    await page.goto("/grants");
    const proposalLinks = page.locator("a[href^='/grants/prop-']");
    await expect(proposalLinks.first()).toBeVisible();

    const firstTitle = proposalLinks.first().locator("h2");
    await expect(firstTitle).toHaveText(/.+/);
  });

  test("shows score with green color for high scores", async ({ page }) => {
    await page.goto("/grants?pageSize=100");
    const card = page.locator(`a[href="/grants/${EVALUATED_PROPOSAL_ID}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByText("8.50")).toBeVisible();
    await expect(card.locator(".text-green-600")).toBeVisible();
  });

  test('shows "--" for pending proposals without scores', async ({ page }) => {
    // Pending proposals may be on page 2 due to chainTimestamp sort
    await page.goto("/grants?page=2");
    const card = page.locator(`a[href="/grants/${PENDING_PROPOSAL_ID}"]`);
    if (await card.isVisible()) {
      await expect(card.getByText("--")).toBeVisible();
    } else {
      // Try page 1
      await page.goto("/grants");
      const cardP1 = page.locator(`a[href="/grants/${PENDING_PROPOSAL_ID}"]`);
      await expect(cardP1).toBeVisible();
      await expect(cardP1.getByText("--")).toBeVisible();
    }
  });

  test("displays status badges for visible statuses", async ({ page }) => {
    // Page 1 shows 20 items sorted by chainTimestamp desc (indices 25 down to 6)
    // This includes: evaluated, funded, disputed — but pending (indices 1-5) is on page 2
    await page.goto("/grants");
    await expect(page.getByText("evaluated", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("funded", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("disputed", { exact: true }).first()).toBeVisible();

    // Pending is on page 2
    await page.goto("/grants?page=2");
    await expect(page.getByText("pending", { exact: true }).first()).toBeVisible();
  });

  test("search filters results", async ({ page }) => {
    await page.goto("/grants");
    const searchInput = page.getByPlaceholder("Search proposals...");
    await searchInput.fill("Solar");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/search=Solar/);
  });

  test("pagination shows page info", async ({ page }) => {
    await page.goto("/grants");
    await expect(page.getByText(/Page 1 of \d/)).toBeVisible();
  });

  test("clicking Next navigates to page 2", async ({ page }) => {
    await page.goto("/grants");
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test("displays category and budget", async ({ page }) => {
    await page.goto("/grants");
    await expect(page.getByText("infrastructure").first()).toBeVisible();
    await expect(page.getByText("50,000").first()).toBeVisible();
  });
});
