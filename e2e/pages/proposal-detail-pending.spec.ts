import { test, expect } from "@playwright/test";
import { PENDING_PROPOSAL_ID } from "../fixtures/seed-data";

test.describe("Proposal Detail — Pending", () => {
  test("pending proposal shows title and metadata", async ({ page }) => {
    await page.goto(`/grants/${PENDING_PROPOSAL_ID}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toHaveText(/.+/);
  });

  test("no evaluation section for pending", async ({ page }) => {
    await page.goto(`/grants/${PENDING_PROPOSAL_ID}`);
    await expect(
      page.getByRole("heading", { name: "Evaluation Score" })
    ).not.toBeVisible();
  });

  test("no dimension scores for pending", async ({ page }) => {
    await page.goto(`/grants/${PENDING_PROPOSAL_ID}`);
    const details = page.locator("details summary");
    await expect(details).toHaveCount(0);
  });

  test("no fund release for pending", async ({ page }) => {
    await page.goto(`/grants/${PENDING_PROPOSAL_ID}`);
    await expect(
      page.getByRole("heading", { name: "Fund Release" })
    ).not.toBeVisible();
  });

  test("no disputes for pending", async ({ page }) => {
    await page.goto(`/grants/${PENDING_PROPOSAL_ID}`);
    await expect(
      page.getByRole("heading", { name: "Disputes" })
    ).not.toBeVisible();
  });
});
